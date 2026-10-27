import '../../global.css';

import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AndroidPhotoCaptureScreen } from '@/screens/AndroidPhotoCaptureScreen';

function AndroidCaptureEvaluation() {
  return <SafeAreaProvider><AndroidPhotoCaptureScreen /></SafeAreaProvider>;
}
registerRootComponent(AndroidCaptureEvaluation);
