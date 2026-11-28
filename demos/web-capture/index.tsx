import '../../global.css';

import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DemoRoot } from './DemoRoot';

function WebCaptureEvaluation() { return <SafeAreaProvider><DemoRoot /></SafeAreaProvider>; }
registerRootComponent(WebCaptureEvaluation);
