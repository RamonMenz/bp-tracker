/**
 * No-op na web: `Notifications.useLastNotificationResponse()` chama
 * `NotificationsEmitterModule.getLastNotificationResponse` por baixo, que não tem implementação
 * web em expo-notifications — lança `UnavailabilityError` a cada render, sem try/catch possível
 * (é chamado no topo de app/_layout.tsx, fora de qualquer error boundary), derrubando a árvore
 * inteira antes do primeiro paint. Essa limitação é do pacote, não muda com o que o app usa para
 * push.
 *
 * O toque em notificação NA WEB já tem redirecionamento próprio, só que fora deste hook: quando a
 * aba está em segundo plano/fechada, é o `notificationclick` do service worker (public/firebase-
 * messaging-sw.js) que navega; em primeiro plano, é `useForegroundPush.web.ts` (a notificação que
 * ele mostra tem o próprio `onclick`). Os dois casos cobertos por `useNotificationRedirect` no
 * nativo (toque em segundo plano + cold start) não têm um equivalente web único porque a origem
 * do toque já é outro código em cada caso — daí este hook continuar sem nada a fazer aqui.
 */
export function useNotificationRedirect(): void {
  // Intencionalmente vazio.
}
