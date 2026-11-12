import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ComponentType, Ref } from 'react';
import { PermissionsAndroid, type NativeSyntheticEvent, type ViewProps } from 'react-native';

import { PhotoCaptureError, type AndroidCameraHandle } from './photo-capture-contract';

export interface CameraPreviewProps extends ViewProps {
  ref?: Ref<AndroidCameraHandle>;
  active: boolean;
  attemptId: number;
  onStatus: (event: NativeSyntheticEvent<{ status: string; attemptId: number }>) => void;
}
export interface AndroidPhotoBinding {
  nativeRevision?: 'preview-1' | 'frame-1' | 'anterior';
  requestPermission(): Promise<boolean>;
  Camera: ComponentType<CameraPreviewProps>;
}
/** Executar somente ao entrar explicitamente na modalidade Android. */
export function loadAndroidPhotoBinding(onPermissionRoute?: (route: 'already-granted' | 'request-required') => void): AndroidPhotoBinding {
  const native = requireOptionalNativeModule<{ captureRevision?: unknown; requestCameraPermission(): Promise<boolean> }>('AferiPhotoCapture');
  if (!native) throw new PhotoCaptureError('unsupported');
  return { nativeRevision: native.captureRevision === 'preview-1' || native.captureRevision === 'frame-1'
    ? native.captureRevision : 'anterior',
    requestPermission: async () => {
      // Consultar nao abre Activity/dialogo nem inicia camera. Reutilizar o aceite
      // atual evita pedir novamente e interromper a tentativa por AppState.
      if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)) {
        onPermissionRoute?.('already-granted');
        return true;
      }
      onPermissionRoute?.('request-required');
      return native.requestCameraPermission();
    },
    Camera: requireNativeView<CameraPreviewProps>('AferiPhotoCapture') };
}
