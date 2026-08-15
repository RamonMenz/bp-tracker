/**
 * No-op no nativo: o SO mostra a notificação de push independente do app estar em primeiro
 * plano ou não — é a web que precisa de um `onMessage()` explícito (firebase/messaging não roda
 * "em segundo plano" fora de um service worker, e a aba não tem chrome de notificação próprio).
 * expo-notifications não expõe um handler de foreground customizado neste projeto hoje (nenhum
 * `setNotificationHandler` configurado), então o comportamento padrão do SO já é suficiente.
 */
export function useForegroundPush(): void {
  // Intencionalmente vazio.
}
