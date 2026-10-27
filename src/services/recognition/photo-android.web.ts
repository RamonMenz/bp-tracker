import { PhotoCaptureError } from './photo-capture-contract';
import type { AndroidPhotoBinding } from './photo-android.native';

// Nenhum módulo nativo/câmera é inicializado no bundle Web.
export function loadAndroidPhotoBinding(): AndroidPhotoBinding { throw new PhotoCaptureError('unsupported'); }
