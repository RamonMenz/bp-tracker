import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid } from 'react-native';

import { loadAndroidPhotoBinding } from './photo-android.native';

jest.mock('expo', () => ({
  requireNativeView: jest.fn(() => () => null),
  requireOptionalNativeModule: jest.fn(),
}), { virtual: true });
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
});
afterEach(() => jest.restoreAllMocks());
function setup() {
  const requestCameraPermission = jest.fn(async () => true);
  jest.mocked(requireOptionalNativeModule).mockReturnValue({ requestCameraPermission });
  const route = jest.fn();
  const binding = loadAndroidPhotoBinding(route);
  return { binding, route, requestCameraPermission };
}

test('carregar binding nao verifica nem solicita permissao ou abre captura', () => {
  const t = setup();
  expect(PermissionsAndroid.check).not.toHaveBeenCalled();
  expect(t.requestCameraPermission).not.toHaveBeenCalled();
  expect(requireNativeView).toHaveBeenCalledWith('AferiPhotoCapture');
  expect(t.binding.nativeRevision).toBe('anterior');
});

test.each(['frame-1', 'preview-1'])('identifica a revisao %s do APK sem capturar ou solicitar permissao', revision => {
  jest.mocked(requireOptionalNativeModule).mockReturnValue({ captureRevision: revision, requestCameraPermission: jest.fn() });
  expect(loadAndroidPhotoBinding().nativeRevision).toBe(revision);
  expect(PermissionsAndroid.check).not.toHaveBeenCalled();
});

test('nao exibe constante nativa arbitraria', () => {
  jest.mocked(requireOptionalNativeModule).mockReturnValue({ captureRevision: 'SENTINELA', requestCameraPermission: jest.fn() });
  expect(loadAndroidPhotoBinding().nativeRevision).toBe('anterior');
});

test('permissao ja concedida evita a solicitacao nativa e outro dialogo', async () => {
  const t = setup(); jest.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  expect(await t.binding.requestPermission()).toBe(true);
  expect(PermissionsAndroid.check).toHaveBeenCalledWith('android.permission.CAMERA');
  expect(t.requestCameraPermission).not.toHaveBeenCalled();
  expect(t.route).toHaveBeenCalledWith('already-granted');
});

test('sem permissao solicita uma vez e retorna o resultado real', async () => {
  const t = setup(); jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  expect(await t.binding.requestPermission()).toBe(true);
  expect(t.requestCameraPermission).toHaveBeenCalledTimes(1);
  expect(t.route).toHaveBeenCalledWith('request-required');
});

test('recusa continua falsa sem retry automatico', async () => {
  const t = setup(); jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  t.requestCameraPermission.mockResolvedValue(false);
  expect(await t.binding.requestPermission()).toBe(false);
  expect(t.requestCameraPermission).toHaveBeenCalledTimes(1);
});

test('falha na consulta nao inicia dialogo como fallback', async () => {
  const t = setup(); jest.mocked(PermissionsAndroid.check).mockRejectedValue(new Error('query-failed'));
  await expect(t.binding.requestPermission()).rejects.toThrow('query-failed');
  expect(t.requestCameraPermission).not.toHaveBeenCalled();
});

test('aceite anterior nao e cacheado: revogacao entre tentativas volta a ser verificada', async () => {
  const t = setup();
  jest.mocked(PermissionsAndroid.check).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  t.requestCameraPermission.mockResolvedValue(false);
  expect(await t.binding.requestPermission()).toBe(true);
  expect(await t.binding.requestPermission()).toBe(false);
  expect(PermissionsAndroid.check).toHaveBeenCalledTimes(2);
  expect(t.requestCameraPermission).toHaveBeenCalledTimes(1);
});
