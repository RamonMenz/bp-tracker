// Service worker do FCM na web.
//
// POR QUE ESTE ARQUIVO É .js E NÃO .ts: ele não passa pelo Metro nem pelo tsc — é copiado
// literalmente de public/ para a raiz do output (dist/) pelo `expo export -p web` e servido
// como está. O FCM exige que ele fique na RAIZ do domínio (/firebase-messaging-sw.js): o escopo
// de um service worker é limitado ao diretório onde ele é servido, então em subpasta o
// firebase-messaging não consegue registrá-lo.
//
// POR QUE A CONFIG VEM POR QUERY STRING: um service worker não enxerga process.env nem
// expoConfig.extra — ele roda fora do bundle. As duas saídas usuais são cravar a config aqui
// (duplicando valores que já vivem no .env.local) ou passá-la no register(). A segunda mantém
// UMA fonte de verdade e é a usada aqui:
//
//   const params = new URLSearchParams({ apiKey, projectId, appId, messagingSenderId });
//   navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`);
//
// Nada aqui é segredo: a config web do Firebase é pública por design (CLAUDE.md §4.4) — o que
// protege os dados são as Security Rules + App Check.
//
// ⚠️ ESTE ARQUIVO ESTÁ INERTE HOJE: nenhum código do app chama
// navigator.serviceWorker.register(). src/features/reminders/registerPushToken.web.ts recusa
// ativar push na web de propósito. Enquanto ele não for implementado, este SW nunca é
// registrado e push na web não funciona — ver o resumo da tarefa.

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  appId: params.get('appId'),
  messagingSenderId: params.get('messagingSenderId'),
};

// Sem config não dá para inicializar. Falha alto no console do SW em vez de registrar um worker
// mudo que "existe" mas nunca entrega notificação nenhuma.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => value === null || value === '')
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(
    `[firebase-messaging-sw] Config ausente na query string: ${missing.join(', ')}. ` +
      'O SW precisa ser registrado com os parâmetros do projeto Firebase.',
  );
} else {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // Só dispara com o app em segundo plano/fechado. Com o app em primeiro plano quem trata é o
  // onMessage do cliente — se os dois mostrassem, o usuário veria a notificação duplicada.
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'Hora de medir sua pressão';
    const body = payload.notification?.body ?? 'Toque para registrar agora.';

    // Mesmo campo `data.deeplink` que o dispatchReminders envia e que o
    // useNotificationRedirect consome no nativo — aqui vira a URL aberta no clique.
    const deeplink = payload.data?.deeplink;

    self.registration.showNotification(title, {
      body,
      // Reaproveita o favicon já publicado na raiz do output pelo expo export.
      icon: '/favicon.ico',
      tag: 'bp-tracker-reminder',
      data: { deeplink },
    });
  });
}

// Foca uma aba já aberta em vez de abrir outra a cada clique.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = '/?autoFocus=systolic';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetPath).then((navigated) => navigated?.focus());
          }
          return client.focus();
        }
      }

      return self.clients.openWindow(targetPath);
    }),
  );
});
