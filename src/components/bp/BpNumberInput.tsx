import { forwardRef } from 'react';
import { TextInput, useColorScheme, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, resolveColorScheme } from '@/theme/colors';

export interface BpNumberInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  /** Disparado quando o texto atinge `maxLength` — usado para focar o próximo campo. */
  onDigitsComplete?: () => void;
  errorMessage?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
}

export const BpNumberInput = forwardRef<TextInput, BpNumberInputProps>(function BpNumberInput(
  { label, value, onChangeText, maxLength, onDigitsComplete, errorMessage, returnKeyType },
  ref,
) {
  const scheme = resolveColorScheme(useColorScheme());
  const hasError = Boolean(errorMessage);

  function handleChangeText(text: string): void {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    onChangeText(digitsOnly);

    if (digitsOnly.length >= maxLength) {
      onDigitsComplete?.();
    }
  }

  return (
    <View className="items-center gap-1">
      <Text variant="caption">{label}</Text>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        accessibilityLabel={label}
        className="min-h-[64px] min-w-[110px] text-center text-[56px] font-bold text-light-text dark:text-dark-text"
        style={{ fontVariant: ['tabular-nums'] }}
      />
      {hasError ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});
