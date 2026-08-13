/**
 * No-op na web: `Notifications.useLastNotificationResponse()` chama
 * `NotificationsEmitterModule.getLastNotificationResponse` por baixo, que não tem implementação
 * web em expo-notifications — lança `UnavailabilityError` a cada render, sem try/catch possível
 * (é chamado no topo de app/_layout.tsx, fora de qualquer error boundary), derrubando a árvore
 * inteira antes do primeiro paint.
 *
 * Não é só um contorno: hoje não existe canal de push nem lembrete local implementado na web
 * (registerPushToken.web.ts recusa de propósito), então não há de onde um "toque em notificação"
 * viria para redirecionar — o no-op reflete o estado real da funcionalidade, não o esconde.
 */
export function useNotificationRedirect(): void {
  // Intencionalmente vazio.
}
