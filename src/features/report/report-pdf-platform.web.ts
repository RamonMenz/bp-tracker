import type { ReportPdfPlatform } from './report-pdf-platform.types';

/**
 * Tempo até liberar a URL de objeto. O `click()` só AGENDA o download: revogar na mesma volta do
 * event loop pode cancelá-lo em alguns navegadores (spec-relatorio-pdf §3.5.2). Não há evento de
 * "download concluído" — o atraso é a margem para o navegador consumir o Blob.
 */
export const OBJECT_URL_REVOKE_DELAY_MS = 60_000;

/** Baixa o PDF por Blob + URL de objeto, sem enviar nada a servidor. */
export function downloadPdf(fileName: string, pdf: Blob): void {
  const url = URL.createObjectURL(pdf);

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

export const reportPdfPlatform: ReportPdfPlatform = {
  isAvailable: true,
  loadPipeline: async () => (await import('./report-pdf-pipeline')).reportPdfPipeline,
  deliver: downloadPdf,
};
