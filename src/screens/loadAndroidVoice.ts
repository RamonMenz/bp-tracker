export function loadAndroidVoiceCapability() {
  return import('@/services/recognition/voice-android.native');
}

export function loadAndroidVoiceRegistration() {
  return import('./AndroidVoiceRegistration');
}
