import { useState } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View, type PressableProps } from 'react-native';

import { colors, resolveColorScheme } from '@/theme/colors';

import { Text } from './Text';
import type { LucideIcon } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'disabled' | 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone Lucide desenhado antes do label. Decorativo: o label já nomeia a ação para o leitor de tela. */
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
}

const CONTAINER_CLASSNAME: Record<ButtonVariant, string> = {
  primary: 'bg-light-primary dark:bg-dark-primary',
  secondary: 'bg-light-surface border border-light-border dark:bg-dark-surface dark:border-dark-border',
  ghost: 'bg-transparent',
  destructive: 'bg-light-danger dark:bg-dark-danger',
};

// 56dp na ação principal (Salvar) e 48dp nas secundárias — ambos acima do mínimo de 48 do
// CLAUDE.md §4.7; o `lg` existe para dar peso visual ao caminho de registrar em ≤10s.
const SIZE_CLASSNAME: Record<ButtonSize, string> = {
  md: 'min-h-[48px] px-4',
  lg: 'min-h-[56px] px-5',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  className,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = disabled || loading;

  const foreground =
    variant === 'primary'
      ? palette.primaryFg
      : variant === 'destructive'
        ? '#FFFFFF'
        : variant === 'ghost'
          ? palette.primary
          : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={(event) => {
        setIsPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setIsPressed(false);
        onPressOut?.(event);
      }}
      className={[
        'min-w-[48px] flex-row items-center justify-center gap-2 rounded-2xl',
        CONTAINER_CLASSNAME[variant],
        SIZE_CLASSNAME[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      // Opacidade em `style` e não numa variante `active:` do NativeWind: o feedback de toque é
      // requisito de affordance, não pode depender de a variante estar habilitada no preset.
      style={{ opacity: isDisabled ? 0.45 : isPressed ? 0.75 : 1 }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {Icon ? (
            <View accessible={false}>
              <Icon size={20} color={foreground} strokeWidth={2.25} />
            </View>
          ) : null}
          <Text variant="body" color={foreground} style={{ fontWeight: '600' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
