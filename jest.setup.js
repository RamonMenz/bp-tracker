// @react-native-async-storage/async-storage não é mockado automaticamente pelo preset RN — a
// própria doc do pacote pede este setup manual (https://react-native-async-storage.github.io/
// async-storage/docs/advanced/jest). Sem isso, qualquer teste que importe (mesmo
// transitivamente, via src/services/firebase/firebase.native.ts) trava com
// "NativeModule: AsyncStorage is null", já que não existe módulo nativo real no ambiente de teste.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
