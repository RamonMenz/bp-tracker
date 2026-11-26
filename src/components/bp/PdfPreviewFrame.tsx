export interface PdfPreviewFrameProps {
  url: string;
  title: string;
}

/**
 * Nativo: sem pré-visualização nesta etapa (o relatório PDF só existe na Web; o Android usará
 * `expo-print`, ainda não implementado). Nunca é exibido porque o botão não aparece no nativo.
 */
export function PdfPreviewFrame(_props: PdfPreviewFrameProps) {
  return null;
}
