import { downloadPdf, OBJECT_URL_REVOKE_DELAY_MS, openPdfPreview, reportPdfPlatform } from './report-pdf-platform.web';

/**
 * O ambiente do Jest não tem DOM: `document` e as funções de URL de objeto são substituídos por
 * dublês só pelo tempo de cada teste, para observar a ORDEM — clicar antes, revogar depois.
 */
interface FakeLink {
  href: string;
  download: string;
  rel: string;
  style: { display: string };
  click: jest.Mock;
  remove: jest.Mock;
}

const events: string[] = [];
let link: FakeLink;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  jest.useFakeTimers();
  events.length = 0;
  link = {
    href: '',
    download: '',
    rel: '',
    style: { display: '' },
    click: jest.fn(() => events.push('click')),
    remove: jest.fn(() => events.push('remove')),
  };
  (globalThis as { document?: unknown }).document = {
    createElement: jest.fn(() => link),
    body: { appendChild: jest.fn(() => events.push('append')) },
  };
  URL.createObjectURL = jest.fn(() => {
    events.push('create');
    return 'blob:aferi-sintetico';
  });
  URL.revokeObjectURL = jest.fn(() => events.push('revoke'));
});

afterEach(() => {
  jest.useRealTimers();
  delete (globalThis as { document?: unknown }).document;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('downloadPdf (Web)', () => {
  const pdf = { type: 'application/pdf', size: 10 } as Blob;

  it('baixa por URL de objeto com o nome informado e só revoga depois do consumo', () => {
    downloadPdf('aferi-relatorio-2026-10-01_a_2026-10-23.pdf', pdf);

    expect(URL.createObjectURL).toHaveBeenCalledWith(pdf);
    expect(link.href).toBe('blob:aferi-sintetico');
    expect(link.download).toBe('aferi-relatorio-2026-10-01_a_2026-10-23.pdf');
    expect(events).toEqual(['create', 'append', 'click', 'remove']);
    // Nada de revogação síncrona: o clique só agenda o download.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS - 1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:aferi-sintetico');
  });

  it('libera a URL mesmo se o clique falhar', () => {
    link.click.mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => downloadPdf('a.pdf', pdf)).toThrow();
    jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:aferi-sintetico');
  });

  it('o adaptador Web está disponível e entrega pelo download', () => {
    expect(reportPdfPlatform.isAvailable).toBe(true);
    expect(reportPdfPlatform.deliver).toBe(downloadPdf);
  });
});

describe('openPdfPreview (Web)', () => {
  const pdf = { type: 'application/pdf', size: 10 } as Blob;

  it('cria URL local e só revoga depois de liberada e do atraso de consumo, uma única vez', () => {
    const preview = openPdfPreview(pdf);

    expect(preview.url).toBe('blob:aferi-sintetico');
    jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS * 2);
    // Enquanto o diálogo usa a prévia, nada é revogado.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    preview.release();
    preview.release();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:aferi-sintetico');
  });

  it('o adaptador Web expõe a pré-visualização', () => {
    expect(reportPdfPlatform.openPreview).toBe(openPdfPreview);
  });
});
