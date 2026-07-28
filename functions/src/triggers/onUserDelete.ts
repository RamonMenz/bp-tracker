import { getFirestore } from 'firebase-admin/firestore';
import * as functionsV1 from 'firebase-functions/v1';
import { logger } from 'firebase-functions/v2';

import { schedulePath } from '../lib/schedules';

// Este é o ÚNICO arquivo do projeto em Functions v1, e é por necessidade: o gatilho de exclusão
// de usuário do Auth não existe na v2 — `firebase-functions/v2/identity` só expõe funções
// blocking (beforeUserCreated / beforeUserSignedIn), que rodam ANTES da operação e não cobrem
// exclusão. v1 e v2 coexistem no mesmo codebase sem conflito.
const REGION = 'southamerica-east1';

function userPath(uid: string): string {
  return `users/${uid}`;
}

export const onUserDelete = functionsV1
  .region(REGION)
  .runWith({
    // Retry automático. Dado de saúde órfão é uma falha de LGPD, não um inconveniente: se a
    // exclusão falhar por erro transitório, o usuário já foi informado de que seus dados foram
    // apagados. Melhor reexecutar do que deixar o dado para trás silenciosamente.
    failurePolicy: true,
  })
  .auth.user()
  .onDelete(async (user) => {
    const { uid } = user;
    const db = getFirestore();

    // `recursiveDelete` cobre o documento E todas as subcoleções (readings, devices) — um
    // `delete()` simples no documento deixaria as subcoleções intactas e invisíveis, porque no
    // Firestore subcoleção não é apagada junto com o pai.
    await db.recursiveDelete(db.doc(userPath(uid)));

    // Fora da árvore de users/, então precisa ser apagado à parte. Sem isso o usuário excluído
    // continuaria no índice do cron e receberia push de lembrete.
    await db.doc(schedulePath(uid)).delete();

    logger.info('dados do usuário excluídos', { uid });
  });
