export type PhotoCaptureCode = 'unsupported' | 'permission-denied' | 'camera-failed'
  | 'frame-failed' | 'engine-failed' | 'resource-busy' | 'cleanup-failed' | 'timeout' | 'cancelled' | 'device-unavailable';
export class PhotoCaptureError extends Error {
  constructor(readonly code: PhotoCaptureCode) { super(code); this.name = 'PhotoCaptureError'; }
}
export interface AndroidCameraHandle {
  recognize(): Promise<unknown>;
  cancelCapture(): Promise<boolean>;
}
export interface AndroidPhotoPorts {
  requestPermission(): Promise<boolean>;
  open(attemptId: number): void;
  recognize(): Promise<unknown>;
  close(): Promise<boolean>;
}
export const PHOTO_MESSAGES: Record<PhotoCaptureCode, string> = {
  unsupported: 'Captura Android indisponível. Compile o Dev Client de avaliação; Expo Go não atende.',
  'permission-denied': 'Permissão de câmera negada. Você pode voltar ou ajustar a permissão e tentar novamente.',
  'device-unavailable': 'Câmera indisponível. Tente novamente ou volte ao manual.',
  'camera-failed': 'Não foi possível preparar a câmera. Tente novamente ou volte ao manual.',
  'frame-failed': 'O quadro não pôde ser lido em memória. Tente outro enquadramento.',
  'engine-failed': 'Não foi possível interpretar esta captura. Tente novamente ou preencha manualmente.',
  'resource-busy': 'O reconhecedor ainda está liberando recursos. Aguarde antes de tentar novamente.',
  'cleanup-failed': 'Não foi possível comprovar a liberação dos recursos. Saia deste fluxo antes de tentar novamente.',
  timeout: 'O limite experimental foi atingido. A tentativa foi encerrada.',
  cancelled: 'Captura cancelada; resultado descartado.',
};
