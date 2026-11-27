export interface PdfPreviewFrameProps {
  url: string;
  title: string;
}

/**
 * Nativo: sem pré-visualização embutida. No Android o relatório sai pela folha de compartilhamento
 * (`deliveryMode: 'share'`) e o `ReportReviewPanel` nem monta este componente; fica como reserva
 * inerte do par `.web.tsx`.
 */
export function PdfPreviewFrame(_props: PdfPreviewFrameProps) {
  return null;
}
