import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'display' | 'title' | 'sectionHeader' | 'body' | 'caption';

const VARIANT_CLASSNAME: Record<TextVariant, string> = {
  display: 'text-[56px] font-bold text-light-text dark:text-dark-text',
  title: 'text-[28px] font-semibold text-light-text dark:text-dark-text',
  sectionHeader: 'text-[20px] font-semibold text-light-text dark:text-dark-text',
  body: 'text-base font-normal text-light-text dark:text-dark-text',
  caption: 'text-[13px] font-medium text-light-muted dark:text-dark-muted',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Sobrescreve a cor do variant. Aplicada via `style`, que tem precedência sobre `className` no NativeWind. */
  color?: string;
}

export function Text({ variant = 'body', color, className, style, ...props }: TextProps) {
  return (
    <RNText
      className={[VARIANT_CLASSNAME[variant], className].filter(Boolean).join(' ')}
      style={[
        variant === 'display' ? { fontVariant: ['tabular-nums'] } : null,
        color ? { color } : null,
        style,
      ]}
      {...props}
    />
  );
}
