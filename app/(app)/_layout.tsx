import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClipboardListIcon, HeartPulseIcon, SettingsIcon } from '@/components/ui/icons';
import { colors, resolveColorScheme } from '@/theme/colors';

/**
 * Altura da barra sem contar a área segura. Os 49dp padrão do react-navigation não comportam
 * ícone de 25dp + rótulo de 12dp: o rótulo era espremido até 2dp de altura e sumia da tela.
 */
const TAB_BAR_CONTENT_HEIGHT = 68;

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
