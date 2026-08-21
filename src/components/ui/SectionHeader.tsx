import { View, type ViewProps } from 'react-native';

import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

import { Text } from './Text';
import type { LucideIcon } from './icons';

export interface SectionHeaderProps extends ViewProps {
  title: string;
  icon: LucideIcon;
  /** Renderizado à direita do título — botão de ação ou seletor da seção. */
  trailing?: React.ReactNode;
  /**
   * Padrão 1, como nos títulos curtos (Ajustes, LastReadingCard etc.). Alguns títulos são uma
   * frase que não cabe numa linha — truncar com reticências corta informação por causa do
   * tamanho de fonte, o que o CLAUDE.md §4.7 proíbe (allowFontScaling nunca é desativado).
   */
  titleNumberOfLines?: number;
}

/**
 * Cabeçalho de card: ícone em pastilha + título, com espaço opcional para uma ação à direita.
 *
 * O ícone é decorativo (`accessibilityElementsHidden`) — quem o descrevesse repetiria o título
 * logo ao lado, e leitor de tela lendo "ícone de coração, Última medição" é ruído, não ajuda.
 */
export function SectionHeader({
  title,
  icon: Icon,
  trailing,
  className,
  titleNumberOfLines = 1,
  ...props
}: SectionHeaderProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];

  return (
    <View
      className={['flex-row items-center justify-between gap-3', className].filter(Boolean).join(' ')}
      {...props}
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="h-9 w-9 items-center justify-center rounded-xl bg-light-primaryTint dark:bg-dark-primaryTint"
        >
          <Icon size={18} color={palette.primary} strokeWidth={2.25} />
        </View>
        <Text variant="sectionHeader" className="flex-1" numberOfLines={titleNumberOfLines}>
          {title}
        </Text>
      </View>

      {trailing}
    </View>
  );
}
