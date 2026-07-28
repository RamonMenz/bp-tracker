import type { Timestamp } from 'firebase/firestore';

/**
 * A categoria (normal/elevada/estágio…) NÃO faz parte do modelo: é derivada de
 * (systolic, diastolic) por `domain/bp-classification.ts` e nunca persistida.
 *
 * `measuredAt`/`createdAt` são `Date` no domínio — a conversão a partir do `Timestamp` do
 * Firestore acontece no schema Zod, mantendo o domínio livre do SDK.
 */
export interface Reading {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: Date;
  createdAt: Date;
  note: string | null;
  source: 'manual';
}

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  timezone: string;
  notificationsEnabled: boolean;
  reminderTimes: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
