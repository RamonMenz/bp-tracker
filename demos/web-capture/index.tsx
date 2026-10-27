import '../../global.css';

import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebPhotoCaptureScreen } from '@/screens/WebPhotoCaptureScreen.web';

function WebCaptureEvaluation() { return <SafeAreaProvider><WebPhotoCaptureScreen /></SafeAreaProvider>; }
registerRootComponent(WebCaptureEvaluation);
