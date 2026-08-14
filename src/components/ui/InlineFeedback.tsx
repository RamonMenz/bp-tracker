import { View, useColorScheme, type ViewProps } from 'react-native';

import { colors, resolveColorScheme } from '@/theme/colors';

import { CheckIcon, TriangleAlertIcon } from './icons';
import { Text } from './Text';

export type InlineFeedbackTone = 'danger' | 'success';

export interface InlineFeedbackProps extends Omit<ViewProps, 'children'> {
  tone: InlineFeedbackTone;
  message: string;
}

/**
 * Faixa curta de feedback (erro ou sucesso), pensada para ficar ANCORADA perto da ação que a
 * originou — nunca dentro de uma lista/ScrollView que possa rolar para longe dela. Existe porque
 * o histórico renderizava `deleteError`/`exportError` dentro do `ListHeaderComponent` da
 * FlashList: excluir uma medição várias rolagens abaixo do topo deixava o erro fora da área
 * visível (quem vê o resultado, então, é só quem já está no topo da lista).
 *
 * Cor nunca é o único portador do significado (CLAUDE.md §4.7): ícone e texto acompanham sempre
 * o tom, nunca só a borda/fundo.
 */
export function InlineFeedback({ tone, message, className, style, ...props }: InlineFeedbackProps) {
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
  const isDanger = tone === 'danger';
  const color = isDanger ? palette.danger : palette.success;
  const Icon = isDanger ? TriangleAlertIcon : CheckIcon;

  return (
    <View
      accessibilityRole="alert"
      className={['flex-row items-center gap-2 rounded-2xl border bg-light-surface px-3 py-2.5 dark:bg-dark-surface', className]
        .filter(Boolean)
        .join(' ')}
      style={[{ borderColor: color }, style]}
      {...props}
    >
      <Icon size={16} color={color} strokeWidth={2.25} />
      <Text variant="caption" color={color} className="flex-1">
        {message}
      </Text>
    </View>
  );
}
