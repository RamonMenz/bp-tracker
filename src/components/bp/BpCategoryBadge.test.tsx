import { render } from '@testing-library/react-native';

import type { BpCategory } from '@/domain/bp-classification';

import { BpCategoryBadge, CATEGORY_LABEL } from './BpCategoryBadge';

const ALL_CATEGORIES: BpCategory[] = ['normal', 'elevated', 'stage1', 'stage2', 'crisis'];

describe('BpCategoryBadge', () => {
  /**
   * O contrato que este teste protege é o do CLAUDE.md §4.7: nenhuma informação transmitida
   * APENAS por cor. O badge muda de cor por categoria, então o rótulo textual é o que garante
   * que quem não distingue as cores continua sabendo qual é a classificação.
   */
  it.each(ALL_CATEGORIES)('exibe o rótulo textual da categoria %s, não só a cor', async (category) => {
    const { getByText } = await render(<BpCategoryBadge category={category} />);

    expect(getByText(CATEGORY_LABEL[category])).toBeTruthy();
  });

  it('anuncia a categoria ao leitor de tela', async () => {
    const { getByLabelText } = await render(<BpCategoryBadge category="crisis" />);

    expect(getByLabelText('Categoria: Crise')).toBeTruthy();
  });
});
