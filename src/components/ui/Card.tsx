import { View, type ViewProps } from 'react-native';

import { tokens } from '@/theme/tokens';

export interface CardProps extends ViewProps {
  /** `flat` remove a sombra — para cards aninhados ou listados em sequência, onde a sombra empilhada vira sujeira visual. */
  elevation?: 'card' | 'flat';
  /** `none` entrega o padding para o conteúdo — usado quando o card abraça uma lista que sangra até a borda. */
  padding?: 'default' | 'none';
}

export function Card({ elevation = 'card', padding = 'default', className, style, ...props }: CardProps) {
  return (
    <View
      className={[
        'rounded-2xl border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface',
        padding === 'default' ? 'p-4' : 'overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={[elevation === 'card' ? tokens.shadow.card : null, style]}
      {...props}
    />
  );
}
