import * as Sharing from 'expo-sharing';

import { removeReportFile, scheduleReportFileRemoval, SHARE_GRACE_MS } from './report-pdf-files';
import {
  isPrintedReportPdf,
  type PdfPreviewHandle,
  type PrintedReportPdf,
  type ReportPdfArtifact,
  type ReportPdfPlatform,
} from './report-pdf-platform.types';

/**
 * Adaptador Android (spec-relatorio-pdf §3.5.3–3.5.4, §7.1): `expo-print` gera o PDF no cache
 * privado e o `expo-sharing` o entrega pela folha de compartilhamento do sistema, com
 * `application/pdf` e permissão de leitura temporária concedida pelo FileProvider. Sem
 * pré-visualização embutida: o usuário confere o PDF no app que escolher.
 *
 * O pipeline (e com ele o `expo-print` e o template) entra por `import()`, só ao pedir o
 * relatório. jsPDF/AutoTable nunca são referenciados aqui.
 */

const SHARE_DIALOG_TITLE = 'Salvar ou compartilhar o relatório em PDF';

/** Arquivos que já foram à folha de compartilhamento: a limpeza respeita a carência. */
const sharedUris = new Set<string>();

function asPrintedFile(pdf: ReportPdfArtifact): PrintedReportPdf {
  if (!isPrintedReportPdf(pdf)) {
    throw new Error('report-pdf-artifact-mismatch');
  }

  return pdf;
}

/**
 * Abre a folha de compartilhamento. A chamada nativa sai na mesma volta do event loop do toque em
 * "Salvar ou compartilhar" — não há espera em que uma troca de conta pudesse entrar. A Promise
 * termina quando a folha fecha: isso NÃO distingue envio de cancelamento nem prova que o destino
 * terminou de ler.
 */
export function sharePrintedPdf(fileName: string, pdf: ReportPdfArtifact): Promise<void> {
  const file = asPrintedFile(pdf);

  if (!file.uri.endsWith(`/${fileName}`)) {
    throw new Error('report-pdf-name-mismatch');
  }

  sharedUris.add(file.uri);

  return Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: SHARE_DIALOG_TITLE,
  }).catch(() => {
    // Não chegou a ser entregue: a limpeza não precisa de carência. A exceção nativa cita o
    // caminho do arquivo e é substituída por um código fixo.
    sharedUris.delete(file.uri);
    throw new Error('report-share-failed');
  });
}

/**
 * "Prévia" sem visualização: só o ciclo de vida do arquivo. `release` é idempotente — apaga na
 * hora o que nunca foi compartilhado e, depois do compartilhamento, só após a carência.
 */
export function holdPrintedPdf(pdf: ReportPdfArtifact): PdfPreviewHandle {
  const { uri } = asPrintedFile(pdf);
  let isReleased = false;

  return {
    url: '',
    release: () => {
      if (isReleased) {
        return;
      }

      isReleased = true;

      if (sharedUris.delete(uri)) {
        scheduleReportFileRemoval(uri, SHARE_GRACE_MS);
      } else {
        void removeReportFile(uri);
      }
    },
  };
}

/** Resultado sem dono (cancelado, prazo, troca de conta): nunca foi entregue, sai na hora. */
export function discardPrintedPdf(pdf: ReportPdfArtifact): void {
  if (isPrintedReportPdf(pdf)) {
    void removeReportFile(pdf.uri);
  }
}

export const reportPdfPlatform: ReportPdfPlatform = {
  isAvailable: true,
  deliveryMode: 'share',
  loadPipeline: async () => (await import('./report-print-pipeline')).reportPrintPipeline,
  deliver: sharePrintedPdf,
  openPreview: holdPrintedPdf,
  discard: discardPrintedPdf,
};
