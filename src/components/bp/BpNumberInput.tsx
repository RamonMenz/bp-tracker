import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export interface BpNumberInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  /** Unidade exibida sob o número — contexto clínico sem custar um toque a mais. */
  unit?: string;
  /** Disparado quando o texto atinge `maxLength` — usado para focar o próximo campo. */
  onDigitsComplete?: () => void;
  errorMessage?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
}

/**
 * Campo numérico grande de pressão: rótulo, caixa tocável inteira e unidade.
 *
 * A caixa tem borda de 2dp cuja cor é o estado do campo — cinza em repouso, azul em foco,
 * vermelho em erro, com fundo levemente tingido no erro. A mensagem textual acompanha sempre:
 * a borda vermelha sozinha não comunicaria nada a quem não distingue a cor (CLAUDE.md §4.7).
 */
export const BpNumberInput = forwardRef<TextInput, BpNumberInputProps>(function BpNumberInput(
  { label, value, onChangeText, maxLength, unit, onDigitsComplete, errorMessage, returnKeyType, onSubmitEditing },
  ref,
) {
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorMessage);

  const borderColor = hasError ? palette.danger : isFocused ? palette.primary : palette.border;

  function handleChangeText(text: string): void {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    onChangeText(digitsOnly);

    if (digitsOnly.length >= maxLength) {
      onDigitsComplete?.();
    }
  }

  return (
    <View className="flex-1 gap-1.5">
      <Text variant="label">{label}</Text>

      <View
        className="items-center justify-center rounded-2xl border-2 bg-light-surface px-2 pb-2 pt-3 dark:bg-dark-surface"
        style={{ borderColor }}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="number-pad"
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          placeholder="—"
          // slate-300 e não a cor da borda: no tom da borda o traço sumia contra o fundo e a
          // caixa lia como quebrada em vez de vazia. Aqui ele aparece como marca d'água sem
          // chegar a parecer um valor já preenchido.
          placeholderTextColor={scheme === 'light' ? '#CBD5E1' : '#475569'}
          accessibilityLabel={label}
          selectionColor={palette.primary}
          className="w-full text-center text-[44px] font-bold text-light-text dark:text-dark-text"
          style={{ fontVariant: ['tabular-nums'] }}
        />
        {unit ? (
          <Text variant="caption" className="mt-0.5">
            {unit}
          </Text>
        ) : null}
      </View>

      {hasError ? (
        <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});
