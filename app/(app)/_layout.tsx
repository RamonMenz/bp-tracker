import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ClipboardListIcon, HeartPulseIcon, SettingsIcon } from '@/components/ui/icons';
import { colors, resolveColorScheme } from '@/theme/colors';

export default function AppLayout() {
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

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
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 4 },
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
