import { useColorScheme, View, type ViewProps } from 'react-native';

import { colors, resolveColorScheme } from '@/theme/colors';

import { Text } from './Text';
import type { LucideIcon } from './icons';

export interface SectionHeaderProps extends ViewProps {
  title: string;
  icon: LucideIcon;
  /** Renderizado à direita do título — botão de ação ou seletor da seção. */
  trailing?: React.ReactNode;
}

/**
 * Cabeçalho de card: ícone em pastilha + título, com espaço opcional para uma ação à direita.
 *
 * O ícone é decorativo (`accessibilityElementsHidden`) — quem o descrevesse repetiria o título
 * logo ao lado, e leitor de tela lendo "ícone de coração, Última medição" é ruído, não ajuda.
 */
export function SectionHeader({ title, icon: Icon, trailing, className, ...props }: SectionHeaderProps) {
  const scheme = resolveColorScheme(useColorScheme());
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
        <Text variant="sectionHeader" className="flex-1" numberOfLines={1}>
          {title}
        </Text>
      </View>

      {trailing}
    </View>
  );
}
