import { useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { getReadingsForReport, ReadingsQueryError, type ReadingsQueryFailure } from '@/features/readings/readings.repo';
import { logError } from '@/lib/logger';
import type { ReportAverageLine } from '@/lib/report/report-model';
import type { ReportPeriodError } from '@/lib/report/report-period';

import { reportPdfPlatform } from './report-pdf-platform';
import type { PdfPreviewHandle, ReportPeriodRequest } from './report-pdf-platform.types';

/** Resumo exibido ANTES de salvar (spec §3.4.1), com o mesmo retrato do PDF pré-visualizado. */
export interface ReportReview {
  fileName: string;
  previewUrl: string;
  requestedPeriod: string;
  coverageLines: string[];
  averages: ReportAverageLine[];
  /** false com cache, omissão de documentos ou escrita pendente: o resumo avisa antes de exportar. */
  isCoverageConfirmed: boolean;
  coverageStatement: string;
  warnings: string[];
}

export type ReportStage = 'idle' | 'preparing' | 'review';

export interface UseReportPdfResult {
  /** false no Android nesta etapa: o botão não deve aparecer. */
  isAvailable: boolean;
  stage: ReportStage;
  review: ReportReview | null;
  /** Sempre mensagem amigável em pt-BR, nunca `error.message` cru (CLAUDE.md §4.3). */
  error: string | null;
  /** Lê, monta e renderiza; termina na revisão com pré-visualização. Não entrega nada. */
  prepareReport: (request: ReportPeriodRequest) => Promise<boolean>;
  /** Refaz a preparação com o último período (nova leitura, novo retrato). */
  retry: () => Promise<boolean>;
  /** Entrega o PDF revisado ao navegador — única ação que gera arquivo. */
  saveReport: () => boolean;
  /** Descarta a revisão e volta à escolha do período, mantendo a escolha anterior no diálogo. */
  changePeriod: () => void;
  /** Descarta qualquer preparação ou revisão; resultados tardios são ignorados. */
  cancel: () => void;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const UNAVAILABLE_MESSAGE = 'O relatório em PDF ainda não está disponível neste aparelho.';
const EMPTY_MESSAGE = 'Nenhuma medição no período selecionado.';
const EMPTY_UNCONFIRMED_MESSAGE =
  'Nenhuma medição encontrada no período, mas não foi possível confirmar o histórico completo. Verifique sua conexão e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível gerar o relatório. Tente novamente.';
const DOWNLOAD_MESSAGE = 'Não foi possível baixar o relatório. Tente novamente.';
const TIMEOUT_MESSAGE =
  'A preparação do relatório demorou demais. Verifique sua conexão ou escolha um período menor e tente novamente.';

/**
 * Prazo das etapas ASSÍNCRONAS da preparação (carregar o módulo do PDF e ler o Firestore). A
 * renderização em si é síncrona na thread principal e não pode ser interrompida: quem a limita é
 * `MAX_REPORT_READINGS` (ver docs/pdf-relatorio.md).
 */
export const REPORT_PREPARATION_TIMEOUT_MS = 30_000;

const PERIOD_MESSAGES: Record<ReportPeriodError, string> = {
  'end-before-start': 'A data de fim deve ser igual ou posterior à de início.',
  'future-day': 'O período não pode incluir dias futuros.',
  'invalid-date': 'Escolha datas válidas para o período.',
  'invalid-time-zone': GENERIC_MESSAGE,
};

const QUERY_MESSAGES: Record<ReadingsQueryFailure, string> = {
  permission: 'Sem permissão para ler seu histórico. Faça login novamente.',
  network: 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
  generic: 'Não foi possível carregar suas medições. Tente novamente.',
};

const integerFormatter = new Intl.NumberFormat('pt-BR');

function tooManyMessage(readingCount: number, limit: number): string {
  return `O período tem ${integerFormatter.format(readingCount)} medições e o relatório comporta até ${integerFormatter.format(limit)}. Escolha um período menor.`;
}

/** Fuso IANA do aparelho, lido UMA vez no início da operação e fixado até o fim. */
function resolveDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // Sem Intl utilizável, UTC é explícito e o documento declara o fuso usado.
    return 'UTC';
  }
}

class PreparationTimeoutError extends Error {
  constructor() {
    super('report-preparation-timeout');
    this.name = 'PreparationTimeoutError';
  }
}

function withDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PreparationTimeoutError()), Math.max(0, deadline - Date.now()));
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

interface ReportPdfState {
  /** Conta dona deste estado: erro/progresso/revisão de outra conta nunca aparecem. */
  owner: string | null;
  stage: ReportStage;
  error: string | null;
  review: ReportReview | null;
}

const IDLE: Omit<ReportPdfState, 'owner'> = { stage: 'idle', error: null, review: null };

/**
 * Orquestra o relatório PDF: período → leitura única → modelo → renderização → revisão com
 * pré-visualização → salvar por ação explícita.
 *
 * Cada preparação tem um token. Trocar de conta, cancelar, alterar o período ou estourar o prazo
 * invalidam o token, e todo resultado tardio é descartado (spec §3.5.6, PDF-18). Uma preparação por
 * vez (PDF-14). A URL de pré-visualização é liberada ao sair da revisão, trocar de conta ou
 * desmontar. O fluxo só LÊ: nenhuma escrita do repositório é alcançável daqui.
 */
export function useReportPdf(): UseReportPdfResult {
  const { user } = useSession();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<ReportPdfState>({ owner: null, ...IDLE });

  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const uidRef = useRef(uid);
  const lastRequestRef = useRef<ReportPeriodRequest | null>(null);
  const pdfRef = useRef<Blob | null>(null);
  const previewRef = useRef<PdfPreviewHandle | null>(null);

  function releasePreview(): void {
    previewRef.current?.release();
    previewRef.current = null;
    pdfRef.current = null;
  }

  useEffect(() => {
    // Sincroniza com a sessão (sistema externo): conta nova invalida a preparação e a prévia da
    // anterior; a desmontagem também libera a URL de objeto.
    uidRef.current = uid;
    generationRef.current += 1;
    inFlightRef.current = false;

    return () => {
      previewRef.current?.release();
      previewRef.current = null;
      pdfRef.current = null;
    };
  }, [uid]);

  async function prepareReport(request: ReportPeriodRequest): Promise<boolean> {
    if (uid === null) {
      setState({ owner: null, ...IDLE, error: NOT_SIGNED_IN_MESSAGE });
      return false;
    }

    if (!reportPdfPlatform.isAvailable) {
      setState({ owner: uid, ...IDLE, error: UNAVAILABLE_MESSAGE });
      return false;
    }

    if (inFlightRef.current) {
      return false;
    }

    releasePreview();
    inFlightRef.current = true;
    lastRequestRef.current = request;
    generationRef.current += 1;
    const token = generationRef.current;
    const isCurrent = () => generationRef.current === token && uidRef.current === uid;
    // Fuso e instante congelados aqui valem para consulta, agrupamento e apresentação.
    const timeZone = resolveDeviceTimeZone();
    const preparedAt = new Date();
    const deadline = Date.now() + REPORT_PREPARATION_TIMEOUT_MS;
    let next: Omit<ReportPdfState, 'owner'> = { ...IDLE };

    setState({ owner: uid, stage: 'preparing', error: null, review: null });

    try {
      const pipeline = await withDeadline(reportPdfPlatform.loadPipeline(), deadline);

      if (!isCurrent()) {
        return false;
      }

      const periodResult = pipeline.resolvePeriod(request, preparedAt, timeZone);

      if (!periodResult.ok) {
        next = { ...IDLE, error: PERIOD_MESSAGES[periodResult.error] };
        return false;
      }

      const { startInclusive, endExclusive } = periodResult.period;
      const snapshot = await withDeadline(getReadingsForReport(uid, { startInclusive, endExclusive }), deadline);

      if (!isCurrent()) {
        return false;
      }

      const built = pipeline.buildModel(snapshot, periodResult.period);

      if (!built.ok) {
        const error =
          built.reason === 'too-many'
            ? tooManyMessage(built.readingCount, built.limit)
            : built.fromCache || built.omittedCount > 0
              ? EMPTY_UNCONFIRMED_MESSAGE
              : EMPTY_MESSAGE;
        next = { ...IDLE, error };
        return false;
      }

      const pdf = await pipeline.render(built.model);

      if (!isCurrent()) {
        return false;
      }

      const preview = reportPdfPlatform.openPreview(pdf);
      pdfRef.current = pdf;
      previewRef.current = preview;

      const { model } = built;
      next = {
        stage: 'review',
        error: null,
        review: {
          fileName: model.fileName,
          previewUrl: preview.url,
          requestedPeriod: model.header.requestedPeriod,
          coverageLines: model.coverage.lines,
          averages: model.averages,
          isCoverageConfirmed: model.coverage.isConfirmed && model.warnings.length === 0,
          coverageStatement: model.coverage.statement,
          warnings: model.warnings,
        },
      };
      return true;
    } catch (caught) {
      if (caught instanceof PreparationTimeoutError) {
        // A etapa que estourou o prazo fica sem ninguém esperando por ela: o resultado tardio é
        // descartado e uma nova preparação pode começar.
        logError('report.timeout', new Error('report-preparation-timeout'), { uid });
        next = { ...IDLE, error: TIMEOUT_MESSAGE };
      } else if (caught instanceof ReadingsQueryError) {
        // O repositório já registrou a falha (sem conteúdo); aqui só a mensagem amigável.
        next = { ...IDLE, error: QUERY_MESSAGES[caught.reason] };
      } else {
        // Exceção do renderizador pode conter valores e observações: NUNCA é repassada ao logger.
        logError('report.generate', new Error('report-generate-failed'), { uid });
        next = { ...IDLE, error: GENERIC_MESSAGE };
      }

      return false;
    } finally {
      if (generationRef.current === token) {
        inFlightRef.current = false;
        setState({ owner: uid, ...next });
      }
    }
  }

  async function retry(): Promise<boolean> {
    const request = lastRequestRef.current;
    return request === null ? false : prepareReport(request);
  }

  function saveReport(): boolean {
    const pdf = pdfRef.current;
    const review = state.owner === uid ? state.review : null;

    if (pdf === null || review === null || uid === null) {
      return false;
    }

    try {
      reportPdfPlatform.deliver(review.fileName, pdf);
    } catch {
      logError('report.deliver', new Error('report-deliver-failed'), { uid });
      setState((previous) => ({ ...previous, error: DOWNLOAD_MESSAGE }));
      return false;
    }

    releasePreview();
    setState({ owner: uid, ...IDLE });
    return true;
  }

  function reset(): void {
    generationRef.current += 1;
    inFlightRef.current = false;
    releasePreview();
    setState((previous) => ({ ...previous, ...IDLE }));
  }

  // Estado de outra conta (ou de antes do login) não vaza para a sessão atual.
  const isOwnState = state.owner === uid;

  return {
    isAvailable: reportPdfPlatform.isAvailable,
    stage: isOwnState ? state.stage : 'idle',
    review: isOwnState ? state.review : null,
    error: isOwnState ? state.error : null,
    prepareReport,
    retry,
    saveReport,
    changePeriod: reset,
    cancel: reset,
  };
}
