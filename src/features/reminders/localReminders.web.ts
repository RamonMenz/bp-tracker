// Lembrete local via expo-notifications não tem suporte na web: o NotificationScheduler que o
// pacote resolve fora de Android/iOS é só `{ addListener: () => {}, removeListeners: () => {} }`
// (ver node_modules/expo-notifications/src/NotificationScheduler.ts) — sem
// getAllScheduledNotificationsAsync, scheduleNotificationAsync etc. Mesmo espírito de
// registerPushToken.web.ts: recusar de forma explícita em vez de deixar a chamada estourar.
//
// A diferença para registerPushToken.web.ts é que aqui não há nada para o usuário "fazer
// diferente" — o local é só um REFORÇO ao push (PLAN §3.5), nunca a fonte de verdade, e salvar os
// horários já teve sucesso no Firestore antes de chegar aqui (useReminderSettings.ts chama isto
// só depois de um `persist` que deu certo). Lançar erro faria o catch de
// syncLocalRemindersAfterSave (useReminderSettings.ts) pintar o campo `error` da tela com um falso
// negativo — "não foi possível agendar" por cima de um salvamento que funcionou. Resolver em
// silêncio é o comportamento correto, não um "ainda não implementado".
export async function syncLocalReminders(_times: string[]): Promise<void> {
  // Intencionalmente vazio.
}
