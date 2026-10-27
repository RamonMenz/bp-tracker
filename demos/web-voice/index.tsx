import '../../global.css';

import { registerRootComponent } from 'expo';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebVoiceCaptureScreen } from '@/screens/WebVoiceCaptureScreen.web';
import { WEB_VOICE_MESSAGES } from '@/services/recognition/web-voice.web';
import { ManualReadingEvaluationScreen } from '@/screens/ManualReadingEvaluationScreen';

function WebVoiceEvaluation() {
  const [manual, setManual] = useState(false);
  const [voiceRelease, setVoiceRelease] = useState<'pending' | 'released' | 'failed'>('released');
  function openManual(release: Promise<boolean>) {
    setManual(true); setVoiceRelease('pending');
    void release.then(ok => setVoiceRelease(ok ? 'released' : 'failed'), () => setVoiceRelease('failed'));
  }
  return <SafeAreaProvider>{manual
    ? <ManualReadingEvaluationScreen cleanupNotice={WEB_VOICE_MESSAGES['cleanup-failed']} voiceRelease={voiceRelease} onVoice={() => setManual(false)} />
    : <WebVoiceCaptureScreen onManual={openManual} />}</SafeAreaProvider>;
}
registerRootComponent(WebVoiceEvaluation);
