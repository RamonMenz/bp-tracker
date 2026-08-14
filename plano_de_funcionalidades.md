# Plano de Funcionalidades — Varredura de Pendências

> Levantamento do estado real do BP Tracker nesta branch: o que está desenhado/anunciado na
> interface (ou na documentação do projeto) mas cuja lógica ainda não existe, está incompleta ou
> depende de infraestrutura ausente. Cada item lista onde foi encontrado, o estado atual
> verificado no código, e o passo a passo técnico que será seguido para fechar a lacuna — **nada
> abaixo foi implementado ainda**, é só o mapeamento pedido.
>
> Contexto importante para quem for revisar isto: este repositório já passou por duas rodadas de
> auditoria anteriores (`plano_de_correcoes.md` / `prompts_correcoes.md` — bugs de UI quebrada na
> web, ex.: `Alert.alert`, `DateTimePicker`; e `plano_ux_mobile.md` / `prompts_ux_mobile.md` —
> ajustes de acessibilidade e layout mobile), ambas já executadas e commitadas. Os itens abaixo são
> **funcionalidades ausentes ou infraestrutura de lançamento**, não repetição daquele trabalho — eu
> confirmei em cada caso, lendo o código atual, que a lacuna listada ainda existe.

---

## 1. Edição de medição (CRUD incompleto — falta o "U")

**Onde foi encontrado:**
- `src/features/readings/readings.repo.ts` — só exporta `addReading`, `deleteReading` e
  `getAllReadings`. Não existe `updateReading`.
- `src/components/bp/ReadingRow.tsx` — a linha do histórico só tem uma ação: excluir (swipe,
  botão persistente, `accessibilityAction`). Não há `onPress` na linha nem qualquer affordance de
  edição.
- `app/(app)/history.tsx` — nenhuma rota/estado para abrir um formulário de edição.
- `src/features/readings/useReadingForm.ts` (linha 83) — o hook do formulário só chama
  `useAddReading`; não tem modo "editar medição existente".

**Estado atual:** o usuário consegue **criar** e **excluir** uma medição, mas não **corrigir**
uma já salva (ex.: digitou 210/90 querendo dizer 120/80). A única forma de corrigir hoje é excluir
e recriar — o que perde o `createdAt` original e obriga a digitar tudo de novo. As
`firestore.rules` já têm suporte a isso (`match /readings/{readingId} { allow update: ... }`,
`firestore.rules:72-73`) — a lacuna é só no cliente, o backend já está pronto para receber.

**Passo a passo técnico:**
1. `readings.repo.ts`: adicionar `updateReading(uid, readingId, input: ReadingInput): Promise<void>`
   usando `updateDoc(doc(firestore, readingDocPath(uid, readingId)), input)`, com o mesmo
   tratamento de erro (`permission-denied` / `unavailable` / genérico) já usado em `addReading`.
2. `useReadingForm.ts`: generalizar para aceitar um `initialReading?: Reading` opcional. Quando
   presente, popular os campos com os valores existentes e, no `submit()`, chamar
   `updateReading` em vez de `addReading` (extrair um novo hook `useUpdateReading`, espelhando
   `useAddReading`, para manter a separação hook-por-operação do projeto).
3. `ReadingRow.tsx`: adicionar `onPress` na linha (fora da área que já tem `accessible` para não
   conflitar com o gesto de swipe) navegando para a tela/rota de edição com o `id` da medição.
4. Nova rota `app/(app)/edit-reading/[id].tsx` (ou modal/bottom sheet reaproveitando o mesmo layout
   de `index.tsx`) — carrega a medição via `useReadings`/leitura pontual por id, popula o form no
   modo edição, salva com `updateReading`.
5. Testes: `useReadingForm.test.ts` (modo edição), teste de fluxo em
   `history.test.tsx`/novo arquivo de teste da tela de edição, e um caso negativo em
   `tests/firestore.rules.test.ts` confirmando que o usuário B não consegue `update` numa medição
   de A (as rules já cobrem isolamento por `isOwner`, só falta o teste explícito de update entre
   contas, se ainda não existir).
6. Rodar `npm run lint && npm run typecheck && npm test` antes do commit.

---

## 2. Notificações push na Web (FCM) — infraestrutura pronta, cliente nunca implementado

**Onde foi encontrado:**
- `src/features/reminders/registerPushToken.web.ts` — a função inteira é:
  ```ts
  export async function registerPushToken(_uid: string): Promise<void> {
    throw new Error(WEB_NOT_SUPPORTED_MESSAGE);
  }
  ```
  Sempre recusa, incondicionalmente.
- `public/firebase-messaging-sw.js` **já existe** (service worker do FCM, 4KB, pronto).
- `.env.example:11` e `app.config.ts:39` **já têm** o campo `EXPO_PUBLIC_FIREBASE_VAPID_KEY`
  plumbing pronto.
- Busca por `getMessaging`/`getToken` em `src/`: **nenhuma ocorrência**. `firebase/messaging`
  nunca é importado em `src/services/firebase/*`.

**Estado atual:** metade da funcionalidade foi construída (service worker, variável de ambiente,
mensagem de erro documentando o motivo) mas a outra metade — inicializar `getMessaging(app)`,
pedir permissão do navegador, chamar `getToken(messaging, { vapidKey, serviceWorkerRegistration })`
e persistir o token em `devices/{tokenHash}` — nunca foi escrita. Hoje, ativar notificações na web
sempre falha com uma mensagem explicando que não está disponível — o que é honesto, mas significa
que usuários da versão web do app **nunca** recebem lembrete por push (só quem usa Android).

**Passo a passo técnico:**
1. `src/services/firebase/firebase.web.ts`: exportar `messaging` via
   `isSupported().then(...)` + `getMessaging(app)` (a API do SDK web exige checar suporte antes —
   Safari/navegadores antigos não têm Push API).
2. `registerPushToken.web.ts`: substituir o `throw` incondicional por:
   - Checar `Notification.permission` / pedir permissão.
   - Registrar `public/firebase-messaging-sw.js` via `navigator.serviceWorker.register`.
   - Chamar `getToken(messaging, { vapidKey: Constants.expoConfig.extra.vapidKey, serviceWorkerRegistration })`.
   - Persistir em `devices/{tokenHash}` (mesmo `hashToken` usado no nativo — mover para
     `src/lib/` se for compartilhado entre `.native.ts`/`.web.ts`).
   - Manter uma mensagem de recusa clara (`vapidKey` ausente, permissão negada, navegador sem
     suporte) em vez do `throw` genérico atual.
3. Tratar o recebimento em primeiro plano (`onMessage`) para mostrar notificação enquanto a aba
   está aberta (o FCM não dispara `onMessage` para abas em foreground automaticamente).
4. Testar em pelo menos Chrome desktop; documentar no `RELEASE_CHECKLIST.md` que Safari/iOS PWA
   tem suporte limitado a Web Push.
5. `npm run lint && npm run typecheck && npm test`.

---

## 3. Cloud Functions não formam um projeto deployável

**Onde foi encontrado:**
- `functions/src/scheduler/dispatchReminders.ts`, `functions/src/triggers/onUserSettingsWrite.ts`,
  `onDeviceWrite.ts`, `onUserDelete.ts`, `functions/src/lib/nextRun.ts` — todo o **código** dos 4
  triggers/scheduler existe e tem teste (`nextRun.test.ts`).
- `functions/package.json` — **não existe**.
- `functions/src/index.ts` — **não existe** (nenhuma function é exportada).

**Estado atual:** a lógica que dispara os lembretes (§3 do `PLAN.md`, "a razão de ser do
produto") está toda escrita e testada isoladamente, mas não há como rodar
`npm --prefix functions install`, `npm --prefix functions run build` nem
`firebase deploy --only functions` — o diretório `functions/` não é um projeto Node instalável.
Sem isso, nenhum lembrete por push chega a um usuário real, mesmo com o app publicado.

**Passo a passo técnico:**
1. `functions/package.json`: projeto Node isolado (conforme `CLAUDE.md` §3.2), com
   `firebase-functions`, `firebase-admin`, `luxon` como dependências, `typescript` como dev
   dependency, scripts `build` (`tsc`) e `serve`/`shell` para o emulador.
2. `functions/tsconfig.json`: configuração TS própria (não herda do root — projeto isolado).
3. `functions/src/index.ts`: exportar as 4 functions já escritas —
   `export { dispatchReminders } from './scheduler/dispatchReminders'` e os 3 triggers.
4. Rodar `npm --prefix functions install && npm --prefix functions run build` e corrigir qualquer
   erro de compilação que só aparece com as dependências reais resolvidas (o próprio
   `RELEASE_CHECKLIST.md` já antecipa esse risco).
5. Validar localmente com `firebase emulators:start` (Functions + Firestore) antes de considerar
   pronto para deploy.
6. `firebase deploy --only functions` fica documentado como o passo seguinte (requer projeto
   Firebase real e credenciais — fora do que dá para automatizar sem acesso ao console).

---

## 4. Build nativo (EAS) não configurado

**Onde foi encontrado:** `eas.json` — **não existe** na raiz do projeto.

**Estado atual:** `app.config.ts` já tem `android.package`, `ios.bundleIdentifier`, ícones
(ver item 6) e `scheme` configurados — a parte do Expo está pronta. Mas `eas build` não tem
perfis (`development`/`production`) definidos, então nenhum dos comandos de build do
`CLAUDE.md` §2 ("Build e distribuição") funciona ainda.

**Passo a passo técnico:**
1. `eas login` + `eas build:configure` (requer conta EAS do usuário — não é algo que dá para
   inventar sem credencial real).
2. Revisar o `eas.json` gerado: perfil `development` com `developmentClient: true` e
   `distribution: internal`; perfil `production` com `autoIncrement` e saída AAB.
3. Confirmar que os segredos de build (`google-services.json`) são referenciados via EAS Secrets,
   nunca commitados (`CLAUDE.md` §4.4).
4. Só então `eas build --profile development --platform android` como primeiro teste real.

---

## 5. Coletor de erro em produção (Crashlytics) nunca conectado

**Onde foi encontrado:** `src/lib/logger.ts:50-71` — `setCrashReporter()` existe e é o ponto de
extensão documentado, mas **nenhum arquivo do projeto a chama**. Já está registrado como pendência
conhecida em `RELEASE_CHECKLIST.md` (seção "Observabilidade").

**Estado atual:** em produção (`__DEV__ === false`), `logError` executa
`crashReporter?.recordError(...)` sobre um `crashReporter` sempre `null` — todo erro de produção
é descartado silenciosamente. Em dev continua indo para `console.error` normalmente, então o
problema só aparece depois do primeiro build de produção.

**Passo a passo técnico:**
1. Decidir e justificar a dependência nova por escrito (`CLAUDE.md` §4.1 exige isso antes de
   adicionar peso ao bundle): `@react-native-firebase/crashlytics` é o candidato natural, mas é
   módulo nativo sem equivalente na web — precisa de estratégia por plataforma (`.native.ts` chama
   Crashlytics de verdade; `.web.ts` pode integrar Sentry/Firebase Crashlytics JS, ou ficar
   documentado como gap conhecido da versão web).
2. Implementar `setCrashReporter(...)` no bootstrap (`app/_layout.tsx`, ao lado da chamada de
   `initAppCheck()` em `src/services/firebase/index.ts`), condicionado a `!__DEV__`.
3. Cobrir com um teste de que `logError` chama o reporter injetado quando um está setado (hoje só
   existe cobertura do caminho "sem reporter").
4. Atualizar `RELEASE_CHECKLIST.md` marcando o item como resolvido.

---

## 6. Política de privacidade — link placeholder

**Onde foi encontrado:** `app/(app)/settings.tsx:38`
```ts
const PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo';
```

**Estado atual:** o botão "Política de privacidade" em Ajustes está funcional — abre
`Linking.openURL` e já trata falha de abertura com um diálogo amigável (`ConfirmDialog`) — mas
aponta para uma URL que deliberadamente não existe, como aviso explícito no próprio código
(comentário na linha 36-37 do arquivo). Página obrigatória para publicação na Play Store dado que
o app trata dado de saúde (`CLAUDE.md` §4.4, `PLAN.md` Fase 6).

**Passo a passo técnico:**
1. 🔴 Decisão do usuário: redigir/hospedar a política de privacidade real (fora do escopo de
   código — é conteúdo jurídico, não algo que deva ser inventado).
2. Trocar a constante pela URL real assim que publicada.
3. Conferir o *Data Safety form* da Play Store contra o conteúdo da política antes de submeter
   (`PLAN.md` Fase 6).

---

## 7. Ícones do app são placeholders visuais

**Onde foi encontrado:** `app.config.ts:63-64`
```ts
// ⚠️ PLACEHOLDER: assets/*.png são quadrados teal sólidos gerados só para destravar a
// configuração — troque pela arte real antes de publicar na Play Store.
icon: './assets/icon.png',
```
`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` são quadrados sólidos na
cor primária, sem logotipo.

**Estado atual:** suficiente para builds de desenvolvimento e teste interno, mas não para
publicação — a Play Store exige ícone final na ficha do app.

**Passo a passo técnico:**
1. 🔴 Arte final do ícone (decisão de design/branding do usuário).
2. Gerar os tamanhos exigidos (`icon.png` 1024×1024, `adaptive-icon.png` com safe zone, favicon
   web) e substituir os arquivos em `assets/`.
3. Remover o comentário de placeholder em `app.config.ts` depois da troca.

---

## Itens verificados e considerados **completos** (mencionados para não parecerem esquecidos)

- **Criar e excluir medição:** fluxo completo, com validação Zod, feedback de erro em português,
  indicador de progresso por linha e confirmação antes de excluir.
- **Gráfico de tendência (`TrendChart.tsx`):** usa dados reais de `useReadingsTrend` (derivado do
  Firestore via `useReadings`), não array mockado. Média diária calculada em `computeDailyTrend`
  (função pura, testada em `useReadingsTrend.test.ts`), plotada em janelas de 7/30 dias.
- **Médias no Histórico:** cada cabeçalho de dia mostra a média do dia (`app/(app)/history.tsx`,
  função `average`). Não existe hoje um número único consolidado "média da semana"/"média do mês"
  fora do gráfico — se isso for um requisito de produto (não só o gráfico), é um item pequeno a
  adicionar depois dos itens acima, não uma lacuna crítica: os dados e a agregação diária já
  existem, faltaria só somar o array de `trend7d`/`trend30d` numa média única.
- **Export CSV:** gera o arquivo de verdade (`src/lib/csv.ts`, com BOM UTF-8 e acentuação
  corrigida), compartilha nativo/baixa na web — não é um botão morto.
- **Exclusão de conta (LGPD):** dupla confirmação, chama `deleteAccount`, que aciona a limpeza
  server-side.
- **App Check:** `initAppCheck()` é chamado no bootstrap (`src/services/firebase/index.ts:16`).
- **Lembretes locais no Android:** `localReminders.native.ts` agenda notificações diárias reais
  via `expo-notifications`. (O equivalente na web é um no-op documentado — ver item 2, que cobre a
  lacuna real de notificação na web.)

---

## Resumo executivo

| # | Funcionalidade | Severidade | Esforço estimado |
|---|---|---|---|
| 1 | Edição de medição (falta o "U" do CRUD) | 🔴 Alta — pedido explícito do produto | Médio |
| 2 | Push na Web (FCM) | 🟡 Média — só afeta usuários web | Médio |
| 3 | Cloud Functions não deployáveis | 🔴 Alta — sem isso, lembretes nunca disparam em produção | Pequeno |
| 4 | EAS Build não configurado | 🟡 Média — bloqueia build nativo | Pequeno (+ credencial) |
| 5 | Crash reporter não conectado | 🟢 Baixa antes do lançamento, alta depois | Pequeno–Médio |
| 6 | Política de privacidade placeholder | 🔴 Alta — bloqueia publicação | Fora do código |
| 7 | Ícones placeholder | 🟢 Baixa | Fora do código |
