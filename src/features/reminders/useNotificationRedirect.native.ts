import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

const RECORD_DEEPLINK = 'bptracker://record';

/**
 * `useLastNotificationResponse` cobre os dois casos num só hook: toque com o app aberto em
 * segundo plano E abertura a frio a partir do toque (cold start) — ver exemplo oficial do
 * expo-notifications. Local (`localReminders.native.ts`) e push (`dispatchReminders` no backend) usam
 * o mesmo campo `data.deeplink`, então o mesmo tratamento cobre as duas origens.
 */
export function useNotificationRedirect(): void {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const deeplink = lastResponse?.notification.request.content.data?.deeplink;

    if (typeof deeplink === 'string' && deeplink === RECORD_DEEPLINK) {
      router.push({ pathname: '/(app)', params: { autoFocus: 'systolic' } });
    }
  }, [lastResponse, router]);
}
