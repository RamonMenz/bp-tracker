import '../../global.css';

import { registerRootComponent } from 'expo';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AndroidVoiceCaptureScreen } from '@/screens/AndroidVoiceCaptureScreen';
import { ManualReadingEvaluationScreen } from '@/screens/ManualReadingEvaluationScreen';

function AndroidVoiceEvaluation() {
  const [manual, setManual] = useState(false);
  const [voiceRelease, setVoiceRelease] = useState<'pending' | 'released' | 'failed'>('released');
  function openManual(release: Promise<boolean>) {
    setManual(true); setVoiceRelease('pending');
    void release.then(ok => setVoiceRelease(ok ? 'released' : 'failed'), () => setVoiceRelease('failed'));
  }
  return <SafeAreaProvider>{manual
    ? <ManualReadingEvaluationScreen voiceRelease={voiceRelease} onVoice={() => setManual(false)} />
    : <AndroidVoiceCaptureScreen onManual={openManual} />}</SafeAreaProvider>;
}
registerRootComponent(AndroidVoiceEvaluation);
