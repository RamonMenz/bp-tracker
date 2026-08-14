# Prompts de Desenvolvimento — Funcionalidades Pendentes

> Um prompt autocontido por item de [`plano_de_funcionalidades.md`](./plano_de_funcionalidades.md),
> na ordem de execução proposta lá. Cada prompt pode ser colado direto numa sessão nova do Claude
> Code — não depende de memória de conversa anterior, só do estado do repositório nesta branch.
> Mesma convenção de [`prompts_correcoes.md`](./prompts_correcoes.md): seguir `CLAUDE.md`
> (TypeScript estrito, sem `any`, Zod para dado do Firestore, `@/` em vez de `../../../`, exports
> nomeados, mudanças cirúrgicas, um commit semântico por item, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit).
>
> Cada prompt indica um **modelo recomendado**. O critério: prompts mecânicos, com passo a passo
> já totalmente especificado e baixa ambiguidade de projeto, usam um modelo mais leve/rápido;
> prompts que exigem decisão de arquitetura, UX ou trade-off (onde o "jeito certo de fazer" não
> está 100% definido no prompt) usam um modelo com mais raciocínio.

| Modelo | Quando usar aqui |
|---|---|
| **Claude Haiku 4.5** | Mudança mecânica, passo a passo fechado, sem decisão de design em aberto. |
| **Claude Sonnet 5** | Feature de tamanho médio seguindo padrão já existente no código (repo/hook/tela espelhando algo que já existe). |
| **Claude Opus 5** | Decisão de arquitetura, UX nova sem precedente no app, ou integração de dependência nativa nova que exige julgamento. |

---

## Funcionalidade 1 — Edição de medição (CRUD incompleto)

### Prompt 1.1 — Camada de dados: `updateReading` + `useUpdateReading`

```
Contexto: no BP Tracker (React Native/Expo), o CRUD de medições tem create, read e delete, mas
falta update. As firestore.rules (match /readings/{readingId}, "allow update") já aceitam a
escrita — a lacuna é só no cliente. Ver plano_de_funcionalidades.md, item 1, para o levantamento
completo.

Tarefa:
1. Em src/features/readings/readings.repo.ts, adicione:
   export async function updateReading(uid: string, readingId: string, input: ReadingInput):
   Promise<void>
   - Use updateDoc(doc(firestore, readingDocPath(uid, readingId)), input).
   - Espelhe o tratamento de erro de addReading (permission-denied → mensagem amigável,
     unavailable → mensagem de rede, genérico → mensagem genérica) e de deleteReading (logError
     no catch, CLAUDE.md §4.3/§4.5). Reaproveite as constantes de mensagem já existentes no
     arquivo quando o texto for idêntico; crie novas só se o texto precisar ser diferente.
2. Crie src/features/readings/useUpdateReading.ts, espelhando a forma de useAddReading.ts:
   - Estado isSaving/error.
   - Valida a entrada com parseReadingInput (mesmo schema Zod de criação — a validação de
     faixa/formato é idêntica para create e update).
   - Chama updateReading(user.uid, readingId, input) do repositório.
   - Mesmas mensagens de erro amigáveis em português, nunca error.message cru.
3. Não altere nenhuma tela nesta etapa — é só a camada de dados. Nenhum componente deve importar
   updateReading/useUpdateReading ainda.
4. Teste useUpdateReading.ts num arquivo novo (useUpdateReading.test.ts), cobrindo: sucesso,
   usuário não autenticado, erro de validação Zod (ex.: sistólica menor que diastólica), erro do
   repositório propagado como mensagem amigável — mesmo padrão de useAddReading (se existir teste
   equivalente, siga a mesma estrutura).
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): adicionar updateReading e useUpdateReading
```

**Modelo recomendado:** Claude Sonnet 5 — segue exatamente o padrão já existente em
`addReading`/`useAddReading` e `deleteReading`, sem decisão de projeto nova.

---

### Prompt 1.2 — Formulário em modo edição, tela e navegação a partir do histórico

```
Contexto: no BP Tracker, o Prompt 1.1 já adicionou updateReading e useUpdateReading (camada de
dados). Falta a UI: hoje a única forma de corrigir uma medição errada é excluir e recriar. Ver
plano_de_funcionalidades.md, item 1.

Tarefa:
1. Generalize src/features/readings/useReadingForm.ts para aceitar um parâmetro opcional
   initialReading?: Reading:
   - Sem initialReading: comportamento atual, idêntico (modo criação, usa useAddReading).
   - Com initialReading: popula systolic/diastolic/pulse/note/measuredAt com os valores
     existentes (convertendo number → string nos campos numéricos) e, no submit(), usa
     useUpdateReading(initialReading.id) em vez de useAddReading. Não reseta os campos para vazio
     depois de salvar com sucesso no modo edição (diferente do modo criação) — devolva à tela
     quem chamou decidir o que fazer (ex.: navegar de volta), via um retorno de submit() que já
     existe (Promise<boolean>).
   - CUIDADO: não quebre o modo criação existente nem os testes de useReadingForm.test.ts já
     escritos para ele.
2. Decida a UX de edição seguindo o espírito do app ("a home é o formulário", registro rápido,
   CLAUDE.md §1): prefira uma rota dedicada app/(app)/edit-reading/[id].tsx reaproveitando a
   MESMA composição visual de app/(app)/index.tsx (os mesmos componentes BpNumberInput,
   DateTimeField, Field, Button) — não duplique JSX, extraia um componente de formulário
   compartilhado se isso evitar repetição grande entre index.tsx e a nova rota. Título da tela:
   "Editar medição". Botão: "Salvar alterações" em vez de "Salvar medição". Ao salvar com
   sucesso, volte para a tela anterior (router.back()).
3. Em src/components/bp/ReadingRow.tsx, adicione a affordance de edição: um onPress na linha (não
   no botão de excluir, que já existe e deve continuar isolado) navegando para
   /(app)/edit-reading/[id] com o id da medição. Mantenha accessibilityRole apropriado
   (ex.: o container acessível da linha passa a também anunciar que é tocável para editar, sem
   quebrar o rótulo de acessibilidade já testado em ReadingRow.test.tsx — ajuste esse teste se o
   texto do accessibilityLabel mudar).
4. Confirme que o botão de excluir (swipe, botão persistente, accessibilityAction) continua
   funcionando exatamente como antes — o toque para editar não pode capturar o toque do botão de
   excluir nem do swipe.
5. Rode npm run lint && npm run typecheck && npm test. Adicione/ajuste testes cobrindo: abrir a
   tela de edição com os valores pré-preenchidos, salvar e confirmar que updateReading foi chamado
   com o id certo e os novos valores, navegação de volta ao salvar.

Commit:
feat(readings): permitir editar uma medição já salva
```

**Modelo recomendado:** Claude Opus 5 — envolve decisão de UX sem precedente no app (rota vs.
modal, reaproveitamento de formulário, o que acontece depois de salvar) e risco real de regressão
nos três caminhos de exclusão já existentes em `ReadingRow`.

---

### Prompt 1.3 — Teste de regressão nas Security Rules para `update` entre contas

```
Contexto: no BP Tracker, firestore.rules já permite update em readings/{readingId} para o dono
(isOwner(uid)). tests/firestore.rules.test.ts cobre create/read/delete cross-user (usuário B não
lê/escreve/apaga dado de A), mas não há um teste explícito de UPDATE cross-user. Agora que o
Prompt 1.1/1.2 deram ao cliente um caminho real de update, feche essa lacuna de cobertura.
CLAUDE.md §4.4 exige "toda alteração no modelo de dados... caso negativo coberto por teste".

Tarefa:
1. Em tests/firestore.rules.test.ts, adicione um caso: usuário B tentando dar update numa
   medição que pertence ao usuário A — deve ser negado (assertFails). Siga o padrão dos testes
   negativos já existentes no arquivo (setup do contexto autenticado, doc de referência criado
   antes como A, tentativa de escrita como B).
2. Adicione também um caso positivo: o dono atualizando um campo válido da própria medição (ex.:
   trocar o note) deve ser aceito (assertSucceeds) — hoje só existe o caso positivo de create.
3. Rode npm run test:rules (ou o equivalente já documentado no README/CLAUDE.md para rodar as
   rules contra o emulador) e confirme que os novos casos passam.

Commit:
test(rules): cobrir update de medição entre contas diferentes
```

**Modelo recomendado:** Claude Haiku 4.5 — extensão mecânica de um arquivo de teste seguindo um
padrão já muito repetido no mesmo arquivo.

---

## Funcionalidade 2 — Notificações push na Web (FCM)

### Prompt 2.1 — Implementar `getMessaging`/`getToken` no client web

```
Contexto: no BP Tracker, src/features/reminders/registerPushToken.web.ts hoje só lança um erro
fixo dizendo que push na web não está disponível. Mas a infraestrutura já existe: o service
worker public/firebase-messaging-sw.js está pronto, e EXPO_PUBLIC_FIREBASE_VAPID_KEY já é lido em
app.config.ts (extra.vapidKey). O que falta é o código que liga essas duas pontas. Ver
plano_de_funcionalidades.md, item 2.

Tarefa:
1. Em src/services/firebase/firebase.web.ts, exporte messaging: adicione uma função
   getMessagingInstance(): Promise<Messaging | null> (ou padrão equivalente) usando
   isSupported() do firebase/messaging antes de chamar getMessaging(app) — a Push API não existe
   em todo navegador, e a checagem evita lançar em ambientes sem suporte (ex.: Safari mais antigo,
   modo privado em alguns browsers). Não exporte um `messaging` síncrono direto no módulo:
   isSupported() é assíncrono.
2. Reescreva src/features/reminders/registerPushToken.web.ts:
   - Se getMessagingInstance() resolver null (sem suporte) ou vapidKey estiver ausente
     (Constants.expoConfig?.extra?.vapidKey), lance um erro com mensagem amigável e específica
     para cada caso (reaproveite/adapte WEB_NOT_SUPPORTED_MESSAGE só para o caso de fato sem
     suporte do navegador; crie uma mensagem própria para "vapid key não configurada" — não
     confunda as duas na mesma mensagem, para quem depurar saber qual é o problema real).
   - Registre o service worker: await navigator.serviceWorker.register('/firebase-messaging-sw.js').
   - Peça permissão do navegador (Notification.requestPermission() ou o helper equivalente do
     SDK) — se negada, lance PERMISSION_DENIED_MESSAGE (mesmo texto/padrão do
     registerPushToken.native.ts, adaptado para "nas configurações do navegador").
   - Chame getToken(messaging, { vapidKey, serviceWorkerRegistration }).
   - Persista o token em devices/{tokenHash} com platform: 'web' — reaproveite o hashToken de
     registerPushToken.native.ts (mova para um util compartilhado, ex. src/lib/hashToken.ts, já
     que agora as duas plataformas precisam dele — CLAUDE.md §3.2 proíbe duplicar lógica pura
     entre arquivos de plataforma).
3. Trate erros de getToken/register com try/catch e mensagens em português amigáveis, nunca
   error.message cru (CLAUDE.md §4.3).
4. Rode npm run lint && npm run typecheck && npm test. Testes de firebase/messaging tipicamente
   exigem mock (o SDK toca em Service Worker/Notification, que jsdom não tem completo) — mocke
   firebase/messaging e navigator.serviceWorker/Notification no teste novo, seguindo o padrão de
   mock já usado em outros arquivos .web.test.tsx do projeto (ex.: DateTimeField.web.test.tsx).

Commit:
feat(reminders): implementar registro de push token na web via FCM
```

**Modelo recomendado:** Claude Sonnet 5 — a integração é bem especificada e segue APIs
documentadas do Firebase SDK, mas tem superfície grande o bastante (mocks de browser API) para
justificar mais do que o modelo mais leve.

---

### Prompt 2.2 — Notificação em primeiro plano (`onMessage`) na web

```
Contexto: no BP Tracker, depois do Prompt 2.1 o token de push web já é registrado, mas o FCM não
dispara nenhuma notificação visível quando a aba do app já está aberta em primeiro plano — isso
exige um listener onMessage explícito do SDK (comportamento documentado do Firebase, não um bug).
Sem isso, quem está com o app aberto na aba enquanto o lembrete deveria disparar não vê nada até
recarregar ou trocar de aba.

Tarefa:
1. Registre um listener onMessage(messaging, (payload) => { ... }) num ponto de bootstrap da
   web (ex.: junto de onde registerPushToken é chamado, ou num hook próprio
   src/features/reminders/useForegroundPush.web.ts se preferir isolar) — dispare uma notificação
   local visível (Notification do browser, ou um toast interno usando o mesmo componente de
   feedback do app se já existir um persistente o bastante) com o mesmo texto/deeplink usado nas
   notificações locais nativas ("Hora de medir sua pressão" / bptracker://record).
2. Garanta que o listener não vaza: se for um hook, retorne a função de cleanup do onMessage no
   useEffect (CLAUDE.md §3.4 — todo listener precisa de unsubscribe).
3. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(reminders): notificar lembrete de push com a aba web em primeiro plano
```

**Modelo recomendado:** Claude Sonnet 5.

---

## Funcionalidade 3 — Cloud Functions como projeto deployável

### Prompt 3.1 — `functions/package.json`, `tsconfig.json` e `index.ts`

```
Contexto: no BP Tracker, o código das 4 Cloud Functions já existe e tem teste
(functions/src/scheduler/dispatchReminders.ts, functions/src/triggers/onUserSettingsWrite.ts,
onDeviceWrite.ts, onUserDelete.ts, functions/src/lib/nextRun.ts + nextRun.test.ts), mas
functions/ não é um projeto Node instalável: falta functions/package.json,
functions/tsconfig.json e functions/src/index.ts (nenhuma function é exportada hoje). Ver
plano_de_funcionalidades.md, item 3, e PLAN.md §3 para o desenho completo do backend.

Tarefa:
1. Crie functions/package.json como projeto TS isolado (CLAUDE.md §3.2 — não herda do
   package.json raiz):
   - dependencies: firebase-functions, firebase-admin, luxon.
   - devDependencies: typescript, @types/node, e o necessário para rodar os testes já existentes
     em functions/src/lib/nextRun.test.ts (confira o test runner que esse arquivo já assume —
     Jest ou Vitest — pelo import/sintaxe usado nele, e alinhe a devDependency correspondente).
   - scripts: "build": "tsc", "serve": "npm run build && firebase emulators:start --only functions",
     "deploy": "firebase deploy --only functions", "test": (o runner identificado acima).
   - "engines": { "node": "20" } (ou a versão de Node que Cloud Functions v2 suporta e que o
     resto do projeto já usa, se houver essa informação em algum lugar do repo).
2. Crie functions/tsconfig.json: target/module compatíveis com Cloud Functions v2 (Node 20+,
   ESM ou CommonJS conforme o que firebase-functions v2 espera), strict: true (mesma exigência de
   CLAUDE.md §3.1 para o projeto principal), outDir apontando para lib/ ou dist/ (adicione ao
   .gitignore de functions/ se ainda não estiver coberto pelo .gitignore raiz).
3. Crie functions/src/index.ts exportando as 4 functions:
   export { dispatchReminders } from './scheduler/dispatchReminders';
   export { onUserSettingsWrite } from './triggers/onUserSettingsWrite';
   export { onDeviceWrite } from './triggers/onDeviceWrite';
   export { onUserDelete } from './triggers/onUserDelete';
   (confira o nome exato exportado por cada arquivo antes de escrever os re-exports).
4. Rode npm --prefix functions install && npm --prefix functions run build. Corrija os erros de
   compilação que aparecerem agora que as dependências reais estão resolvidas — é esperado que
   apareçam alguns (o próprio RELEASE_CHECKLIST.md do projeto antecipa isso), já que o código
   nunca foi compilado contra o SDK real antes. Não mude a LÓGICA das functions para "fazer
   compilar" sem entender a causa — se um erro indicar um bug real (ex.: tipo incompatível que
   revela uma chamada errada à API do Admin SDK), corrija a causa, não só o sintoma.
5. Rode npm --prefix functions test e confirme que nextRun.test.ts passa com o runner real.
6. Rode npm run lint && npm run typecheck && npm test no projeto raiz também, para garantir que
   nada no workspace principal foi afetado.

Commit:
chore(functions): tornar functions/ um projeto Node deployável
```

**Modelo recomendado:** Claude Sonnet 5 — scaffolding mecânico e bem especificado, mas com risco
real de erros de compilação inesperados ao resolver dependências pela primeira vez, que exigem
diagnóstico (não é puramente copiar-colar, por isso não Haiku).

---

## Funcionalidade 4 — Build nativo (EAS)

### Prompt 4.1 — Revisão do `eas.json` após `eas build:configure`

```
Contexto: no BP Tracker, eas.json não existe. Gerar esse arquivo exige `eas login` com uma conta
EAS real e rodar `eas build:configure` interativamente — isso NÃO pode ser feito por uma sessão
autônoma do Claude Code sem a credencial e a interação do usuário. Este prompt só serve para
DEPOIS que o usuário já rodou esses dois comandos e o eas.json inicial já existe no repositório.

Tarefa (só execute se eas.json já existir; se não existir, pare e avise que os comandos
`eas login` / `eas build:configure` precisam ser rodados por um humano primeiro):
1. Revise o eas.json gerado contra o que o app precisa (PLAN.md §Fase 7, CLAUDE.md §2):
   - Perfil "development": developmentClient: true, distribution: "internal" — é o perfil usado
     por `eas build --profile development --platform android` (CLAUDE.md §2).
   - Perfil "production": saída AAB (não APK) para a Play Store, com autoIncrement de versionCode
     habilitado.
2. Confirme que nenhum segredo (ex.: caminho de service account, chaves) foi commitado em texto
   plano dentro do eas.json — credenciais de assinatura Android/iOS devem ficar no EAS
   credentials manager, não no arquivo versionado (CLAUDE.md §4.4).
3. Não rode `eas build` de verdade nesta tarefa — isso consome créditos de build e precisa de
   decisão explícita do usuário sobre quando gastar.
4. Se algo no eas.json parecer incompleto ou inconsistente com o app.config.ts atual (ex.:
   android.package divergente), reporte em vez de corrigir sozinho — é uma decisão de
   configuração de conta, não de código.

Commit (só se algo foi de fato ajustado):
chore(build): revisar perfis de build gerados pelo eas build:configure
```

**Modelo recomendado:** Claude Haiku 4.5 — é uma checagem de configuração contra uma lista clara
de critérios, sem lógica de aplicação nova; a parte que exige decisão humana (login, geração do
arquivo) está fora do que o modelo executa.

---

## Funcionalidade 5 — Coletor de erro em produção (Crashlytics)

### Prompt 5.1 — Conectar `setCrashReporter` com estratégia por plataforma

```
Contexto: no BP Tracker, src/lib/logger.ts já expõe setCrashReporter(reporter), documentado como
o ponto de extensão, mas nada no app chama essa função — em produção, logError descarta todo erro
silenciosamente. Isso já está registrado como pendência conhecida em RELEASE_CHECKLIST.md (seção
Observabilidade) e em prompts_correcoes.md (Prompt 7), que deliberadamente NÃO integrou nada
ainda, porque CLAUDE.md §4.1 pede justificar peso de bundle/compatibilidade antes de adicionar
dependência nativa nova. Este prompt é essa decisão, agora tomada: usar
@react-native-firebase/crashlytics no nativo, e documentar (não simular) a lacuna na web. Ver
plano_de_funcionalidades.md, item 5.

Tarefa:
1. Justifique e adicione @react-native-firebase/crashlytics (e @react-native-firebase/app, sua
   dependência) ao package.json — confirme compatibilidade com a versão do Expo/React Native já
   instalada no projeto (npx expo install é o caminho recomendado para isso, garante a versão
   correta do peer dependency).
2. Crie um adapter por plataforma que implementa a interface CrashReporter de logger.ts:
   - src/services/crashReporter.native.ts: usa @react-native-firebase/crashlytics de verdade
     (crashlytics().recordError(...) ou equivalente).
   - src/services/crashReporter.web.ts: por ora, documente explicitamente que não há coletor de
     produção conectado na web (comente o porquê — ex.: Crashlytics é módulo nativo sem
     equivalente direto; uma integração futura poderia usar Sentry ou Firebase Crashlytics JS,
     mas isso é uma decisão à parte) e exporte um reporter que é um no-op declarado, não
     silencioso — ou seja, deixe rastreável no código que a web está descoberta aqui, sem fingir
     que há proteção.
3. No bootstrap (app/_layout.tsx ou src/services/firebase/index.ts, ao lado de onde
   initAppCheck() já é chamado), importe o adapter certo por plataforma (resolução automática por
   extensão de arquivo, CLAUDE.md §3.3) e chame setCrashReporter(reporter) condicionado a
   !__DEV__.
4. Atualize o comentário de pendência em src/lib/logger.ts (linhas ao redor de
   setCrashReporter, adicionadas no Prompt 7 de prompts_correcoes.md) para refletir que o nativo
   agora está conectado e a web continua como gap conhecido.
5. Marque o item correspondente em RELEASE_CHECKLIST.md como resolvido para o nativo, mantendo o
   registro do gap na web.
6. Adicione um teste em logger.test.ts (crie se não existir) confirmando que, com um reporter
   injetado via setCrashReporter, logError chama recordError com scope/error/contexto sanitizado
   — hoje só existe cobertura implícita do caminho sem reporter.
7. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(observability): conectar Crashlytics como coletor de erro em produção (nativo)
```

**Modelo recomendado:** Claude Opus 5 — envolve adicionar uma dependência nativa nova (decisão que
CLAUDE.md pede para justificar explicitamente), desenhar uma interface por plataforma sem
precedente direto no código, e comunicar com precisão o que fica coberto e o que continua como gap
conhecido — mais julgamento de projeto do que os outros itens.

---

## Funcionalidade 6 — Política de privacidade (URL placeholder)

### Prompt 6.1 — Trocar o placeholder pela URL real

```
Contexto: no BP Tracker, app/(app)/settings.tsx define PRIVACY_POLICY_URL como um placeholder
deliberado que não existe de verdade. Este prompt só faz sentido DEPOIS que uma URL real e
publicada da política de privacidade existir — não invente conteúdo jurídico nem hospede nada
sozinho. Ver plano_de_funcionalidades.md, item 6.

Pré-condição (confirme antes de tocar em código): você tem em mãos a URL real e publicada da
política de privacidade do BP Tracker. Se não tiver, pare aqui e devolva a pendência ao usuário —
não prossiga com um valor supondo que está certo.

Tarefa:
1. Em app/(app)/settings.tsx, troque o valor de PRIVACY_POLICY_URL pela URL real fornecida.
2. Remova o comentário de placeholder (linhas 36-37, "Placeholder deliberado...") já que deixou
   de ser verdade.
3. Confirme manualmente (ou via teste, se o projeto já tiver algum smoke test de Linking) que o
   botão "Política de privacidade" em Ajustes abre a URL correta.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(settings): apontar política de privacidade para a URL real
```

**Modelo recomendado:** Claude Haiku 4.5 — troca de uma constante e remoção de comentário, sem
nenhuma decisão de projeto.

---

## Funcionalidade 7 — Ícones do app (placeholders visuais)

### Prompt 7.1 — Substituir os ícones placeholder pela arte final

```
Contexto: no BP Tracker, assets/icon.png, adaptive-icon.png, splash-icon.png e favicon.png são
quadrados sólidos na cor primária, gerados só para destravar a configuração inicial (comentário em
app.config.ts, linhas 63-64). Este prompt só faz sentido DEPOIS que a arte final do ícone (logo do
app) existir nos tamanhos corretos. Ver plano_de_funcionalidades.md, item 7.

Pré-condição: você tem em mãos os arquivos de ícone finais (pelo menos icon.png 1024×1024;
idealmente também adaptive-icon.png com safe zone para Android e um favicon.png dedicado para a
web). Se não tiver, pare aqui e devolva a pendência ao usuário.

Tarefa:
1. Substitua os arquivos em assets/ pelos definitivos, mantendo os mesmos nomes de arquivo que
   app.config.ts já referencia (para não precisar tocar em app.config.ts além do passo 2).
2. Remova o comentário de placeholder em app.config.ts (linhas 63-64).
3. Rode npx expo start --web e npx expo start --dev-client (ou equivalente) para conferir
   visualmente que o ícone novo aparece na aba do navegador e no ícone do app/splash screen.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
chore(assets): substituir ícones placeholder pela arte final do app
```

**Modelo recomendado:** Claude Haiku 4.5 — troca de arquivos binários e remoção de um comentário,
sem lógica envolvida.

---

## Como usar

- Rode os prompts de cada funcionalidade **na ordem em que aparecem** dentro da seção — a
  Funcionalidade 1 tem dependência real entre os três prompts (1.1 → 1.2 → 1.3); os prompts das
  Funcionalidades 2, 3, 5, 6 e 7 são cada uma uma cadeia curta independente das outras.
- **Paralelizável entre funcionalidades:** 1, 2, 3 e 5 não tocam nos mesmos arquivos entre si e
  podem rodar em sessões/agentes separados ao mesmo tempo. 6 e 7 são triviais e podem rodar a
  qualquer momento assim que a pré-condição (URL real / arte final) existir. 4 depende de ação
  humana fora do código (login EAS) antes de qualquer prompt fazer sentido.
- Cada prompt termina em UM commit. Depois de rodar os que quiser, revise o diff acumulado e faça
  `git push` (ou peça para eu fazer) — não faço push automático de nenhum destes sem você pedir.
