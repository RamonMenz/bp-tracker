import { Pressable, View, type ViewProps } from 'react-native';

import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

import { Text } from './Text';
import { InfoIcon } from './icons';

export interface DisclaimerProps extends ViewProps {
  /** Quando presente, mostra um "Entendi" para o usuário dispensar o aviso. */
  onDismiss?: () => void;
}

const DISCLAIMER_TEXT =
  'O BP Tracker registra suas medições de pressão arterial e não substitui avaliação médica. ' +
  'Converse com seu médico sobre os resultados.';

/**
 * Tom clínico, nunca alarmista (CLAUDE.md §1): o app registra, não diagnostica. Reutilizável em
 * qualquer tela — Ajustes mostra sempre; a Home mostra só até o usuário dispensar (onDismiss).
 */
export function Disclaimer({ onDismiss, className, ...props }: DisclaimerProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];

  return (
    <View className={['gap-2', className].filter(Boolean).join(' ')} {...props}>
      <View className="flex-row gap-2.5">
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="pt-0.5">
          <InfoIcon size={16} color={palette.muted} strokeWidth={2} />
        </View>
        <Text variant="caption" accessibilityRole="text" className="flex-1">
          {DISCLAIMER_TEXT}
        </Text>
      </View>

      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entendi, fechar este aviso"
          onPress={onDismiss}
          className="min-h-[48px] items-start justify-center self-start"
        >
          <Text variant="caption" color={palette.primary} style={{ fontWeight: '700' }}>
            Entendi
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
