import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps;

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={[
        'rounded-xl border border-light-border bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
