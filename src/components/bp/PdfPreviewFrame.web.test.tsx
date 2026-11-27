import { render, screen } from '@testing-library/react-native';

import { PdfPreviewFrame } from './PdfPreviewFrame.web';

/**
 * O componente Web é importado pelo sufixo explícito: no Jest (preset nativo) `./PdfPreviewFrame`
 * resolveria para a versão nativa, que não renderiza nada.
 */
// Node 20 (o do CI) não tem `navigator` global; o 22 tem. O teste instala o próprio e restaura o
// descritor original, para não depender da versão do Node nem vazar para outras suítes.
const ORIGINAL_NAVIGATOR = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setNavigator(value: { pdfViewerEnabled?: boolean } | undefined): void {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
}

function setPdfViewer(enabled: boolean | undefined): void {
  setNavigator({ pdfViewerEnabled: enabled });
}

afterEach(() => {
  if (ORIGINAL_NAVIGATOR === undefined) {
    delete (globalThis as { navigator?: unknown }).navigator;
  } else {
    Object.defineProperty(globalThis, 'navigator', ORIGINAL_NAVIGATOR);
  }
});

describe('PdfPreviewFrame (Web)', () => {
  it('com visualizador de PDF, embute a URL local num iframe titulado, com link para outra aba', async () => {
    setPdfViewer(true);
    const { container } = await render(<PdfPreviewFrame url="blob:previa-sintetica" title="Pré-visualização do relatório" />);

    const [iframe] = container.queryAll((node) => node.type === 'iframe');
    expect(iframe.props.src).toBe('blob:previa-sintetica');
    expect(iframe.props.title).toBe('Pré-visualização do relatório');

    const [link] = container.queryAll((node) => node.type === 'a');
    expect(link.props.href).toBe('blob:previa-sintetica');
    expect(link.props.rel).toBe('noopener noreferrer');
    expect(screen.getByText('Abrir a pré-visualização em outra aba')).toBeTruthy();
  });

  it.each([false, undefined])(
    'sem visualizador (pdfViewerEnabled=%p) não embute nada — iframe com PDF viraria download automático',
    async (enabled) => {
      setPdfViewer(enabled);
      const { container } = await render(<PdfPreviewFrame url="blob:previa-sintetica" title="Prévia" />);

      expect(container.queryAll((node) => node.type === 'iframe')).toHaveLength(0);
      expect(container.queryAll((node) => node.type === 'a')).toHaveLength(0);
      expect(screen.getByText(/não exibe PDF dentro da página/)).toBeTruthy();
    },
  );

  it('sem objeto navigator (ambiente sem DOM completo) também não embute', async () => {
    setNavigator(undefined);
    const { container } = await render(<PdfPreviewFrame url="blob:previa-sintetica" title="Prévia" />);

    expect(container.queryAll((node) => node.type === 'iframe')).toHaveLength(0);
    expect(screen.getByText(/não exibe PDF dentro da página/)).toBeTruthy();
  });
});
