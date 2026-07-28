import { TextInput, useColorScheme, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/colors';

import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  label: string;
  errorMessage?: string;
}

export function Field({ label, errorMessage, className, ...inputProps }: FieldProps) {
  const scheme = useColorScheme() ?? 'light';
  const hasError = Boolean(errorMessage);

  return (
    <View className="gap-1">
      <Text variant="caption">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ invalid: hasError }}
        placeholderTextColor={colors[scheme].muted}
        className={[
          'min-h-[48px] rounded-xl border bg-light-surface px-4 text-base text-light-text dark:bg-dark-surface dark:text-dark-text',
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
