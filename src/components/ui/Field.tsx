import { TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label: string;
  errorMessage?: string;
}

export function Field({ label, errorMessage, className, ...inputProps }: FieldProps) {
  const scheme = useColorScheme();
  const hasError = Boolean(errorMessage);

  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors[scheme].muted}
        className={[
          'min-h-[52px] rounded-2xl border bg-light-surface px-4 text-base text-light-text dark:bg-dark-surface dark:text-dark-text',
          hasError ? 'border-light-danger dark:border-dark-danger' : 'border-light-border dark:border-dark-border',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...inputProps}
      />
      {hasError ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
