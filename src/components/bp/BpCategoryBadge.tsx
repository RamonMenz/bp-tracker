import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { BpCategory } from '@/domain/bp-classification';
import { categoryColors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export type BpCategoryBadgeSize = 'sm' | 'md';

export interface BpCategoryBadgeProps {
  category: BpCategory;
  size?: BpCategoryBadgeSize;
}

/**
 * Nome de exibição de cada categoria. Fonte única: quem precisa da versão falada pelo leitor de
 * tela usa `.toLowerCase()` sobre estes mesmos rótulos, para o texto na tela e o texto anunciado
 * nunca divergirem.
 */
export const CATEGORY_LABEL: Record<BpCategory, string> = {
  normal: 'Normal',
  elevated: 'Elevada',
  stage1: 'Estágio 1',
  stage2: 'Estágio 2',
  crisis: 'Crise',
};

const SIZE_CLASSNAME: Record<BpCategoryBadgeSize, string> = {
  sm: 'gap-1.5 px-2.5 py-1',
  md: 'gap-2 px-3 py-1.5',
};

const DOT_SIZE: Record<BpCategoryBadgeSize, number> = { sm: 7, md: 9 };

/**
 * Pastilha da classificação: fundo `tint` + borda + ponto, todos na família da categoria.
 *
 * O label textual está sempre presente — cor nunca é o único portador do significado
 * (CLAUDE.md §4.7). O rótulo é só descritivo: o app registra, não diagnostica.
 */
export function BpCategoryBadge({ category, size = 'md' }: BpCategoryBadgeProps) {
  const scheme = useColorScheme();
  const palette = categoryColors[scheme][category];

  return (
    <View
      className={['flex-row items-center self-start rounded-full border', SIZE_CLASSNAME[size]].join(' ')}
      style={{ backgroundColor: palette.tint, borderColor: palette.border }}
      accessibilityLabel={`Categoria: ${CATEGORY_LABEL[category]}`}
    >
      <View
        style={{
          width: DOT_SIZE[size],
          height: DOT_SIZE[size],
          borderRadius: DOT_SIZE[size] / 2,
          backgroundColor: palette.fg,
        }}
      />
      <Text variant="caption" color={palette.fg} style={{ fontWeight: '700' }}>
        {CATEGORY_LABEL[category]}
      </Text>
    </View>
  );
}
