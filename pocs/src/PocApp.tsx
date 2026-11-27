import { lazy, Suspense, useState } from 'react';
import { BackHandler, Platform, SafeAreaView, ScrollView, Text } from 'react-native';

import { Action } from '@/components/Action';
import { Status } from '@/components/Status';

const Photo = lazy(() => import('@/components/PhotoPoc').then(module => ({ default: module.PhotoPoc })));
const Voice = lazy(() => import('@/components/VoicePoc').then(module => ({ default: module.VoicePoc })));

export function PocApp() {
  const [mode, setMode] = useState<'photo' | 'voice' | null>(null);
  const [manualStatus, setManualStatus] = useState('');
  function openManual() {
    setMode(null);
    if (Platform.OS === 'web') {
      setManualStatus('Feche esta aba e volte à aba do Aferi. Esta PoC não abre o Firebase.');
      return;
    }
    // Não abre automaticamente um app cuja configuração Firebase é desconhecida.
    // O usuário pode retornar ao manual pelo ícone do app de homologação.
    BackHandler.exitApp();
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
    <Text accessibilityRole="header" style={{ fontSize: 25, fontWeight: 'bold', color: '#0f172a' }}>Aferi — PoCs locais</Text>
    <Status text="Aplicativo de teste isolado. Use somente dados sintéticos. Resultados ficam na tela até cancelar/sair; nenhuma medição é salva." />
    {!mode && <><Action label="PoC fotografia" onPress={() => setMode('photo')} /><Action label="PoC voz local" onPress={() => setMode('voice')} /></>}
    <Suspense fallback={<Status text="Carregando modalidade…" />}>{mode === 'photo' ? <Photo /> : mode === 'voice' ? <Voice /> : null}</Suspense>
    {mode && <Action label="Encerrar tentativa e voltar às PoCs" onPress={() => setMode(null)} />}
    <Status text="O manual permanece no aplicativo Aferi/BP Tracker separado. No Android, Sair encerra esta PoC; abra o app de homologação pelo ícone." />
    <Action label="Sair para o fluxo manual" onPress={openManual} />
    {manualStatus ? <Status text={manualStatus} /> : null}
  </ScrollView></SafeAreaView>;
}
