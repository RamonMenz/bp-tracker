import { useRouter } from 'expo-router';
import { onMessage } from 'firebase/messaging';
import { useEffect } from 'react';

import { getMessagingInstance } from '@/services/firebase/firebase.web';

const TITLE = 'Hora de medir sua pressão';
const BODY = 'Toque para registrar agora.';

/**
 * FCM não mostra nada sozinho para uma aba em primeiro plano — comportamento documentado do SDK,
 * não um bug: `onBackgroundMessage` (registrado no service worker, ver public/firebase-messaging-
 * sw.js) só roda com a aba em segundo plano ou fechada. Quem está com a aba aberta bem na hora do
 * lembrete só recebe o payload via `onMessage()`, sem nenhuma UI própria — sem este hook, o
 * lembrete chega e não acontece nada visível até a pessoa recarregar ou trocar de aba.
 *
 * Mesmo título/corpo que `localReminders.native.ts` e a Cloud Function usam, disparado como a
 * MESMA `Notification` do navegador que o service worker mostraria em segundo plano — não um
 * toast interno novo: o app não tem um sistema de toast global montado hoje (`InlineFeedback` é
 * ancorado a uma tela, não um overlay persistente), e construir um só para este caso seria
 * infraestrutura nova para algo que a própria Notification API já resolve.
 */
export function useForegroundPush(): void {
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // Guarda contra desmontar antes de getMessagingInstance() resolver: sem isso, um cleanup que
    // rodasse ANTES da promise resolver não teria unsubscribe nenhum para chamar, e o onMessage
    // registrado logo depois vazaria — a mesma classe de bug que o CLAUDE.md §3.4 pede para evitar.
    let cancelled = false;

    getMessagingInstance().then((messaging) => {
      if (cancelled || messaging === null) {
        return;
      }

      unsubscribe = onMessage(messaging, () => {
        showForegroundNotification(() => {
          router.push({ pathname: '/(app)', params: { autoFocus: 'systolic' } });
        });
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);
}

/**
 * O conteúdo da mensagem (payload.notification) não entra aqui de propósito: title/body vêm fixos
 * do próprio cliente, igual ao local nativo — dado de pressão é sensível (CLAUDE.md §4.4), e o
 * texto do lembrete nunca carrega valor de medição nenhum.
 */
function showForegroundNotification(onClick: () => void): void {
  // Guarda dupla: sem suporte a Notification (não deveria acontecer aqui — getMessagingInstance()
  // já garantiu suporte a Push API antes de chegar neste ponto) ou permissão não concedida
  // (revogada nas configurações do navegador depois do registro do token).
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(TITLE, {
    body: BODY,
    icon: '/favicon.ico',
    tag: 'bp-tracker-reminder',
  });

  notification.onclick = () => {
    notification.close();
    onClick();
    window.focus();
  };
}
