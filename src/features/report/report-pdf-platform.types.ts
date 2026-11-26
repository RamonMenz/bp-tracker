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

/** Etapas carregadas sob demanda: período, modelo e renderização. */
export interface ReportPdfPipeline {
  resolvePeriod: (request: ReportPeriodRequest, preparedAt: Date, timeZone: string) => ReportPeriodResult;
  buildModel: (snapshot: ReportSourceSnapshot, period: ReportPeriod) => BuildReportResult;
  render: (model: ReportModel) => Promise<Blob>;
}

/**
 * Contrato comum dos adaptadores `report-pdf-platform.web.ts` / `.native.ts` (CLAUDE.md §3.3:
 * diferença de plataforma por extensão de arquivo, não por `Platform.OS`).
 */
export interface ReportPdfPlatform {
  isAvailable: boolean;
  loadPipeline: () => Promise<ReportPdfPipeline>;
  /** Entrega o arquivo ao usuário. Só é chamada depois da ação explícita dele. */
  deliver: (fileName: string, pdf: Blob) => void;
}
