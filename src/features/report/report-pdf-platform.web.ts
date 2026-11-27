import { isPrintedReportPdf, type PdfPreviewHandle, type ReportPdfArtifact, type ReportPdfPlatform } from './report-pdf-platform.types';

/**
 * Tempo até liberar a URL de objeto. O `click()` só AGENDA o download: revogar na mesma volta do
 * event loop pode cancelá-lo em alguns navegadores (spec-relatorio-pdf §3.5.2). Não há evento de
 * "download concluído" — o atraso é a margem para o navegador consumir o Blob.
 */
export const OBJECT_URL_REVOKE_DELAY_MS = 60_000;

/** O pipeline Web só produz `Blob`; um arquivo do Android aqui é erro de programação. */
function asBlob(pdf: ReportPdfArtifact): Blob {
  if (isPrintedReportPdf(pdf)) {
    throw new Error('report-pdf-artifact-mismatch');
  }

  return pdf;
}

/** Baixa o PDF por Blob + URL de objeto, sem enviar nada a servidor. */
export function downloadPdf(fileName: string, pdf: ReportPdfArtifact): void {
  const url = URL.createObjectURL(asBlob(pdf));

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
  }
}

/**
 * URL de objeto para o `<iframe>` de pré-visualização (e para abrir numa aba). `release` é
 * idempotente e só AGENDA a revogação: uma aba aberta a partir da prévia ainda pode estar
 * carregando o documento quando o diálogo fecha.
 */
export function openPdfPreview(pdf: ReportPdfArtifact): PdfPreviewHandle {
  const url = URL.createObjectURL(asBlob(pdf));
  let isReleased = false;

  return {
    url,
    release: () => {
      if (isReleased) {
        return;
      }

      isReleased = true;
      setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
    },
  };
}

export const reportPdfPlatform: ReportPdfPlatform = {
  isAvailable: true,
  deliveryMode: 'download',
  loadPipeline: async () => (await import('./report-pdf-pipeline')).reportPdfPipeline,
  deliver: downloadPdf,
  openPreview: openPdfPreview,
};
