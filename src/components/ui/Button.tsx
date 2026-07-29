import { ActivityIndicator, Pressable, useColorScheme, type PressableProps } from 'react-native';

import { colors, resolveColorScheme } from '@/theme/colors';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'disabled' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

const BACKGROUND_CLASSNAME: Record<ButtonVariant, string> = {
  primary: 'bg-light-primary dark:bg-dark-primary',
  secondary: 'bg-transparent border border-light-primary dark:border-dark-primary',
  destructive: 'bg-light-danger dark:bg-dark-danger',
};

export function Button({
  label,
  variant = 'primary',
  disabled = false,
  loading = false,
  className,
  ...props
}: ButtonProps) {
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
  const isDisabled = disabled || loading;

  const foreground =
    variant === 'secondary' ? palette.primary : variant === 'primary' ? palette.primaryFg : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={[
        'min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-xl px-4',
        BACKGROUND_CLASSNAME[variant],
        isDisabled ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text variant="body" color={foreground} style={{ fontWeight: '600' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
