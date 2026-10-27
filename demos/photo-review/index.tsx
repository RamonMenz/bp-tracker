import '../../global.css';

import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistedReviewDemoScreen } from '@/screens/AssistedReviewDemoScreen';

function PhotoReviewDemo() {
  return <SafeAreaProvider><AssistedReviewDemoScreen /></SafeAreaProvider>;
}
registerRootComponent(PhotoReviewDemo);
