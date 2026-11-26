/**
 * Detalhes longos da tabela do relatório (spec-relatorio-pdf §3.3.8): o texto já quebrado em
 * linhas pelo renderizador é dividido em blocos de no máximo `maxLines`. Cada bloco vira uma linha
 * da tabela que nunca é cortada entre páginas; blocos seguintes do mesmo registro levam indicação
 * de continuidade. Nada é descartado nem resumido.
 */

export const CONTINUES_MARK = '(continua)';
export const CONTINUATION_MARK = '(continuação)';

export function splitDetailLines(lines: readonly string[], maxLines: number): string[][] {
  if (maxLines < 3) {
    throw new Error('maxLines precisa comportar o texto e as marcas de continuidade.');
  }

  if (lines.length <= maxLines) {
    return [[...lines]];
  }

  const chunks: string[][] = [];
  let index = 0;

  while (index < lines.length) {
    const isFirst = index === 0;
    // Reserva uma linha para "(continuação)" no topo (exceto no 1º bloco) e uma para "(continua)".
    const capacity = maxLines - (isFirst ? 0 : 1) - 1;
    const remaining = lines.length - index;
    const isLast = remaining <= maxLines - (isFirst ? 0 : 1);
    const take = isLast ? remaining : capacity;

    chunks.push([
      ...(isFirst ? [] : [CONTINUATION_MARK]),
      ...lines.slice(index, index + take),
      ...(isLast ? [] : [CONTINUES_MARK]),
    ]);
    index += take;
  }

  return chunks;
}
