import { Pressable, useColorScheme, View, type ViewProps } from 'react-native';

import { colors, resolveColorScheme } from '@/theme/colors';

import { Text } from './Text';

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
  const scheme = resolveColorScheme(useColorScheme());

  return (
    <View className={['gap-2', className].filter(Boolean).join(' ')} {...props}>
      <Text variant="caption" accessibilityRole="text">
        {DISCLAIMER_TEXT}
      </Text>

      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entendi, fechar este aviso"
          onPress={onDismiss}
          className="min-h-[48px] items-start justify-center self-start"
        >
          <Text variant="caption" color={colors[scheme].primary} style={{ fontWeight: '600' }}>
            Entendi
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
