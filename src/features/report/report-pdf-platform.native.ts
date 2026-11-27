import type { ReportPdfPlatform } from './report-pdf-platform.types';

/**
 * Android: fora desta etapa (P1 é só Web). A decisão da spec §7.1 é `expo-print`, ainda não
 * instalado nem validado — até lá o botão não aparece e nada de jsPDF entra no bundle nativo.
 */
const UNAVAILABLE = 'report-pdf-unavailable';

export const reportPdfPlatform: ReportPdfPlatform = {
  isAvailable: false,
  deliveryMode: 'share',
  loadPipeline: () => Promise.reject(new Error(UNAVAILABLE)),
  deliver: () => {
    throw new Error(UNAVAILABLE);
  },
  openPreview: () => {
    throw new Error(UNAVAILABLE);
  },
};
