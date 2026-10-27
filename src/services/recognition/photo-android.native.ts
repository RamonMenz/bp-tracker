import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ComponentType, Ref } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

import { PhotoCaptureError, type AndroidCameraHandle } from './photo-capture-contract';

export interface CameraPreviewProps extends ViewProps {
  ref?: Ref<AndroidCameraHandle>;
  active: boolean;
  attemptId: number;
  onStatus: (event: NativeSyntheticEvent<{ status: string; attemptId: number }>) => void;
}
export interface AndroidPhotoBinding {
  requestPermission(): Promise<boolean>;
  Camera: ComponentType<CameraPreviewProps>;
}
/** Executar somente ao entrar explicitamente na modalidade Android. */
export function loadAndroidPhotoBinding(): AndroidPhotoBinding {
  const native = requireOptionalNativeModule<{ requestCameraPermission(): Promise<boolean> }>('AferiPhotoCapture');
  if (!native) throw new PhotoCaptureError('unsupported');
  return { requestPermission: () => native.requestCameraPermission(),
    Camera: requireNativeView<CameraPreviewProps>('AferiPhotoCapture') };
}
