import type { Timestamp } from 'firebase/firestore';

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
