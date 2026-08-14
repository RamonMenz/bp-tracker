import { initAppCheck } from './appCheck';

// O Metro resolve './firebase' para firebase.native.ts ou firebase.web.ts conforme a plataforma —
// é o que mantém a diferença de plataforma fora do código de aplicação (CLAUDE.md §3.3).
export { app, auth, firestore } from './firebase';

/**
 * Roda na avaliação deste módulo, de propósito: `services/firebase` é o ÚNICO caminho por onde o
 * resto do app chega em `auth`/`firestore` (CLAUDE.md §3.2, regra 5 — nenhum repositório importa
 * `./firebase` direto), então este é o ponto mais cedo possível para inicializar o App Check.
 * Adiar isso para um efeito de tela deixaria a primeira leitura/escrita já sair sem o header
 * `X-Firebase-AppCheck` — exatamente o que o comentário de `initAppCheck` avisa. `initAppCheck`
 * nunca lança (retorna `null` e já loga sozinho via `logError('appCheck.init', ...)` quando não dá
 * para inicializar), então não há nada a tratar aqui.
 */
initAppCheck();
