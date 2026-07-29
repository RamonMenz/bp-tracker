import type { Persistence, ReactNativeAsyncStorage } from '@firebase/auth';

/**
 * `getReactNativePersistence` só existe na build RN de `@firebase/auth` (arquivo servido pela
 * condição "react-native" do package.json). O `tsc` resolve a chave "types" do mapa de exports
 * antes de considerar customConditions — ela aponta pros typings genéricos, que não têm essa
 * função — mesmo com `customConditions: ["react-native"]` no tsconfig (herdado de
 * expo/tsconfig.base). O Metro, que resolve o JS de runtime (não os typings), não usa a condição
 * "types" e já pega a build RN certa — então em runtime a função sempre existiu; faltava só o
 * tipo. Augmentation mínima só pra essa função, não pro módulo inteiro.
 */
declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
