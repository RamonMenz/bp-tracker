import * as Print from 'expo-print';

import { buildReportModel } from '@/lib/report/report-model';
import { civilDateOf, resolveReportPeriod } from '@/lib/report/report-period';

import { adoptPrintedFile, sweepReportResidues } from './report-pdf-files';
import type { ReportPdfPipeline } from './report-pdf-platform.types';
import { A4_HEIGHT_PT, A4_WIDTH_PT, buildReportHtml } from './report-html';

/**
 * Pipeline Android do relatório (spec-relatorio-pdf §7.1): mesmo período e mesmo modelo da Web,
 * renderizados pelo `expo-print` a partir do template HTML. Carregado por `import()` no adaptador
 * nativo só quando o usuário pede o PDF (PDF-01). Nunca importa jsPDF/AutoTable.
 *
 * A conversão pedido → período repete a do pipeline Web (`report-pdf-pipeline.ts`), que não é
 * importado aqui para não arrastar o renderizador jsPDF ao bundle Android; um teste confere que os
 * dois resolvem o mesmo período.
 */
export const reportPrintPipeline: ReportPdfPipeline = {
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
    // Resíduos de gerações interrompidas saem antes de criar o próximo arquivo; falha na
    // varredura é registrada lá dentro e não impede o relatório.
    await sweepReportResidues();

    let printedUri: string;

    try {
      // A4 em pontos; `textZoom` fixo para o documento não mudar com a escala de fonte do sistema
      // (a interface do app continua respeitando a escala). A exceção do SDK pode citar caminho
      // ou conteúdo: não é repassada.
      const result = await Print.printToFileAsync({
        html: buildReportHtml(model),
        width: A4_WIDTH_PT,
        height: A4_HEIGHT_PT,
        textZoom: 100,
        base64: false,
      });
      printedUri = result.uri;
    } catch {
      throw new Error('report-print-failed');
    }

    return { kind: 'printed-file', uri: await adoptPrintedFile(printedUri, model.fileName) };
  },
};
