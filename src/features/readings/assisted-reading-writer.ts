import { createAssistedConfirmation, type AssistedWriteContext } from './confirmed-assisted-reading';

/** Composição preparada para a futura tela autenticada, ainda não montada no app.
 * O chamador deve manter persistenceEnabled=false até homologação segura e
 * fornecer UID, epoch e aceite atuais. Demonstrações não importam este módulo.
 */
export function prepareAssistedReadingWriter(currentContext: () => AssistedWriteContext) {
  return createAssistedConfirmation({
    currentContext,
    loadWriter: async () => {
      // require tardio é suportado pelo Metro e pelo Jest: não avaliar Firebase
      // no import desta porta, nem antes do gesto explícito de confirmação.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addReading } = require('./readings.repo') as typeof import('./readings.repo');
      return addReading;
    },
  });
}
