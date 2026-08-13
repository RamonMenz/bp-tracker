import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

export type TextVariant = 'display' | 'metric' | 'title' | 'sectionHeader' | 'body' | 'label' | 'caption';

const VARIANT_CLASSNAME: Record<TextVariant, string> = {
  display: 'text-[56px] font-bold text-light-text dark:text-dark-text',
  // Tamanho do par de pressão em destaque — o mesmo dos campos do formulário, para o valor
  // salvo e o valor sendo digitado terem o mesmo peso na tela.
  metric: 'text-[44px] font-bold text-light-text dark:text-dark-text',
  title: 'text-[28px] font-bold text-light-text dark:text-dark-text',
  sectionHeader: 'text-[20px] font-semibold text-light-text dark:text-dark-text',
  body: 'text-base font-normal text-light-text dark:text-dark-text',
  // Rótulo de campo/seção: mesmo tamanho da caption, mas em versalete e com peso — hierarquia por
  // forma, não só por cor, para continuar legível em alto contraste.
  label: 'text-[13px] font-semibold uppercase tracking-wide text-light-muted dark:text-dark-muted',
  caption: 'text-[13px] font-medium text-light-muted dark:text-dark-muted',
};

/** Números em fonte tabular não "dançam" quando o valor muda — vale para toda métrica de PA. */
const TABULAR_VARIANTS: readonly TextVariant[] = ['display', 'metric', 'title'];

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
        TABULAR_VARIANTS.includes(variant) ? { fontVariant: ['tabular-nums'] } : null,
        color ? { color } : null,
        style,
      ]}
      {...props}
    />
  );
}
