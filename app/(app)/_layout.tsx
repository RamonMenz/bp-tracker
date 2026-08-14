import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClipboardListIcon, HeartPulseIcon, SettingsIcon } from '@/components/ui/icons';
import { colors, resolveColorScheme } from '@/theme/colors';

/**
 * Altura da barra sem contar a área segura. 68dp ainda cortava a base do rótulo (medido: caixa do
 * texto comprimida a 9dp em vez dos 16dp de lineHeight): o wrapper do ícone do react-navigation é
 * FIXO em 28dp (ICON_SIZE_TALL, não escala com o `size` que passamos) e o próprio BottomTabItem
 * soma seus 5dp de padding em cada ponta por cima do padding daqui — a conta completa é
 * paddingTop(8) + padding interno(5) + ícone(28) + rótulo(16) + padding interno(5) +
 * paddingBottom(12) = 74dp; 76dp deixa uma folga de 2dp em vez do mínimo exato.
 */
const TAB_BAR_CONTENT_HEIGHT = 76;

/** Altura de linha explícita do rótulo: sem ela o texto sai da caixa e é cortado pela borda da tela. */
const TAB_BAR_LABEL_LINE_HEIGHT = 16;

export default function AppLayout() {
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
  // A área segura entra na altura em vez de virar padding do item: assim o conteúdo da barra
  // sobe inteiro acima do indicador de home, sem espremer o rótulo de novo.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Sem header do navegador: cada tela desenha o próprio título dentro do conteúdo, o que
        // evita a barra dupla (header + título) e dá a leitura de app nativo pedida no redesign.
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          lineHeight: TAB_BAR_LABEL_LINE_HEIGHT,
        },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Registrar',
          tabBarIcon: ({ color, size }) => <HeartPulseIcon color={color} size={size} strokeWidth={2.25} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <ClipboardListIcon color={color} size={size} strokeWidth={2.25} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} strokeWidth={2.25} />,
        }}
      />
    </Tabs>
  );
}
