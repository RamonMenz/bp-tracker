import type { BuildReportResult, ReportModel, ReportSourceSnapshot } from '@/lib/report/report-model';
import type { ReportPeriod, ReportPeriodResult } from '@/lib/report/report-period';

/**
 * Pedido de período como sai do diálogo: no personalizado, as datas dos seletores (meia-noite
 * local). A conversão para dias civis acontece no pipeline, já com o fuso fixado da operação.
 */
export type ReportPeriodRequest =
  | { kind: 'last7' }
  | { kind: 'last30' }
  | { kind: 'all' }
  | { kind: 'custom'; start: Date; end: Date };

/**
 * PDF gerado no Android pelo `expo-print`: arquivo no cache privado do app, nunca em
 * `documentDirectory`. O `uri` é interno — só o adaptador nativo o lê, compartilha ou apaga.
 */
export interface PrintedReportPdf {
  kind: 'printed-file';
  uri: string;
}

/**
 * Resultado da renderização, opaco para o hook: na Web, os bytes em memória (`Blob`); no Android,
 * o arquivo temporário. Quem cria é o pipeline da plataforma; quem consome é o mesmo adaptador.
 */
export type ReportPdfArtifact = Blob | PrintedReportPdf;

export function isPrintedReportPdf(artifact: ReportPdfArtifact): artifact is PrintedReportPdf {
  return 'kind' in artifact && artifact.kind === 'printed-file';
}

/** Etapas carregadas sob demanda: período, modelo e renderização. */
export interface ReportPdfPipeline {
  resolvePeriod: (request: ReportPeriodRequest, preparedAt: Date, timeZone: string) => ReportPeriodResult;
  buildModel: (snapshot: ReportSourceSnapshot, period: ReportPeriod) => BuildReportResult;
  render: (model: ReportModel) => Promise<ReportPdfArtifact>;
}

/** URL local de pré-visualização. `release` agenda a liberação; nunca revoga de forma síncrona. */
export interface PdfPreviewHandle {
  url: string;
  release: () => void;
}

/**
 * Contrato comum dos adaptadores `report-pdf-platform.web.ts` / `.native.ts` (CLAUDE.md §3.3:
 * diferença de plataforma por extensão de arquivo, não por `Platform.OS`).
 */
export interface ReportPdfPlatform {
  isAvailable: boolean;
  /**
   * `download`: Web, com pré-visualização embutida e download local. `share`: Android, sem
   * pré-visualização embutida; o PDF sai pela folha de compartilhamento do sistema.
   */
  deliveryMode: 'download' | 'share';
  loadPipeline: () => Promise<ReportPdfPipeline>;
  /**
   * Entrega o arquivo ao usuário. Só é chamada depois da ação explícita dele. Síncrona na Web; no
   * Android devolve uma Promise que termina quando a folha de compartilhamento fecha — o que NÃO
   * prova envio nem que o app de destino terminou de ler o arquivo.
   */
  deliver: (fileName: string, pdf: ReportPdfArtifact) => void | Promise<void>;
  /**
   * Prévia local (sem upload, sem impressão). No Android não há prévia embutida: a `url` é vazia e
   * `release` é a limpeza do arquivo temporário.
   */
  openPreview: (pdf: ReportPdfArtifact) => PdfPreviewHandle;
  /**
   * Descarta um resultado que ninguém vai usar (cancelado, conta trocada, prazo estourado). Só a
   * plataforma que guarda o PDF fora da memória (Android) precisa implementar.
   */
  discard?: (pdf: ReportPdfArtifact) => void;
}
