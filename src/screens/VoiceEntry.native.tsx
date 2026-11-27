import { useIsFocused } from 'expo-router';
import { useLayoutEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { isAndroidVoiceEnabled, useAssistedWriteContext } from '@/features/assisted-entry/useAssistedWriteContext';
import type { AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';

import type { VoiceEntryProps } from './VoiceEntry.types';
import { loadAndroidVoiceCapability, loadAndroidVoiceRegistration } from './loadAndroidVoice';

export type { VoiceEntryProps } from './VoiceEntry.types';

type Registration = typeof import('./AndroidVoiceRegistration').AndroidVoiceRegistration;
type Availability = 'unchecked' | 'unavailable' | 'ready';
type PendingAction = { cancel?: () => Promise<boolean> };

function AvailableVoiceEntry({ onSaved, getCurrentContext }: VoiceEntryProps & {
  getCurrentContext: () => AssistedWriteContext;
}) {
  const [availability, setAvailability] = useState<Availability>('unchecked');
  const [RegistrationView, setRegistrationView] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const active = useRef(false);
  const pending = useRef<PendingAction | null>(null);

  useLayoutEffect(() => {
    active.current = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    function invalidate() {
      active.current = false;
      const action = pending.current;
      pending.current = null;
      // O módulo fecha sua consulta por ID e bloqueia novos usos se a liberação falhar.
      void action?.cancel?.().catch(() => false);
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        active.current = true;
      } else {
        invalidate();
        setAvailability('unchecked');
        setRegistrationView(null);
        setIsLoading(false);
        setHasLoadError(false);
      }
    });
    return () => { invalidate(); subscription.remove(); };
  }, []);

  function currentContext(): AssistedWriteContext {
    const context = getCurrentContext();
    return active.current ? context : { ...context, hasConsent: false };
  }

  function isCurrent(): boolean {
    const context = currentContext();
    return context.uid !== null && context.hasConsent && context.persistenceEnabled;
  }

  async function run(task: (action: PendingAction) => Promise<void>) {
    if (pending.current || !isCurrent()) return;
    const action: PendingAction = {};
    pending.current = action;
    setIsLoading(true);
    try {
      await task(action);
    } finally {
      if (pending.current === action) {
        pending.current = null;
        setIsLoading(false);
      }
    }
  }

  function isPending(action: PendingAction) {
    return pending.current === action && isCurrent();
  }

  function verify() {
    void run(async action => {
      try {
        const { checkAndroidVoiceCapability } = await loadAndroidVoiceCapability();
        if (!isPending(action)) return;
        const check = checkAndroidVoiceCapability();
        action.cancel = check.cancel;
        const ready = await check.result;
        if (isPending(action)) setAvailability(ready ? 'ready' : 'unavailable');
      } catch {
        if (isPending(action)) setAvailability('unavailable');
      }
    });
  }

  function open() {
    void run(async action => {
      setHasLoadError(false);
      try {
        const { AndroidVoiceRegistration } = await loadAndroidVoiceRegistration();
        if (isPending(action)) setRegistrationView(() => AndroidVoiceRegistration);
      } catch {
        if (isPending(action)) setHasLoadError(true);
      }
    });
  }

  if (RegistrationView) {
    return <RegistrationView getCurrentContext={currentContext}
      onClose={capabilityLost => {
        if (capabilityLost) setAvailability('unavailable');
        setRegistrationView(null);
      }}
      onSaved={reading => {
        if (!isCurrent()) return;
        setRegistrationView(null);
        onSaved(reading);
      }} />;
  }
  if (availability === 'ready') {
    return <>
      <Button label="Registrar por voz" variant="secondary" loading={isLoading} onPress={open} />
      {hasLoadError ? <Text accessibilityRole="alert">Não foi possível abrir o registro por voz. Tente novamente ou use o registro manual.</Text> : null}
    </>;
  }
  return <>
    {availability === 'unavailable' ? <Text accessibilityRole="alert">Voz local em português (Brasil) indisponível neste aparelho. Use o registro manual.</Text> : null}
    <Button label="Verificar voz local" variant="secondary" loading={isLoading} onPress={verify} />
  </>;
}

function FocusedVoiceEntry(props: VoiceEntryProps) {
  const isFocused = useIsFocused();
  const { sessionEpoch, canUseVoice, getCurrentContext } = useAssistedWriteContext(isAndroidVoiceEnabled);
  if (!isFocused || !canUseVoice || !sessionEpoch) return null;
  return <AvailableVoiceEntry key={sessionEpoch.id} getCurrentContext={getCurrentContext} {...props} />;
}

export function VoiceEntry(props: VoiceEntryProps) {
  return Platform.OS === 'android' && isAndroidVoiceEnabled() ? <FocusedVoiceEntry {...props} /> : null;
}
