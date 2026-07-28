// FCM na web exige service worker (public/firebase-messaging-sw.js) + VAPID key (PLAN §1.3) —
// nenhum dos dois existe ainda neste repositório. Preferível recusar com uma mensagem clara a
// pedir permissão de notificação do navegador para um recurso que não vai funcionar de verdade.
const WEB_NOT_SUPPORTED_MESSAGE =
  'Notificações push na web ainda não estão disponíveis. Use o app no Android para receber lembretes.';

export async function registerPushToken(_uid: string): Promise<void> {
  throw new Error(WEB_NOT_SUPPORTED_MESSAGE);
}
