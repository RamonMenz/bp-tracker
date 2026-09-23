# Panorama do Projeto — BP Tracker

> Varredura completa do código-fonte, scripts e arquivos de configuração desta branch
> (`claude/repository-analysis-6jl85g`, base `main` em `02235ae`). Diferente de
> `plano_de_funcionalidades.md` (o que está pela metade) e `roadmap_futuro.md` (o que não tem
> código), este documento descreve **o que existe hoje**, lido diretamente dos arquivos — não da
> documentação anterior. Onde o código e os `.md` divergem, a divergência está anotada.
>
> Método: leitura integral de `app/`, `src/`, `functions/src/`, `firestore.rules`,
> `firestore.indexes.json`, `public/` e de todos os arquivos de configuração da raiz
> (`package.json`, `app.config.ts`, `tsconfig.json`, `eslint.config.js`, `jest.config.js`,
> `jest.rules.config.js`, `firebase.json`, `eas.json`, `vercel.json`, `tailwind.config.js`,
> `.github/workflows/`).

---

## 1. 🎯 Visão Geral do Projeto

### O que é

**BP Tracker** é um aplicativo de registro de pressão arterial que roda em **Android nativo e na
web (PWA)** a partir de uma base de código única em React Native/Expo. O usuário entra com a conta
Google, digita sistólica/diastólica (e opcionalmente pulso e uma observação), e o app guarda,
classifica, mostra tendência e exporta o histórico.

### O problema que resolve

O problema central **não é armazenar números** — é de **aderência**. A meta declarada em
`CLAUDE.md §1` e `PLAN.md` é *"fazer o usuário medir 3x ao dia sem esquecer"*. Todo o resto da
arquitetura é subordinado a isso, e dá para ver essa subordinação no código:

| Decisão de produto | Onde aparece no código |
|---|---|
| Registrar em **≤ 10 s e 4 toques** | `app/(app)/index.tsx` — a home **é** o formulário, sem passo "toque no + para adicionar". `LastReadingCard` fica *abaixo* dele para não empurrar os campos para fora da primeira dobra. `Screen` usa `keyboardShouldPersistTaps="handled"` justamente para o botão Salvar não exigir um segundo toque. |
| **Lembrar** o usuário | Pipeline inteiro de `functions/` (cron + FCM) + lembretes locais no Android como reforço + deep link `bptracker://record` que abre a home já com o cursor na sistólica (`autoFocus=systolic`). |
| **Não gerar ansiedade** | Primária é `blue-600`, não vermelho (`src/theme/colors.ts`); vermelho fica restrito ao badge de classificação e à ação destrutiva. Textos deliberadamente informativos, nunca prescritivos. |
| **Registrar, não diagnosticar** | `src/components/ui/Disclaimer.tsx` aparece no login, na home (dispensável) e em Ajustes. Nenhuma mensagem automatizada interpreta um resultado. |
| **Qualidade do dado clínico** | Fluxo de segunda medição segundo o protocolo AHA (duas leituras, média reportada), em `useSecondMeasurementFlow`. |

### Público-alvo

Pessoas hipertensas em acompanhamento — parcela relevante idosa —, e o código trata isso como
restrição de engenharia, não como intenção:

- `allowFontScaling` nunca é desativado; corpo de texto mínimo 16 px (`tokens.fontSize.body`).
- Alvo de toque mínimo 48 dp (`tokens.minTouchTarget`); o `Switch` nativo, que mede ~34×20 dp, é
  envolvido por um `Pressable` que recebe o toque e a semântica (`settings.tsx`).
- Contraste AA (4.5:1) com a **conta feita e registrada em comentário** para cada token —
  `primary` é blue-600 porque blue-500 daria 3.1:1; `muted` é slate-500 (4.58:1, "o piso da rampa").
- Leitor de tela anuncia "120 por 80", nunca "120 barra 80".
- Cor nunca é o único portador de significado: o badge de categoria sempre traz rótulo textual +
  ponto colorido + borda.
- Vocabulário adaptado: a opção de tema é "Automático", não "Sistema" — comentário explícito de
  que o público não precisa saber o que é "o sistema".

### Caso de uso principal ponta a ponta

Notificação às 08:00 → toque → app abre direto no formulário com o teclado no campo certo → dois
números → Salvar (com feedback háptico) → sugestão opcional de segunda medição em 1 min → o app
grava a média das duas → o histórico e o gráfico atualizam em tempo real → na consulta, exporta o
CSV do período e leva ao médico.

---

## 2. 🚀 Principais Funcionalidades (Feature Breakdown)

### 2.1 Autenticação (`src/features/auth/`)

- **Google como provedor único**, com implementações reais separadas por plataforma:
  - `signInWithGoogle.native.ts` — `@react-native-google-signin` → `idToken` →
    `signInWithCredential`. Usa o **Web Client ID** (não o Android), com validação explícita da
    configuração ausente.
  - `signInWithGoogle.web.ts` — `signInWithPopup`.
- **Sessão** (`useSession.tsx`): Context Provider único no `_layout` raiz, garantindo um só
  `onAuthStateChanged` e um só `ensureUserProfile` por transição de estado.
- **Perfil** (`ensureUserProfile` + `auth.repo.ts`): `merge` seletivo — a cada login atualiza
  campos mutáveis (nome, e-mail, foto, timezone resolvida via `Intl`); apenas no **primeiro** login
  grava `createdAt` e os defaults de notificação. Sem essa distinção, cada login apagaria as
  preferências do usuário.
- **Gate de navegação** (`useAuthRedirect`): decide só depois de `isLoading` resolver, cobrindo
  também deep links diretos para rotas de `(app)` ou `(auth)`.
- **Exclusão de conta** (`deleteAccount.ts`): dupla confirmação na UI; trata
  `auth/requires-recent-login` reautenticando com Google e tentando de novo. O cliente
  **deliberadamente não apaga os dados do Firestore** — quem faz isso é o trigger `onUserDelete` no
  servidor, com retry, para não deixar dado de saúde órfão se o app for fechado no meio.

### 2.2 Registro e edição de medições (`src/features/readings/`)

Fluxo de dados: `app/` → hook (`useReadingForm`) → hook de escrita (`useAddReading`/`useUpdateReading`)
→ **schema Zod** → repositório (`readings.repo.ts`) → Firestore. Nenhuma tela chama `setDoc`/`getDocs`.

- **Duas camadas de validação, uma fonte de faixas**: `reading-field-errors.ts` dá feedback por
  campo a cada tecla (só em campo já preenchido — acusar erro em campo vazio é ruído), e
  `reading.schema.ts` é o portão único de entrada no repositório. As constantes de faixa
  (`SYSTOLIC_MIN/MAX` etc.) vivem no schema e são importadas pela camada de feedback, justamente
  para não divergirem. A regra "sistólica > diastólica" existe em **um** lugar, compartilhado entre
  o formulário grande e o pop-up da segunda medição.
- **Um hook, dois modos**: `useReadingForm(initialReading?)` serve criação e edição. Em criação,
  limpa os campos ao salvar (o próximo registro começa do zero na mesma tela) e dispara háptico de
  sucesso; em edição, escreve no documento daquele id e devolve o controle para a rota, que volta
  ao histórico.
- **Realtime + offline-first** (`useReadings`): `onSnapshot` com `includeMetadataChanges`, expondo
  `hasPendingWrites` por item — é isso que alimenta o selo *"pendente de sincronização"* no
  `ReadingRow`. Um documento fora do formato é logado e **omitido individualmente**, sem derrubar a
  lista inteira. O `unsubscribe` é sempre devolvido no cleanup.
- **Derivações sem listener novo**: `useLastReading` e `useReadingsTrend` derivam de `useReadings`,
  compartilhando o cache do SDK; a rota de edição encontra a medição na mesma lista já em cache
  (funciona offline, sem leitura extra).
- **Exclusão**: `ConfirmDialog` + trava de duplo toque + indicador por linha. O arquivo carrega uma
  investigação de causa raiz notável: o salto de rolagem ao excluir na web não era da `FlashList`
  nem do navegador, e sim do `ModalFocusTrap` do react-native-web devolvendo o foco a um nó do DOM
  que a `FlashList` já havia **reciclado** para outra medição — corrigido com uma âncora de foco
  fora da lista.

### 2.3 Classificação de pressão (`src/domain/bp-classification.ts`)

Função **pura**, sem I/O, testada em 18 casos incluindo todas as bordas (119/79, 120/80, 139/89,
180/120). Cinco categorias (`normal`, `elevated`, `stage1`, `stage2`, `crisis`) segundo a referência
AHA. A ordem dos testes **é** a regra de negócio: as faixas se sobrepõem e vale sempre a categoria
mais alta que qualquer um dos dois valores atinge — 120/80 é estágio 1 pela diastólica, não
"elevada" pela sistólica.

**O resultado nunca é persistido.** É recalculado a cada render, de modo que uma mudança na tabela
de referência não deixe dado velho inconsistente no banco.

### 2.4 Sessão de duas medições — protocolo AHA (`useSecondMeasurementFlow`)

Máquina de estados `idle → offer → measuring → summary → idle`, exposta como três pop-ups em
sequência sobre a home:

- Contador de 60 s (piso da faixa "1–2 min" do protocolo) que **nunca bloqueia nada** — é só texto.
- `computeSessionAverage` (domínio puro) faz a média de sistólica/diastólica; o **pulso só entra na
  média se as duas leituras o tiverem** — completar um pulso não medido inventaria dado.
- Decisão de escopo relevante: a segunda medição **atualiza o documento da primeira** com a média,
  preservando `note`/`measuredAt`, em vez de criar um segundo documento.
- Enquanto qualquer pop-up está aberto, o formulário é escondido do leitor de tela
  (`accessibilityElementsHidden` + `importantForAccessibility`), porque `accessibilityViewIsModal`
  só resolve no iOS e o app é Android + web.

### 2.5 Histórico e tendência (`app/(app)/history.tsx`)

- Agrupamento por **dia local** (nunca UTC — perto da meia-noite, UTC rotularia como "ontem" uma
  medição de hoje), com cabeçalhos *sticky* rotulados "Hoje"/"Ontem"/"12 de agosto" e a **média
  daquele dia** no cabeçalho.
- `FlashList` com `keyExtractor` pelo id do documento; as linhas de um mesmo dia se arredondam como
  um cartão único conforme a posição no grupo (`first`/`middle`/`last`/`only`).
- **Gráfico de tendência** (`TrendChart` sobre `react-native-gifted-charts`): médias diárias em
  janela de 7 ou 30 dias, sem preenchimento de lacunas (dia sem medição não vira ponto). A escolha
  da biblioteca está justificada: `victory-native` exigiria Skia como peer, pesado demais para uma
  linha dupla.

### 2.6 Exportação CSV (`src/features/export/`, `src/lib/csv.ts`)

- Diálogo com atalhos **7 dias / 30 dias / tudo / período personalizado**; o filtro usa
  `measuredAt` — o **mesmo campo do `orderBy`** —, o que dispensa índice composto novo.
- O formato é pensado para o Excel em pt-BR e o raciocínio está documentado: separador `;`, **BOM**
  UTF-8 (para acentos) **e** a diretiva `sep=;` na primeira linha (sem ela, ao ver o BOM o Excel
  assume vírgula e joga a linha inteira numa célula só). O custo aceito — uma linha extra para quem
  importa programaticamente — está anotado.
- Escape correto de aspas e separador; coluna de categoria já rotulada em português.
- Entrega por plataforma: `file.native.ts` grava em `documentDirectory` e abre o `Sharing`;
  `file.web.ts` gera `Blob` + download.

### 2.7 Lembretes — o coração do produto

**Cliente** (`src/features/reminders/`):

- Ajustes expõe três horários (default 08:00/14:00/20:00, já habilitados para quem nunca
  configurou) e um switch de notificações.
- **Permissão e token só são pedidos ao ligar o switch** — nunca no primeiro launch. Se a permissão
  for negada ou o registro falhar, `notificationsEnabled` **não muda**: melhor o switch continuar
  desligado do que mentir que está ativo sem token salvo.
- Token nativo do FCM (`getDevicePushTokenAsync`, não o Expo push token — o backend usa
  `sendEachForMulticast`, que exige token de registro nativo), persistido em
  `devices/{hash}` com id derivado de um djb2 compartilhado entre as duas plataformas.
- Web: `firebase/messaging` + VAPID key + service worker na raiz do domínio, que recebe a config
  **por query string** (um SW não enxerga `expoConfig.extra`) — mantendo uma fonte de verdade só.
- **Degradação explícita**: `PushUnavailableError` distingue "navegador sem suporte" de "VAPID não
  configurada neste ambiente" e a tela abre um popup amigável, com alternativas concretas (alarme
  do celular, Google Agenda), em vez do erro vermelho genérico — porque em nenhum dos dois casos
  tentar de novo resolve.
- **Reforço local no Android** (`localReminders.native.ts`): notificações diárias com identifier
  estável por horário; cancela apenas o que este recurso agenda (prefixo próprio), nunca
  `cancelAllScheduledNotificationsAsync`. Existe porque Doze mode e otimizações agressivas de
  bateria podem atrasar o FCM. Na web é um no-op *silencioso* — deliberadamente, para não pintar de
  vermelho um salvamento que deu certo.
- **Foreground na web** (`useForegroundPush.web.ts`): o FCM não mostra nada sozinho para uma aba em
  primeiro plano, então o hook dispara a mesma `Notification` do navegador, com `onclick` que
  navega para o formulário.
- **Deep link**: `useNotificationRedirect.native.ts` cobre toque em segundo plano *e* cold start;
  na web é no-op documentado (o pacote lançaria `UnavailabilityError` a cada render, derrubando a
  árvore antes do primeiro paint) porque os dois caminhos web já têm tratamento próprio.

**Backend** (`functions/src/`) — a **única** razão de existir servidor neste projeto:

| Function | Gatilho | Papel |
|---|---|---|
| `onUserSettingsWrite` | write em `users/{uid}` | Mantém o índice `schedules/{uid}`. Tem uma guarda `isSameSchedule` essencial: `ensureUserProfile` reescreve o documento a cada login, e sem ela todo login recalcularia `nextRunAt`, empurrando para frente um lembrete vencido que nunca chegaria. |
| `onDeviceWrite` | write em `users/{uid}/devices/{id}` | Ressincroniza o array `tokens`. **Não** recalcula `nextRunAt` — trocar de aparelho não é motivo para mexer no horário. |
| `dispatchReminders` | Cloud Scheduler `*/15 * * * *` | Despacha os pushes vencidos. |
| `onUserDelete` | exclusão no Auth (v1) | `recursiveDelete` de `users/{uid}` (com subcoleções) + `schedules/{uid}`, com `failurePolicy: true`. |

Três pontos de engenharia que merecem destaque no `dispatchReminders`:

1. **Idempotência em duas fases.** Reagenda **todos** os documentos via `BulkWriter` (um único
   `close()`) **antes** de enviar qualquer push. Se a Function morrer ou o Scheduler reexecutar
   depois desse ponto, o ciclo seguinte não encontra mais os documentos na janela — o retry nunca
   duplica notificação.
2. **Janela anti-spam de 2 h.** Se o backend ficar fora do ar, é melhor pular um ciclo do que
   notificar horas depois — um lembrete de pressão fora de hora não faz sentido.
3. **Poda de tokens mortos**: respostas com `messaging/registration-token-not-registered` removem o
   token do índice.

E `computeNextRun` (`functions/src/lib/nextRun.ts`, 16 testes) ancora o horário na **parede do
relógio local** via Luxon: `plus({ days: 1 })` mantém "08:00 local" mesmo num dia de 23 ou 25 horas;
somar 24 h em UTC erraria nas viradas de horário de verão. O regex de `HH:mm` é estrito de
propósito, porque `DateTime.set({ hour: 25 })` **não** é inválido no Luxon — transborda para 01:00
do dia seguinte, o que viraria um lembrete plausível no horário errado.

### 2.8 Onboarding (`src/screens/OnboardingScreen.tsx`, `src/features/onboarding/`)

Apresentação de 4 passos (registrar → acompanhar → ser lembrado → levar ao médico), aberta
automaticamente na primeira sessão pós-login **por aparelho** (AsyncStorage) e reabrível pelo
atalho "Como usar o app" em Ajustes. Marca "já viu" **antes** de navegar: quem sai no meio não é
interrompido de novo no próximo login. As funções de storage **nunca rejeitam** — falha de leitura
significa "ainda não viu".

### 2.9 Tema claro/escuro (`src/features/theme/`, `src/theme/`)

Preferência por **aparelho** (claro/escuro/automático), persistida em AsyncStorage, com o
observable do NativeWind como fonte única — o que garante que as classes `dark:` e a trilha JS
(`colors[scheme]`) não possam discordar. `tailwind.config.js` usa `darkMode: 'class'` exatamente
para tornar a escolha manual possível. Uma regra de ESLint (`no-restricted-imports`) **proíbe** o
`useColorScheme` do react-native fora de `src/features/theme/`, para as duas trilhas não voltarem a
divergir.

### 2.10 Segurança, privacidade e observabilidade

- **Security Rules** (`firestore.rules`, 26 testes): o provedor é amarrado na regra
  (`sign_in_provider == 'google.com'`), whitelist de campos com `hasOnly` + `hasAll`, faixas
  numéricas, `systolic > diastolic`, `measuredAt` no máximo 5 min no futuro, `createdAt` imutável no
  update, `list` negado em `users` (ninguém enumera usuários), `schedules/{uid}` com
  `read, write: if false` (só o Admin SDK, que ignora rules) e negação explícita catch-all.
- **App Check**: web com reCAPTCHA Enterprise, inicializado no ponto mais cedo possível (a
  avaliação do módulo `services/firebase`), em modo tolerante — retorna `null` sem lançar se a site
  key faltar. O debug token é lido de `process.env` dentro de `if (__DEV__)` (removido por dead code
  elimination no build de produção) e **nunca** de `extra`, que viaja no manifesto de qualquer build.
- **Logger** (`src/lib/logger.ts`) com **três barreiras** contra vazamento de PII e dado de saúde:
  1. *compilação* — o tipo `SafeLogContext` marca com `never` qualquer chave cujo nome contenha um
     fragmento proibido (`systolic`, `email`, `token`, …), quebrando a build;
  2. *dev, runtime* — lança se uma chave escapar (contexto montado dinamicamente);
  3. *produção, runtime* — **nunca lança**: sanitiza recursivamente e segue, porque uma chamada de
     log não pode derrubar o app.
- **Crash reporting** por plataforma, com dependência invertida: Crashlytics no nativo (via config
  plugins do `@react-native-firebase`, sem os quais o módulo nativo nunca seria configurado) e
  `@sentry/browser` na web, inicializado preguiçosamente, com `sendDefaultPii: false`,
  `tracesSampleRate: 0`, rastreio de sessão desligado e **sem nenhum `Sentry.setUser`**.

---

## 3. 🛠️ Stack Tecnológica & Arquitetura

### 3.1 Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime/app | Expo SDK + React Native + React | 57 · 0.86 · 19.2.3 |
| Web | react-native-web + Metro bundler (SPA) | 0.21 |
| Navegação | Expo Router (file-based) | 57 |
| Linguagem | TypeScript **strict** | 6.0.3 |
| Estilo | NativeWind + Tailwind (`darkMode: 'class'`) | 4.2.6 · 3.4.17 |
| Ícones | `lucide-react-native`, importados um a um | 1.31 |
| Auth/DB | Firebase JS SDK · `@firebase/auth` · `@react-native-google-signin` | 12.16 · 1.13 · 16.1 |
| Validação | Zod | 4.4.3 |
| Data/hora | Luxon (backend) + `Intl` (cliente) | 3.7 |
| Listas/gráficos | `@shopify/flash-list` · `react-native-gifted-charts` + `react-native-svg` | 2.3 · 1.4.77 |
| Observabilidade | `@react-native-firebase/crashlytics` (nativo) · `@sentry/browser` (web) | 26 · 10.70 |
| Backend | Cloud Functions v2 (+1 v1) · firebase-admin · Node | 7.3 · 14.2 · 20 |
| Testes | Jest + jest-expo · Testing Library · `@firebase/rules-unit-testing` | 29 · 57 · 14 · 5 |
| Distribuição | EAS Build (Android) · Vercel (web) | — |

### 3.2 Padrões de arquitetura identificados

**Serverless client-direct (não REST/MVC).** Não existe API intermediária: o cliente fala direto
com o Firestore, e a autorização é feita pelas Security Rules + App Check. O backend serverless
existe para **uma única coisa** — disparar lembretes. Isso é uma escolha consciente registrada em
`PLAN.md §1.1`, e o código é fiel a ela.

**Camadas com fluxo unidirecional**, verificado no código:

```
app/ (rotas: só composição)
  └─> src/features/<feature>/  (hooks + repositório + schema)
        └─> src/services/firebase/  (init, auth, firestore, messaging, appCheck)
              └─> src/lib/  (puros: paths, csv, datetime, logger, hash)
                    └─> src/domain/  (puros: classificação, média de sessão)
```

- `app/` **nunca** importa `firebase/*` — confirmado; as rotas só consomem hooks.
- **Nenhum caminho de coleção como string literal**: tudo passa por `src/lib/firestore-paths.ts`
  (e, no projeto isolado das Functions, por `functions/src/lib/schedules.ts`).
- **Toda** leitura/escrita passa por um `*.repo.ts`; nenhum componente chama `getDocs`/`setDoc`.
- **Componente burro, hook esperto**: `SecondMeasurementCard`, `ReadingForm` e `ReadingRow`
  recebem props e devolvem desenho; quem sabe de rota e de estado é a tela/hook.

**Split de plataforma por extensão de arquivo, não por `if (Platform.OS)`.** Onze pares
`.native.ts`/`.web.ts` (firebase, appCheck, file, focus, crashReporter, signInWithGoogle,
reauthenticateWithGoogle, registerPushToken, localReminders, useForegroundPush,
useNotificationRedirect, useApplyThemePreference, DateTimeField). O `tsconfig.json` declara
`moduleSuffixes: ['.native', '']` — e o comentário explica por que `.web` **não** entra ali (isso
sequestraria o split interno de pacotes de terceiros que têm só um shim `.web`).

**Repositório com tradução de erro na fronteira.** Todo repo mapeia `permission-denied` e
`unavailable` para mensagens amigáveis em português antes de propagar; nenhum `error.message` cru
chega à tela. Offline nunca é tratado como erro — vira o selo "pendente de sincronização".

**Modelo de dados** (Firestore):

```
users/{uid}                     displayName, email, photoURL, timezone,
                                reminderTimes[], notificationsEnabled, createdAt, updatedAt
  └─ readings/{readingId}       systolic, diastolic, pulse?, measuredAt, createdAt, note?, source
  └─ devices/{tokenHash}        token, platform, lastSeenAt

schedules/{uid}                 nextRunAt, timezone, reminderTimes, tokens[], lastSentAt
                                ← exclusivo do Admin SDK (rules negam tudo)
```

Índice: campo único `readings.measuredAt DESC`, que cobre ordenação **e** o filtro de período do
export. A categoria de pressão **não** faz parte do modelo (é derivada); `measuredAt`/`createdAt`
viram `Date` no domínio, com a conversão do `Timestamp` isolada no schema Zod por *duck typing*
(`toDate()`), o que mantém o domínio livre do SDK.

**Estrutura de pastas real:**

```
app/                          # rotas Expo Router
  _layout.tsx  index.tsx  onboarding.tsx
  (auth)/  sign-in.tsx
  (app)/   index.tsx (registrar) · history.tsx · settings.tsx · edit-reading/[id].tsx
src/
  components/ui/              # 13 primitivos sem domínio + icons.ts (inventário único)
  components/bp/              # 11 componentes de domínio
  screens/                    # OnboardingScreen
  features/                   # auth · readings · reminders · export · onboarding · theme
  services/firebase/          # firebase · appCheck (pares .native/.web) + bootstrap
  services/                   # crashReporter (par .native/.web)
  domain/                     # bp-classification · session-average (puros)
  lib/                        # csv · datetime · logger · firestore-paths · file · focus · hash-token
  theme/                      # colors · tokens · useColorScheme
  types/                      # models.ts
functions/src/                # scheduler/ · triggers/ · lib/ (projeto TS isolado)
public/                       # PWA: manifest, ícones, firebase-messaging-sw.js
```

### 3.3 Qualidade como infraestrutura

- **ESLint com regras de arquitetura**, não só de estilo: `no-console` global (exceto
  `src/lib/logger.ts` e `public/**`), `no-restricted-imports` para o `useColorScheme` errado,
  resolver TypeScript configurado para enxergar o alias `@/` e os pares `.native`.
- **Duas suítes de teste separadas por dependência de infra**: `npm test` (Jest, sem infra externa,
  ~330 casos em 37 arquivos) e `npm run test:rules` (26 casos que exigem o emulador do Firestore,
  levantado por `firebase emulators:exec`).
- O `jest.config.js` carrega três correções de bundling documentadas linha a linha
  (`transformIgnorePatterns` para `firebase`/`@firebase`/`lucide-react-native`, transform de
  `.mjs`, mock manual do AsyncStorage) — cada uma com o sintoma que ela evita anotado.

### 3.4 Build e distribuição

- **Android**: EAS Build, três perfis (`development` com Dev Client, `preview`, `production` com
  `autoIncrement`). Um workflow do GitHub Actions dispara o build de desenvolvimento **manualmente**
  (`workflow_dispatch`), com justificativa explícita: automatizar por push queimaria a cota gratuita
  da EAS. As variáveis vêm de `eas env:pull`, evitando segredo duplicado em GitHub Secrets *e* EAS.
- **Web**: Vercel — `npx expo export -p web` → `dist/`, com rewrite catch-all para `/index.html`
  (coerente com `web.output: 'single'`), cache imutável para `_expo/static/**` e headers dedicados
  ao service worker (`Service-Worker-Allowed: /` + `no-cache`).
- **Config**: `app.config.ts` falha alto e cedo (`requireEnv`) se faltar variável, com mensagem
  apontando `.env.example`. A distinção entre público-por-design (config do Firebase, site key,
  DSN do Sentry) e credencial (debug token do App Check) está explicada no próprio arquivo e no
  `.env.example`.

---

## 4. ⚡ Como Rodar o Projeto

### 4.1 Pré-requisitos

- **Node 20** (é a `engines` das Functions e a versão do CI).
- **Java JDK 17** e Android SDK apenas se for gerar build local; o caminho recomendado é EAS.
- **Conta EAS** (`eas-cli`) para o Dev Client, e **Firebase CLI** (já vem como devDependency).
- **Projeto Firebase** com Auth (Google), Firestore, Cloud Messaging e Cloud Scheduler habilitados,
  na região `southamerica-east1` (as Functions estão fixadas nela).
- **`google-services.json`** baixado do Console (gitignored — precisa existir antes do primeiro
  build nativo).
- ⚠️ **Não use Expo Go**: Google Sign-In nativo e FCM exigem código nativo — sempre `--dev-client`.

### 4.2 Variáveis de ambiente

Copie `.env.example` para `.env.local` (gitignored):

| Variável | Obrigatória | Observação |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | ✅ | Config web do Firebase — **pública por design**; quem protege são as rules + App Check. |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | ✅ | |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ✅ | OAuth **Web** Client ID (não o Android). |
| `EXPO_PUBLIC_FIREBASE_VAPID_KEY` | ⬜ | Só para push na web; sem ela o app abre o popup explicativo. |
| `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` | ⬜ | Sem ela o App Check não inicializa (app segue funcionando). |
| `EXPO_PUBLIC_SENTRY_DSN` | ⬜ | Sem ela o coletor web vira no-op com aviso único. |
| `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` | ⛔ | **Somente dev.** É credencial, não config — nunca em build de produção nem em secrets de CI. |

### 4.3 Comandos

```bash
# Instalação
npm install
npm --prefix functions install

# Desenvolvimento
npx expo start --dev-client      # Android (Dev Client)
npx expo start --web             # navegador
npx expo start -c                # limpar cache do Metro (1º recurso em bug estranho de bundle)

# Qualidade — antes de qualquer commit
npm run lint
npm run typecheck
npm test
npm run test:rules               # sobe o emulador do Firestore automaticamente

# Firebase
firebase emulators:start                  # Auth + Firestore + Functions locais
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only functions          # roda o build das Functions no predeploy

# Build e distribuição
eas build --profile development --platform android
eas build --profile production  --platform android
npx expo export -p web                    # bundle web em dist/ (deploy pela Vercel)
```

> ⚠️ Nesta sessão de análise as dependências **não** estavam instaladas no container
> (`npm test` falha com `jest: not found`), então as suítes **não foram executadas** — a contagem de
> ~330 casos vem da leitura estática dos 37 arquivos de teste, não de uma execução verde.

---

## 5. 🌟 Pontos Fortes & Evolução Futura

### 5.1 Principais acertos

1. **Arquitetura respeitada, não só documentada.** As cinco "regras invioláveis" do `CLAUDE.md §3.2`
   se sustentam na varredura: `app/` sem `firebase/*`, zero caminho literal, domínio e lib puros,
   fluxo de dependência unidirecional, toda escrita em repositório. Isso é raro em projeto que
   cresce por sessões incrementais.
2. **Comentários que explicam o *porquê*, não o *o quê*.** O código carrega decisões com o
   contexto que as motivou, incluindo o sintoma observado (`app/(app)/history.tsx` documentando a
   reciclagem de células da FlashList; `_layout.tsx` das abas com a **aritmética de 74 dp** que
   explica a altura da barra; `nextRun.ts` com o transbordo do Luxon). Um mantenedor futuro não
   precisa redescobrir nenhum desses bugs.
3. **Acessibilidade como critério de aceite.** As contas de contraste estão **escritas na paleta**
   com o valor exato de cada razão; o alvo de toque de 48 dp virou token; o `Switch` foi envolvido
   por um `Pressable` porque o nativo é pequeno demais. Isso é engenharia, não checklist.
4. **Privacidade tratada como restrição de design.** As três barreiras do logger (tipo → throw em
   dev → sanitização em produção) formam uma defesa em profundidade real, e a decisão de nunca
   identificar o usuário no Sentry/Crashlytics é consistente entre as duas plataformas.
5. **Backend idempotente por construção.** O reagendamento em duas fases do `dispatchReminders` é
   uma solução correta e não óbvia para "o Scheduler pode reexecutar" — e está explicada no lugar
   onde importa.
6. **Degradação em vez de erro.** Push indisponível vira popup com alternativas úteis; lembrete
   local na web é no-op silencioso porque falhar ali pintaria de vermelho um salvamento bem
   sucedido; documento corrompido some da lista sozinho sem derrubar o resto.
7. **Testes onde o risco mora**: domínio, CSV, `nextRun` (DST e virada de dia) e Security Rules
   (usuário A tentando ler dados de B), exatamente como o `CLAUDE.md §4.6` exige.

### 5.2 Correções e refatorações prioritárias

| # | Item | Onde | Por que agora |
|---|---|---|---|
| 1 | **URL de política de privacidade é placeholder** | `app/(app)/settings.tsx` (`https://SUBSTITUIR-...exemplo`) | 🔴 **Bloqueia a publicação.** O app trata dado de saúde; a Play Store exige o link no *Data Safety form*. É decisão jurídica sua, não de código. |
| 2 | **Não há CI de qualidade** | `.github/workflows/` só tem o build EAS manual | Existem ~330 testes, lint e typecheck que **ninguém roda automaticamente**. Um workflow rodando `lint && typecheck && test` (e `test:rules` com o emulador) é o maior retorno por esforço do repositório inteiro. |
| 3 | **`RELEASE_CHECKLIST.md` está desatualizado** | Seção 0 | Ele afirma que `package.json`, `functions/package.json`, `functions/src/index.ts`, `eas.json` e `assets/` "não existem" — **todos existem hoje**. Um checklist de release que mente sobre bloqueios é pior que nenhum. |
| 4 | **Deriva entre documentação e código** | `CLAUDE.md` / `PLAN.md` | (a) Documentam **Zustand** e `src/store/` — nenhum dos dois existe; o estado de UI é Context + hooks locais, e funciona bem. (b) `CLAUDE.md` lista `firebase deploy --only hosting`, mas `firebase.json` **não tem bloco `hosting`** — a web sai pela Vercel. Ajuste os `.md` ao código real. |
| 5 | **App Check nativo não fecha o ciclo** | `src/services/firebase/appCheck.native.ts` | O `CustomProvider` depende de uma Cloud Function de troca de atestação do Play Integrity que **não existe**. Enquanto isso, o enforcement não pode ser ligado no Console sem quebrar o Android. |
| 6 | **`users/{uid}` não tem schema Zod** | `reminders.repo.ts`, `onUserSettingsWrite.ts`, `dispatchReminders.ts` | O `CLAUDE.md §3.1` manda todo documento passar por Zod; só `Reading` passa. Hoje há **três** validações defensivas ad hoc do mesmo documento, em dois projetos. |
| 7 | **`functions/` fora do ESLint** | `eslint.config.js` (`globalIgnores`) | O backend é o código com maior custo de falha silenciosa e é o único sem lint. |
| 8 | **Duplicações pequenas** | `average()` em `history.tsx` e `useReadingsTrend.ts`; `getErrorCode()` repetido em 4+ arquivos | Candidatos naturais a `src/lib/`. |
| 9 | **Três slots fixos de lembrete** | `settings.tsx` (`DEFAULT_SLOTS`) | As rules aceitam até 8 `reminderTimes` e o backend lida com N horários; a UI trava em 3. Ampliar é barato e o produto já suporta. |
| 10 | **Média da sessão sobrescreve a 1ª leitura** | `useSecondMeasurementFlow` | Decisão de escopo consciente, mas **as duas leituras individuais se perdem** — dado que um médico pode querer ver. Vale registrar como dívida antes que vire modelagem herdada. |

### 5.3 Evolução de produto sugerida

**Curto prazo (alto impacto, esforço baixo/médio):**

1. **Relatório em PDF para o médico.** O CSV é ótimo para planilha e ruim para uma consulta de 15
   minutos. Um PDF com gráfico de tendência + tabela do período + média do intervalo reaproveita
   dado que já existe (`computeDailyTrend`, `getAllReadings`, `classifyBloodPressure`).
2. **Média consolidada da semana/mês como número único.** Os dados e a agregação diária já estão
   prontos; falta só o card. É a informação que o usuário efetivamente relata ao médico.
3. **Meta pessoal + indicador de aderência.** Hoje o app classifica cada medição isoladamente. "Meu
   médico pediu abaixo de 135/85" e "bati 3x/dia em 5 dos 7 dias" são as métricas que traduzem o
   objetivo central do produto em algo que o usuário vê.

**Médio prazo:**

4. **Widget de tela inicial (Android).** É a extensão mais direta da meta de "≤ 10 s e 4 toques" —
   elimina até o passo de abrir o app. Exige módulo nativo.
5. **iOS.** O `bundleIdentifier` já está reservado, mas não existe pipeline, credencial nem
   `GoogleService-Info.plist`. **Atenção:** a App Store rejeita login social de terceiros sem *Sign
   in with Apple* — o "Google como provedor único" precisa ser revisitado **antes**, não depois.
6. **Modo cuidador / perfil de terceiro.** Boa parte do público mede a pressão de um pai idoso, não
   a própria. É a mudança de **maior risco de arquitetura** da lista: o modelo atual
   (`users/{uid}` dono único) não comporta isso sem decisão prévia de modelagem (perfis dentro da
   conta × conta compartilhada por convite) e revisão completa das rules.

**Longo prazo:**

7. **Integração Bluetooth com aparelhos de pressão.** O campo `source: 'manual'` já está reservado
   no modelo (hoje um `z.literal`, que rejeitaria outro valor). Elimina o erro de digitação, mas
   cada fabricante tem protocolo próprio — não deveria ser priorizado antes de o produto provar
   retenção com registro manual.

---

## Resumo executivo

O BP Tracker é um app **maduro e coerente**: a arquitetura declarada é a arquitetura implementada,
as decisões difíceis (idempotência do disparo, horário de verão, contraste, LGPD, split de
plataforma) estão resolvidas **e documentadas no ponto onde importam**, e a cobertura de teste está
onde o risco mora.

O que separa o repositório de um lançamento não é código de produto — é **operação**: uma política
de privacidade real, um CI que rode os testes que já existem, um checklist de release que reflita a
realidade e o fechamento do ciclo de App Check no Android. Feito isso, a maior alavanca de produto é
levar o dado até o médico (PDF + média consolidada + meta pessoal), que reaproveita quase tudo que
já está construído.
