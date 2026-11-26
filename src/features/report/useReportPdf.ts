import { useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { getReadingsForReport, ReadingsQueryError, type ReadingsQueryFailure } from '@/features/readings/readings.repo';
import { logError } from '@/lib/logger';
import type { ReportPeriodError } from '@/lib/report/report-period';

import { reportPdfPlatform } from './report-pdf-platform';
import type { ReportPeriodRequest } from './report-pdf-platform.types';

export interface UseReportPdfResult {
  /** false no Android nesta etapa: o botão não deve aparecer. */
  isAvailable: boolean;
  /** true quando o PDF foi entregue ao navegador. Nunca grava no Firestore. */
  generateReport: (request: ReportPeriodRequest) => Promise<boolean>;
  /** Descarta a geração em andamento (o resultado tardio é ignorado) e limpa o erro. */
  cancel: () => void;
  isGenerating: boolean;
  /** Sempre mensagem amigável em pt-BR, nunca `error.message` cru (CLAUDE.md §4.3). */
  error: string | null;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const UNAVAILABLE_MESSAGE = 'O relatório em PDF ainda não está disponível neste aparelho.';
const EMPTY_MESSAGE = 'Nenhuma medição no período selecionado.';
const EMPTY_UNCONFIRMED_MESSAGE =
  'Nenhuma medição encontrada no período, mas não foi possível confirmar o histórico completo. Verifique sua conexão e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível gerar o relatório. Tente novamente.';
const DOWNLOAD_MESSAGE = 'Não foi possível baixar o relatório. Tente novamente.';

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

/** Fuso IANA do aparelho, lido UMA vez no início da operação e fixado até o fim. */
function resolveDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // Sem Intl utilizável, UTC é explícito e o documento declara o fuso usado.
    return 'UTC';
  }
}

interface ReportPdfState {
  /** Conta dona deste estado: erro/progresso de outra conta nunca aparecem. */
  owner: string | null;
  activeToken: number | null;
  error: string | null;
}

/**
 * Orquestra o relatório PDF: período → leitura única → modelo → renderização → download.
 *
 * Cada geração tem um token. Trocar de conta ou cancelar invalida o token e todo resultado tardio
 * é descartado — inclusive o download (spec §3.5.6, PDF-18). Uma geração por vez (PDF-14). O
 * fluxo só LÊ: nenhuma chamada de escrita do repositório é alcançável daqui.
 */
export function useReportPdf(): UseReportPdfResult {
  const { user } = useSession();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<ReportPdfState>({ owner: null, activeToken: null, error: null });

  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const uidRef = useRef(uid);

  useEffect(() => {
    // Sincroniza com a sessão (sistema externo): conta nova invalida a geração da anterior.
    uidRef.current = uid;
    generationRef.current += 1;
    inFlightRef.current = false;
  }, [uid]);

  async function generateReport(request: ReportPeriodRequest): Promise<boolean> {
    if (uid === null) {
      setState({ owner: null, activeToken: null, error: NOT_SIGNED_IN_MESSAGE });
      return false;
    }

    if (!reportPdfPlatform.isAvailable) {
      setState({ owner: uid, activeToken: null, error: UNAVAILABLE_MESSAGE });
      return false;
    }

    if (inFlightRef.current) {
      return false;
    }

    inFlightRef.current = true;
    generationRef.current += 1;
    const token = generationRef.current;
    const isCurrent = () => generationRef.current === token && uidRef.current === uid;
    // Fuso e instante congelados aqui valem para consulta, agrupamento e apresentação.
    const timeZone = resolveDeviceTimeZone();
    const preparedAt = new Date();
    let error: string | null = null;

    setState({ owner: uid, activeToken: token, error: null });

    try {
      const pipeline = await reportPdfPlatform.loadPipeline();

      if (!isCurrent()) {
        return false;
      }

      const periodResult = pipeline.resolvePeriod(request, preparedAt, timeZone);

      if (!periodResult.ok) {
        error = PERIOD_MESSAGES[periodResult.error];
        return false;
      }

      const { startInclusive, endExclusive } = periodResult.period;
      const snapshot = await getReadingsForReport(uid, { startInclusive, endExclusive });

      if (!isCurrent()) {
        return false;
      }

      const built = pipeline.buildModel(snapshot, periodResult.period);

      if (!built.ok) {
        error = built.fromCache || built.omittedCount > 0 ? EMPTY_UNCONFIRMED_MESSAGE : EMPTY_MESSAGE;
        return false;
      }

      const pdf = await pipeline.render(built.model);

      if (!isCurrent()) {
        return false;
      }

      try {
        reportPdfPlatform.deliver(built.model.fileName, pdf);
      } catch {
        logError('report.deliver', new Error('report-deliver-failed'), { uid });
        error = DOWNLOAD_MESSAGE;
        return false;
      }

      return true;
    } catch (caught) {
      if (caught instanceof ReadingsQueryError) {
        // O repositório já registrou a falha (sem conteúdo); aqui só a mensagem amigável.
        error = QUERY_MESSAGES[caught.reason];
      } else {
        // Exceção do renderizador pode conter valores e observações: NUNCA é repassada ao logger.
        logError('report.generate', new Error('report-generate-failed'), { uid });
        error = GENERIC_MESSAGE;
      }

      return false;
    } finally {
      if (generationRef.current === token) {
        inFlightRef.current = false;
        setState({ owner: uid, activeToken: null, error });
      }
    }
  }

  function cancel(): void {
    generationRef.current += 1;
    inFlightRef.current = false;
    setState((previous) => ({ ...previous, activeToken: null, error: null }));
  }

  // Estado de outra conta (ou de antes do login) não vaza para a sessão atual.
  const isOwnState = state.owner === uid;

  return {
    isAvailable: reportPdfPlatform.isAvailable,
    generateReport,
    cancel,
    isGenerating: isOwnState && state.activeToken !== null,
    error: isOwnState ? state.error : null,
  };
}
