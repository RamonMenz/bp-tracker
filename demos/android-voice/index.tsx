import '../../global.css';

import { registerRootComponent } from 'expo';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { AndroidVoiceCaptureScreen } from '@/screens/AndroidVoiceCaptureScreen';
import { ManualReadingEvaluationScreen } from '@/screens/ManualReadingEvaluationScreen';
import type { AndroidVoiceDiagnostic } from '@/services/recognition/android-voice-session';

function AndroidVoiceEvaluation() {
  const [manual, setManual] = useState(false);
  const [voiceRelease, setVoiceRelease] = useState<'pending' | 'released' | 'failed'>('released');
  const [diagnostic, setDiagnostic] = useState<AndroidVoiceDiagnostic | null>(null);
  function openManual(release: Promise<boolean>) {
    setManual(true); setVoiceRelease('pending');
    void release.then(ok => setVoiceRelease(ok ? 'released' : 'failed'), () => setVoiceRelease('failed'));
  }
  return <SafeAreaProvider>{manual
    ? <ManualReadingEvaluationScreen voiceRelease={voiceRelease} onVoice={() => setManual(false)} />
    : <AndroidVoiceCaptureScreen onManual={openManual} onDiagnostic={setDiagnostic}>
        {diagnostic && <Text accessibilityLiveRegion="polite">
          Hipóteses distintas {diagnostic.count} · Concordância {diagnostic.agreed ? 'sim' : 'não'}
        </Text>}
      </AndroidVoiceCaptureScreen>}</SafeAreaProvider>;
}
registerRootComponent(AndroidVoiceEvaluation);
