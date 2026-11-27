import { useIsFocused } from 'expo-router';
import { useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { isWebVoiceEnabled, useAssistedWriteContext } from '@/features/assisted-entry/useAssistedWriteContext';
import type { AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';
import { hasLocalWebVoice } from '@/services/recognition/web-voice-capability.web';

import { loadVoiceRegistration } from './loadVoiceRegistration.web';
import type { VoiceEntryProps } from './VoiceEntry';

type Registration = typeof import('./VoiceRegistration.web').VoiceRegistration;

function AvailableVoiceEntry({ onSaved, getCurrentContext }: VoiceEntryProps & {
  getCurrentContext: () => AssistedWriteContext;
}) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [RegistrationView, setRegistrationView] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const active = useRef(false);
  const pending = useRef<Promise<unknown> | null>(null);

  useLayoutEffect(() => {
    active.current = true;
    let checking = true;
    void hasLocalWebVoice().then(available => {
      if (checking) setIsAvailable(available);
    });
    return () => {
      checking = false;
      active.current = false;
      pending.current = null;
    };
  }, []);

  function isCurrent(): boolean {
    const context = getCurrentContext();
    return active.current && context.uid !== null && context.hasConsent && context.persistenceEnabled;
  }

  function open() {
    if (pending.current || !isCurrent()) return;
    setHasLoadError(false);
    setIsLoading(true);
    const load = loadVoiceRegistration();
    pending.current = load;
    void load.then(
      ({ VoiceRegistration }) => {
        if (pending.current === load && isCurrent()) setRegistrationView(() => VoiceRegistration);
      },
      () => {
        if (pending.current === load && isCurrent()) setHasLoadError(true);
      },
    ).finally(() => {
      if (pending.current !== load) return;
      pending.current = null;
      if (active.current) setIsLoading(false);
    });
  }

  if (!isAvailable) return null;
  if (RegistrationView) {
    return <RegistrationView getCurrentContext={getCurrentContext}
      onClose={() => setRegistrationView(null)}
      onSaved={reading => {
        if (!isCurrent()) return;
        setRegistrationView(null);
        onSaved(reading);
      }} />;
  }
  return <>
    <Button label="Registrar por voz" variant="secondary" loading={isLoading} onPress={open} />
    {hasLoadError ? <Text accessibilityRole="alert">Não foi possível abrir o registro por voz. Tente novamente ou use o registro manual.</Text> : null}
  </>;
}

function FocusedVoiceEntry(props: VoiceEntryProps) {
  const isFocused = useIsFocused();
  const { sessionEpoch, canUseVoice, getCurrentContext } = useAssistedWriteContext();
  if (!isFocused || !canUseVoice || !sessionEpoch) return null;
  return <AvailableVoiceEntry key={sessionEpoch.id} getCurrentContext={getCurrentContext} {...props} />;
}

export function VoiceEntry(props: VoiceEntryProps) {
  return isWebVoiceEnabled() ? <FocusedVoiceEntry {...props} /> : null;
}
