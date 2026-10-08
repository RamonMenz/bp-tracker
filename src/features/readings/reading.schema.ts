import { z } from 'zod';

import type { Reading, ReadingInput } from '@/types/models';

export const SYSTOLIC_MIN = 50;
export const SYSTOLIC_MAX = 300;
export const DIASTOLIC_MIN = 30;
export const DIASTOLIC_MAX = 200;
export const PULSE_MIN = 20;
export const PULSE_MAX = 250;
export const NOTE_MAX_LENGTH = 280;

/**
 * Tolerância para relógio adiantado. `measuredAt` vem do relógio do aparelho: sem folga, uma
 * medição salva num dispositivo alguns segundos adiantado passaria a falhar na validação de
 * leitura para sempre, sumindo do histórico.
 */
const FUTURE_TOLERANCE_MS = 60_000;

/**
 * Aceita `Date` ou qualquer objeto com `toDate()` — é o formato do `Timestamp` do Firestore,
 * reconhecido por duck typing para manter este módulo puro, sem importar o SDK.
 */
const dateLike = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const { toDate } = value as { toDate: unknown };

    if (typeof toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
  }

  return value;
}, z.date({ message: 'Data inválida.' }));

// Faixas compartilhadas entre o documento e cada leitura de `sessionReadings` — uma fonte só.
const systolicField = z
  .number({ message: 'Informe a sistólica.' })
  .int({ message: 'A sistólica deve ser um número inteiro.' })
  .min(SYSTOLIC_MIN, { message: `A sistólica deve ficar entre ${SYSTOLIC_MIN} e ${SYSTOLIC_MAX}.` })
  .max(SYSTOLIC_MAX, { message: `A sistólica deve ficar entre ${SYSTOLIC_MIN} e ${SYSTOLIC_MAX}.` });

const diastolicField = z
  .number({ message: 'Informe a diastólica.' })
  .int({ message: 'A diastólica deve ser um número inteiro.' })
  .min(DIASTOLIC_MIN, { message: `A diastólica deve ficar entre ${DIASTOLIC_MIN} e ${DIASTOLIC_MAX}.` })
  .max(DIASTOLIC_MAX, { message: `A diastólica deve ficar entre ${DIASTOLIC_MIN} e ${DIASTOLIC_MAX}.` });

const pulseField = z
  .number()
  .int({ message: 'O pulso deve ser um número inteiro.' })
  .min(PULSE_MIN, { message: `O pulso deve ficar entre ${PULSE_MIN} e ${PULSE_MAX}.` })
  .max(PULSE_MAX, { message: `O pulso deve ficar entre ${PULSE_MIN} e ${PULSE_MAX}.` })
  .nullish()
  .transform((value) => value ?? null);

const SYSTOLIC_GT_DIASTOLIC_RULE = {
  check: (reading: { systolic: number; diastolic: number }) => reading.systolic > reading.diastolic,
  message: 'A sistólica deve ser maior que a diastólica.',
};

const sessionReadingSchema = z
  .object({ systolic: systolicField, diastolic: diastolicField, pulse: pulseField })
  .refine(SYSTOLIC_GT_DIASTOLIC_RULE.check, {
    message: SYSTOLIC_GT_DIASTOLIC_RULE.message,
    path: ['systolic'],
  });

/**
 * As duas leituras individuais de uma sessão de duas medições; o documento guarda a média delas.
 * Ausente em documentos anteriores ao campo — `nullish` mantém esses documentos válidos.
 */
const sessionReadingsField = z
  .tuple([sessionReadingSchema, sessionReadingSchema], {
    message: 'Uma sessão deve ter exatamente duas leituras.',
  })
  .nullish()
  .transform((value) => value ?? null);

const readingShape = z.object({
  systolic: systolicField,
  diastolic: diastolicField,
  pulse: pulseField,

  measuredAt: dateLike.refine((value) => value.getTime() <= Date.now() + FUTURE_TOLERANCE_MS, {
    message: 'A data da medição não pode estar no futuro.',
  }),

  createdAt: dateLike,

  note: z
    .string()
    .max(NOTE_MAX_LENGTH, { message: `A observação deve ter no máximo ${NOTE_MAX_LENGTH} caracteres.` })
    .nullish()
    .transform((value) => value ?? null),

  source: z.literal('manual'),

  sessionReadings: sessionReadingsField,
});

export const readingSchema = readingShape.refine(SYSTOLIC_GT_DIASTOLIC_RULE.check, {
  message: SYSTOLIC_GT_DIASTOLIC_RULE.message,
  path: ['systolic'],
});

/**
 * Mesma validação de `readingSchema`, sem `createdAt` — no momento da criação esse campo ainda
 * não existe, é gerado no servidor (serverTimestamp), nunca fornecido pelo cliente.
 */
export const readingInputSchema = readingShape.omit({ createdAt: true }).refine(SYSTOLIC_GT_DIASTOLIC_RULE.check, {
  message: SYSTOLIC_GT_DIASTOLIC_RULE.message,
  path: ['systolic'],
});

/**
 * Único portão de entrada de dados do Firestore para o domínio: o documento é `unknown` até
 * passar por aqui — as security rules validam a escrita, não garantem o formato da leitura.
 */
export function parseReading(value: unknown): Reading {
  return readingSchema.parse(value);
}

/** Valida o candidato a nova medição antes de chegar no repositório. */
export function parseReadingInput(value: unknown): ReadingInput {
  return readingInputSchema.parse(value);
}
