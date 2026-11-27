/**
 * @jest-environment node
 */
import { buildReportModel, type ReportModel, type ReportSourceReading } from '@/lib/report/report-model';
import { resolveReportPeriod, type ReportPeriodSelection } from '@/lib/report/report-period';
import { CONTINUATION_MARK, CONTINUES_MARK } from '@/lib/report/report-table';

import { buildReportHtml, escapeHtml } from './report-html';

/**
 * Template HTML do Android (expo-print). Os testes conferem o TEXTO do HTML gerado a partir do
 * modelo real; a renderização real no WebView do aparelho não é exercitada aqui (ver
 * report-html.chromium.test.ts, aproximação em Chromium, e docs/pdf-android.md).
 */

const TZ = 'America/Sao_Paulo';
const PREPARED_AT = new Date('2026-11-26T17:03:00.000Z');

let nextId = 0;

function reading(overrides: Partial<ReportSourceReading> & Pick<ReportSourceReading, 'measuredAt'>): ReportSourceReading {
  nextId += 1;
  return {
    id: `synthetic-${String(nextId).padStart(4, '0')}`,
    systolic: 120,
    diastolic: 80,
    pulse: null,
    createdAt: overrides.measuredAt,
    note: null,
    source: 'manual',
    sessionReadings: null,
    hasPendingWrites: false,
    ...overrides,
  };
}

function model(
  readings: ReportSourceReading[],
  selection: ReportPeriodSelection = { kind: 'all' },
  extra: { fromCache?: boolean; omittedCount?: number } = {},
): ReportModel {
  const period = resolveReportPeriod(selection, PREPARED_AT, TZ);

  if (!period.ok) {
    throw new Error(period.error);
  }

  const result = buildReportModel(
    { readings, fromCache: extra.fromCache ?? false, omittedCount: extra.omittedCount ?? 0 },
    period.period,
  );

  if (!result.ok) {
    throw new Error('esperava modelo');
  }

  return result.model;
}

/** Exemplo verificável da spec §3.3.5: dois registros no mesmo dia, pulso ausente no segundo. */
function specExample(): ReportModel {
  return model([
    reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z'), systolic: 120, diastolic: 80, pulse: 60 }),
    reading({ measuredAt: new Date('2026-11-20T20:00:00.000Z'), systolic: 130, diastolic: 90, pulse: null }),
    reading({ measuredAt: new Date('2026-11-22T12:00:00.000Z'), systolic: 140, diastolic: 100, pulse: 80 }),
  ]);
}

/** Texto visível aproximado: sem tags, com entidades decodificadas. */
function visibleText(html: string): string {
  return html
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

describe('buildReportHtml — conteúdo do mesmo modelo da Web (PDF-03/04/05)', () => {
  it('traz cabeçalho, cobertura, médias com N, gráfico, tabela e notas, nessa ordem', () => {
    const html = buildReportHtml(specExample());
    const text = visibleText(html);

    const order = [
      'Aferi — Relatório de pressão arterial',
      'Período solicitado: Tudo',
      'Fuso horário: America/Sao_Paulo',
      'Cobertura',
      'Registros incluídos: 3',
      'Dias com registro: 2',
      'Médias do intervalo',
      'Tendência (médias diárias)',
      'Registros Data Hora',
      'Notas metodológicas',
      'não substitui avaliação médica',
    ].map((needle) => text.indexOf(needle));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('exemplo da spec: 130,0/90,0 mmHg com N=3 e pulso 70,0 bpm com N=2', () => {
    const text = visibleText(buildReportHtml(specExample()));

    expect(text).toContain('Sistólica média: 130,0 mmHg (N = 3 registros)');
    expect(text).toContain('Diastólica média: 90,0 mmHg (N = 3 registros)');
    expect(text).toContain('Pulso médio: 70,0 bpm (N = 2 de 3 registros com pulso informado)');
  });

  it('pulso ausente aparece como "—" na tabela e, sem nenhum pulso, a média é "Não informado"', () => {
    const html = buildReportHtml(model([reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z') })]));

    expect(html).toMatch(/<td class="num">—<\/td><td class="details">/);
    expect(visibleText(html)).toContain('Pulso médio: Não informado');
  });

  it('a tabela tem as 6 colunas, cabeçalho repetível (thead) e uma linha por registro, em ordem', () => {
    const html = buildReportHtml(specExample());
    const rows = html.match(/<tbody>([\s\S]*)<\/tbody>/)?.[1].match(/<tr[ >]/g) ?? [];

    expect(html).toContain('<thead><tr>');
    expect((html.match(/<th[ >]/g) ?? []).length).toBe(6);
    expect(rows).toHaveLength(3);
    expect(html.indexOf('>120<')).toBeLessThan(html.indexOf('>130<'));
    expect(html.indexOf('>130<')).toBeLessThan(html.indexOf('>140<'));
  });

  it('CSS de impressão: A4 retrato, tabela ≥ 10 pt, thead repetido, linhas sem quebra e paginação', () => {
    const html = buildReportHtml(specExample());

    expect(html).toContain('size: A4 portrait');
    expect(html).toMatch(/table \{[^}]*font-size: 10pt/);
    expect(html).toMatch(/body \{[^}]*font-size: 11pt/);
    expect(html).toContain('thead { display: table-header-group; }');
    expect(html).toMatch(/tr \{[^}]*page-break-inside: avoid/);
    expect(html).toContain('counter(page)');
    expect(html).toContain('counter(pages)');
  });

  it('cobertura não confirmada aparece em destaque com os avisos (PDF-19)', () => {
    const text = visibleText(
      buildReportHtml(model([reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z') })], { kind: 'all' }, { fromCache: true, omittedCount: 2 })),
    );

    expect(text).toContain('Cobertura não confirmada');
    expect(text).toContain('Avisos');
    expect(text).toContain('2 registros do período não puderam ser lidos e foram omitidos');
  });

  it('sessão de duas leituras: detalhe identificado e o registro conta uma vez (PDF-06)', () => {
    const html = buildReportHtml(
      model([
        reading({
          measuredAt: new Date('2026-11-20T11:00:00.000Z'),
          systolic: 125,
          diastolic: 85,
          sessionReadings: [
            { systolic: 120, diastolic: 80, pulse: 60 },
            { systolic: 130, diastolic: 90, pulse: null },
          ],
        }),
      ]),
    );

    expect(visibleText(html)).toContain('Média de sessão (2 leituras): 1ª 120/80, pulso 60; 2ª 130/90, pulso —');
    expect(visibleText(html)).toContain('Registros incluídos: 1');
  });
});

describe('buildReportHtml — gráfico SVG inline (PDF-08)', () => {
  it('séries distintas por cor, traço e marcador, com legenda e escala em mmHg', () => {
    const html = buildReportHtml(
      model([
        reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z'), systolic: 120, diastolic: 80 }),
        reading({ measuredAt: new Date('2026-11-21T11:00:00.000Z'), systolic: 130, diastolic: 85 }),
      ]),
    );

    expect(html).toContain('Sistólica (média diária)');
    expect(html).toContain('Diastólica (média diária)');
    expect(html).toContain('>mmHg</text>');
    // Diastólica tracejada com quadrado vazado; sistólica contínua com círculo cheio.
    expect(html).toMatch(/<polyline [^>]*stroke="rgb\(180, 83, 9\)"[^>]*stroke-dasharray="1\.6 1\.1"/);
    expect(html).toMatch(/<polyline [^>]*stroke="rgb\(29, 78, 216\)" stroke-width="0\.5"\/>/);
    expect(html).toMatch(/<circle [^>]*fill="rgb\(29, 78, 216\)"/);
    expect(html).toMatch(/<rect [^>]*fill="#fff" stroke="rgb\(180, 83, 9\)"/);
  });

  it('um ponto por dia com dado e linha só entre dias consecutivos (sem zero nem interpolação)', () => {
    const html = buildReportHtml(specExample());
    const panel = html.match(/<svg class="panel"[\s\S]*?<\/svg>/)?.[0] ?? '';

    // 20/11 e 22/11: 2 dias com dado, não consecutivos → nenhuma linha, 2 marcadores por série.
    expect((panel.match(/<circle /g) ?? []).length).toBe(2);
    expect((panel.match(/<rect /g) ?? []).length).toBe(2);
    expect(panel).not.toContain('<polyline');
  });

  it('coordenadas pela mesma geometria da Web: o 1º dia de 3 fica no centro da 1ª faixa', () => {
    // Faixa de 12 a 178 mm (166 mm) com 3 dias: centro do 1º dia em 12 + 166 × (0,5 / 3).
    const html = buildReportHtml(specExample());
    const expectedX = (12 + 166 * (0.5 / 3)).toFixed(2);

    expect(html).toContain(`<circle cx="${expectedX}"`);
  });

  it('um único dia: explicação e só marcadores, sem linha de tendência', () => {
    const html = buildReportHtml(
      model([
        reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
        reading({ measuredAt: new Date('2026-11-20T15:00:00.000Z'), systolic: 130 }),
      ]),
    );

    expect(visibleText(html)).toContain('Há medições em apenas um dia');
    expect(html).not.toContain('<polyline');
  });
});

describe('buildReportHtml — escape e ausência de recursos externos (PDF-11/12)', () => {
  const HOSTILE_NOTE =
    '<img src="https://rastreador.invalido/p.png"> <script>alert(1)</script> "aspas" \'simples\' & <a href="http://x.invalido">link</a> url(https://x.invalido/f.woff) @import "https://x.invalido/a.css"; </style><p>fim';

  function hostileHtml(): string {
    return buildReportHtml(model([reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z'), note: HOSTILE_NOTE })]));
  }

  it('observação com HTML, URL e aspas vira texto literal', () => {
    const html = hostileHtml();

    expect(html).toContain('&lt;img src=&quot;https://rastreador.invalido/p.png&quot;&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&quot;aspas&quot; &#39;simples&#39; &amp;');
    expect(visibleText(html)).toContain(`Observação: ${HOSTILE_NOTE.slice(0, 40)}`);
  });

  it('nenhuma tag ativa, atributo de recurso, @import ou url() fora do texto escapado', () => {
    const html = hostileHtml();
    const markup = html.replace(/>[^<]*</g, '><');

    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<(img|iframe|object|embed|link|a|image|use|foreignObject)[\s>]/i);
    expect(markup).not.toMatch(/\s(src|href|xlink:href|srcset|on[a-z]+)=/i);
    expect(markup).not.toMatch(/https?:\/\//i);
    expect(markup).not.toMatch(/@import|url\(/i);
    // Só existe UM fechamento de <style>: a observação não encerra o CSS.
    expect(html.match(/<\/style>/g)).toHaveLength(1);
  });

  it('sem nenhuma observação, o documento inteiro não tem http(s), script, @import nem url()', () => {
    const html = buildReportHtml(specExample());

    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<script|@import|url\(/i);
    expect(html).toContain(`content="default-src 'none'; style-src 'unsafe-inline'"`);
  });

  it('caracteres especiais e acentos ficam intactos (UTF-8, sem troca por "?")', () => {
    const html = buildReportHtml(
      model([reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z'), note: 'Ação, coração, pressão — “ok” ✓ 😀 日本' })]),
    );

    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('Ação, coração, pressão — “ok” ✓ 😀 日本');
  });

  it('escapeHtml remove controles invisíveis e mantém a quebra de linha', () => {
    expect(escapeHtml('a\u0000b\u0007c\r\nd')).toBe('abc\nd');
  });
});

describe('buildReportHtml — observações longas (PDF-09)', () => {
  it('detalhe longo vira blocos com "(continua)"/"(continuação)", data e hora repetidas, sem perder texto', () => {
    const words = Array.from({ length: 160 }, (_, index) => `palavra${index + 1}`);
    const html = buildReportHtml(model([reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z'), note: words.join(' ') })]));
    const rows = html.match(/<tbody>([\s\S]*)<\/tbody>/)?.[1].split('</tr>').filter((row) => row !== '') ?? [];

    expect(rows.length).toBeGreaterThan(1);
    rows.slice(1).forEach((row) => {
      expect(row).toContain('class="continuation"');
      expect(row).toContain('<td>20/11/2026</td><td>08:00</td><td class="num"></td>');
      expect(row).toContain(CONTINUATION_MARK);
    });
    rows.slice(0, -1).forEach((row) => expect(row).toContain(CONTINUES_MARK));

    const text = visibleText(html);
    words.forEach((word) => expect(text).toContain(`${word} `.trim()));
    expect(text.match(/palavra160/g)).toHaveLength(1);
  });
});
