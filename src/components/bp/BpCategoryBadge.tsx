import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { BpCategory } from '@/domain/bp-classification';

export interface BpCategoryBadgeProps {
  category: BpCategory;
}

const LABEL: Record<BpCategory, string> = {
  normal: 'Normal',
  elevated: 'Elevada',
  stage1: 'Estágio 1',
  stage2: 'Estágio 2',
  crisis: 'Crise',
};

// Cores de referência AHA — só aqui, nunca como fundo de tela inteira (PLAN §4.2).
// O texto do label é sempre exibido junto: cor nunca é o único portador de significado (§4.7).
const COLOR: Record<BpCategory, string> = {
  normal: '#1B8A5A',
  elevated: '#B8860B',
  stage1: '#C2610E',
  stage2: '#C0392B',
  crisis: '#7D1F1F',
};

export function BpCategoryBadge({ category }: BpCategoryBadgeProps) {
  const color = COLOR[category];

  return (
    <View
      className="w-min flex-row items-center gap-1.5 self-center rounded-full border px-3 py-1.5"
      style={{ borderColor: color }}
      accessibilityLabel={`Categoria: ${LABEL[category]}`}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="caption" color={color} style={{ fontWeight: '600' }}>
        {LABEL[category]}
      </Text>
    </View>
  );
}
