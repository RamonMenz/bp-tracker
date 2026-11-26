import { buildReportModel } from '@/lib/report/report-model';
import { civilDateOf, resolveReportPeriod } from '@/lib/report/report-period';

import { loadPdfLibraries, renderReportPdf } from './render-report-pdf';
import type { ReportPdfPipeline } from './report-pdf-platform.types';

/**
 * Pipeline Web do relatório, carregado por `import()` só quando o usuário pede o PDF: junto vêm o
 * modelo (e o luxon que ele usa) e, num segundo `import()`, jsPDF/AutoTable. Nada disso pesa na
 * abertura do Histórico (PDF-01).
 */
export const reportPdfPipeline: ReportPdfPipeline = {
  resolvePeriod(request, preparedAt, timeZone) {
    if (request.kind !== 'custom') {
      return resolveReportPeriod(request, preparedAt, timeZone);
    }

    return resolveReportPeriod(
      { kind: 'custom', startDay: civilDateOf(request.start, timeZone), endDay: civilDateOf(request.end, timeZone) },
      preparedAt,
      timeZone,
    );
  },

  buildModel: buildReportModel,

  async render(model) {
    const { bytes } = renderReportPdf(model, await loadPdfLibraries());
    return new Blob([bytes], { type: 'application/pdf' });
  },
};
