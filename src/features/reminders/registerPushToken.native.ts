import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { devicesCollectionPath } from '@/lib/firestore-paths';
import { hashToken } from '@/lib/hash-token';
import { firestore } from '@/services/firebase';

const PERMISSION_DENIED_MESSAGE = 'Permita notificações nas configurações do aparelho para receber lembretes.';
const GENERIC_MESSAGE = 'Não foi possível ativar as notificações. Tente novamente.';

const ANDROID_CHANNEL_ID = 'reminders';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Lembretes de medição',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Token NATIVO do FCM/APNs (`getDevicePushTokenAsync`), não o Expo push token
 * (`getExpoPushTokenAsync`) — o backend despacha via `firebase-admin/messaging`
 * `sendEachForMulticast`, que só aceita tokens de registro nativos.
 */
export async function registerPushToken(uid: string): Promise<void> {
  try {
    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    const finalStatus =
      current.status === Notifications.PermissionStatus.GRANTED
        ? current.status
        : (await Notifications.requestPermissionsAsync()).status;

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      throw new Error(PERMISSION_DENIED_MESSAGE);
    }

    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const tokenHash = hashToken(devicePushToken.data);

    await setDoc(
      doc(firestore, devicesCollectionPath(uid), tokenHash),
      {
        token: devicePushToken.data,
        platform: devicePushToken.type,
        lastSeenAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    if (error instanceof Error && error.message === PERMISSION_DENIED_MESSAGE) {
      throw error;
    }

    throw new Error(GENERIC_MESSAGE);
  }
}
