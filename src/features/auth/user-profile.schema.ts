import { z } from 'zod';

import type { AcceptedPrivacyConsent } from '@/types/models';

/**
 * Schema PARCIAL de `users/{uid}`: só o que o gate de consentimento lê. Os outros leitores do
 * perfil (reminders.repo.ts, triggers das Functions) ainda validam campo a campo — migrá-los para
 * cá é outra tarefa, não esta. Campos não declarados são descartados pelo Zod, não rejeitados.
 */

/**
 * Aceita `Date` ou qualquer objeto com `toDate()` — o `Timestamp` do Firestore, reconhecido por
 * duck typing para não importar o SDK aqui (mesmo desenho de reading.schema.ts).
 */
const timestampLike = z.preprocess((value) => {
  if (typeof value === 'object' && value !== null && !(value instanceof Date) && 'toDate' in value) {
    const { toDate } = value as { toDate: unknown };

    if (typeof toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
  }

  return value;
}, z.date());

const privacyConsentSchema = z.object({
  version: z.string().min(1).max(32),
  acceptedAt: timestampLike,
});

const userProfileConsentSchema = z.object({
  privacyConsent: privacyConsentSchema.optional(),
});

/**
 * Único portão de leitura do aceite. Documento ausente, campo ausente ou formato inválido viram
 * `null` — "não há aceite válido" —, nunca exceção: na dúvida o gate pede o consentimento de novo,
 * o lado seguro para dado de saúde.
 */
export function parsePrivacyConsent(profile: unknown): AcceptedPrivacyConsent | null {
  const result = userProfileConsentSchema.safeParse(profile ?? {});

  if (!result.success) {
    return null;
  }

  return result.data.privacyConsent ?? null;
}
