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

/**
 * Quebra estimada por quantidade de caracteres, para fatiar detalhes longos quando o motor de
 * layout (HTML do Android) não expõe as métricas da fonte. Mantém os parágrafos (`\n`), quebra nos
 * espaços e corta palavras maiores que a linha (ex.: URL). Não descarta nem reordena texto: juntar
 * as linhas devolve o conteúdo original, salvo os espaços onde houve quebra.
 */
export function wrapTextByChars(text: string, maxChars: number): string[] {
  if (maxChars < 1) {
    throw new Error('maxChars precisa ser positivo.');
  }

  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    let current = '';

    for (const word of paragraph.split(' ').filter((part) => part !== '')) {
      let rest = word;

      while (rest.length > 0) {
        const separator = current === '' ? '' : ' ';

        if (current.length + separator.length + rest.length <= maxChars) {
          current += separator + rest;
          rest = '';
        } else if (current !== '') {
          lines.push(current);
          current = '';
        } else {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
      }
    }

    lines.push(current);
  }

  return lines;
}
