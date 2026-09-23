# Relatório de Status — BP Tracker

> Gerado em 2026-09-23, cruzando todos os documentos de planejamento em `docs/plans/` (exceto
> `README.md`/`CLAUDE.md`) com o estado real do código na branch atual (`HEAD` em `f15f01f`, 137
> commits). Metodologia: leitura integral dos 15 arquivos de plano/prompt, mais `PLAN.md` e
> `RELEASE_CHECKLIST.md`, seguida de verificação item a item no código (`app/`, `src/`,
> `functions/src/`, `firestore.rules`, configs de build/deploy) via leitura direta e busca. Onde
> plano e código divergem, o código manda — os `.md` de planejamento são, em vários casos,
> instantâneos de sessões passadas (datados entre 2026-08-13 e 2026-08-27) que já foram superados
> por trabalho posterior.

---

## Resumo Executivo

O BP Tracker está **funcionalmente maduro**: todas as 8 fases do plano original (`PLAN.md §5`,
Fundação → Polimento e lançamento) têm código correspondente e testado, e as duas rodadas de
auditoria de bugs/UX (`plano_de_correcoes.md`, `plano_ux_mobile.md`) tiveram **quase 100% dos
itens corrigidos** — a exceção sistemática é a URL de política de privacidade, que depende de uma
decisão jurídica fora do código. As três "sugestões de produto" mais recentes do roadmap (segunda
medição AHA, onboarding com técnica de medição, coletor de erro web) também já foram implementadas
por completo, incluindo testes.

**Estimativa de conclusão:**
- **MVP descrito em `PLAN.md` (Fases 0–7): ~95%.** O que falta não é código de produto, é
  **operação de lançamento**: política de privacidade real, CI automatizado, fechamento do ciclo
  de App Check nativo (Play Integrity) e os ativos/formulários da Play Store.
- **Roadmap de evolução (`roadmap_futuro.md`, 10 itens originais): 3/10 entregues** (coletor de
  erro web, segunda medição AHA, onboarding de técnica) — os 7 restantes (PDF, meta/aderência,
  iOS, Bluetooth, Sign in with Apple, modo cuidador, widget) seguem sem nenhum código.
- **Planos estratégicos de negócio** (`plano_de_monetizacao.md`, `plano_de_ecossistema.md`,
  `integracao_google_agenda.md`): são documentos de decisão, não de implementação, e nenhum tem
  vestígio de código — confirmado por busca (nenhuma dependência de billing/calendar/ecosystem no
  `package.json`).

O maior risco encontrado não é uma lacuna de feature: é que **dois documentos operacionais mentem
sobre o estado do repositório**. `RELEASE_CHECKLIST.md` ainda afirma que `package.json`,
`functions/package.json`, `functions/src/index.ts`, `eas.json`, `assets/` e
`public/firebase-messaging-sw.js` "não existem" — todos existem hoje. `CLAUDE.md`/`PLAN.md`
documentam `firebase deploy --only hosting` e o uso de Zustand — nenhum dos dois é verdade no
código atual (deploy web é via Vercel; estado de UI é Context + hooks locais). Ver §Divergências.

---

## Funcionalidades Concluídas

### Núcleo do produto (PLAN.md Fases 0–5)
- **Autenticação Google** (nativo + web), sessão via Context, gate de navegação, criação/merge de
  perfil no primeiro login — `src/features/auth/` (`signInWithGoogle.native.ts`/`.web.ts`,
  `useSession.tsx`, `useAuthRedirect.ts`, `ensureUserProfile.ts`).
- **CRUD completo de medições**, incluindo **edição** (não estava no PLAN.md original, foi
  adicionada depois): criar (`useAddReading.ts`), ler em tempo real com offline
  (`useReadings.ts`, `onSnapshot` + `hasPendingWrites`), atualizar (`useUpdateReading.ts`,
  `app/(app)/edit-reading/[id].tsx`), excluir com confirmação e trava de duplo toque
  (`app/(app)/history.tsx`, `ReadingRow.tsx`). Validação em duas camadas com uma fonte de faixas
  (`reading-field-errors.ts` + `reading.schema.ts`, Zod).
- **Classificação de PA pura e testada** (18 casos, incluindo todas as bordas) —
  `src/domain/bp-classification.ts`.
- **Segunda medição — protocolo AHA**: máquina de estados (`useSecondMeasurementFlow.ts`), média
  pura (`src/domain/session-average.ts`), pop-ups de convite/medição/resumo
  (`SecondMeasurementOfferDialog.tsx`, `SecondMeasurementDialog.tsx`,
  `SecondMeasurementSummaryDialog.tsx`). Ver §Divergências para como o comportamento final diverge
  do prompt original que o especificou.
- **Histórico**: agrupado por dia local, cabeçalhos fixos com média do dia, `FlashList`,
  `app/(app)/history.tsx`. **Gráfico de tendência** 7/30 dias com linhas de grade
  (`src/components/bp/TrendChart.tsx`).
- **Export CSV**: BOM UTF-8, separador `;`, diretiva `sep=;`, atalhos 7/30/tudo/período
  personalizado com seletor de datas (`src/lib/csv.ts`, `useExportCsv.ts`, `ExportCsvDialog.tsx`).
- **Lembretes — cliente**: horários configuráveis (padrão 08h/14h/20h), permissão pedida só ao
  ativar o switch, token FCM nativo persistido em `devices/{hash}`, popup explicativo quando push
  web está indisponível (sem VAPID ou navegador sem suporte), reforço local no Android
  (`localReminders.native.ts`), deep link `bptracker://record`
  (`src/features/reminders/`, `app/(app)/settings.tsx`).
- **Lembretes — backend** (a única razão de ser do servidor, `functions/src/`): `dispatchReminders`
  (cron `*/15min`, reagendamento em duas fases antes do envio, janela anti-spam de 2h, poda de
  tokens mortos), `onUserSettingsWrite` e `onDeviceWrite` (mantêm `schedules/{uid}`),
  `onUserDelete` (limpeza completa via `recursiveDelete`). `computeNextRun` com 16 testes cobrindo
  DST e virada de dia (`functions/src/lib/nextRun.ts`).
- **Onboarding**: tela de 4 passos (funcionalidades → como medir corretamente → categorias →
  pronto para começar), aberta automaticamente no primeiro login por aparelho e reaberta via "Como
  usar o app" em Ajustes — `src/screens/OnboardingScreen.tsx`, `src/features/onboarding/`,
  `app/onboarding.tsx`.
- **Tema claro/escuro/automático**, persistido por aparelho — `src/features/theme/`.

### Segurança, observabilidade e infraestrutura
- **Firestore Security Rules** com 26 casos de teste (`tests/firestore.rules.test.ts`) — isolamento
  por `uid`, `hasOnly`/`hasAll`, faixas numéricas, `systolic > diastolic`, `measuredAt` sem futuro,
  `createdAt` imutável, `schedules/{uid}` exclusivo do Admin SDK.
- **App Check** — web funcional (reCAPTCHA Enterprise, modo tolerante); nativo com o código cliente
  pronto mas **bloqueado** por falta da Cloud Function de troca de atestação (ver
  §Parcialmente Implementadas).
- **Logger com 3 barreiras contra vazamento de dado de saúde/PII** (tipo → throw em dev →
  sanitização em produção) — `src/lib/logger.ts`.
- **Crash reporting em produção nas duas plataformas**: Crashlytics nativo
  (`src/services/crashReporter.native.ts`) e Sentry na web
  (`src/services/crashReporter.web.ts`, `@sentry/browser`, `sendDefaultPii: false`, sem
  `Sentry.setUser`) — item que o roadmap listava como pendente, hoje 100% resolvido nas duas
  pontas.
- **~350 testes** em 38 arquivos (`src/`) + 26 casos de rules + 16 de `nextRun` nas Functions.

### Correções de bugs e UX (auditorias `plano_de_correcoes.md` e `plano_ux_mobile.md`)
11 de 12 bugs do `plano_de_correcoes.md` corrigidos (o 12º é a URL de política de privacidade,
pendente por design — ver §Pendentes), incluindo: `Alert.alert` (no-op na web) trocado por
`ConfirmDialog` em todos os pontos; `DateTimePicker` com par `.native`/`.web.tsx` funcional; botão
de excluir sempre visível (`ReadingRow.tsx`); App Check inicializado; persistência offline do
Firestore habilitada na web (`persistentLocalCache`); feedback de sucesso ao salvar horários; ids
estáveis nos slots de lembrete (sem `key={index}`). Todos os 3 problemas priorizados (P1–P3) da
auditoria de UX mobile corrigidos: `KeyboardAvoidingView` em `Screen.tsx`, alvos de toque de 48dp
nos `Switch` de Ajustes, gap do `ConfirmDialog`.

### Melhorias mais recentes (`prompts_melhorias_registrar_historico_ajustes.md` — 10/10 prompts)
Accordion de pulso/observação no formulário (`ReadingForm.tsx`), card "Ajuda" dedicado em Ajustes,
mensagem de erro amigável ao ativar push na web, linhas de grade no gráfico, `DateTimeField` com
modo somente-data, filtro de período em `getAllReadings`/`useExportCsv` reaproveitando o índice de
`measuredAt`, diálogo de exportação com período personalizado.

---

## Funcionalidades Parcialmente Implementadas

- **App Check nativo (Android) não fecha o ciclo.** `src/services/firebase/appCheck.native.ts`
  espera um `attestationExchange` (troca de atestação Play Integrity via Cloud Function), mas essa
  Function **não existe** em `functions/src/` (só as 4 de lembretes). Sem ela, o enforcement de
  App Check não pode ser ativado no Console sem quebrar o Android.
- **`users/{uid}` sem schema Zod.** Só `Reading` passa por um schema Zod
  (`reading.schema.ts`), como o `CLAUDE.md §3.1` exige para todo documento do Firestore. O perfil
  do usuário é validado de forma ad hoc em pelo menos 3 lugares (`reminders.repo.ts`,
  `onUserSettingsWrite.ts`, `dispatchReminders.ts`), com o risco de divergência entre eles.
  Documentado como dívida conhecida em comentário no próprio `reminders.repo.ts:31`.
- **Horários de lembrete travados em 3 slots fixos na UI**, embora as rules aceitem até 8
  `reminderTimes` e o backend (`dispatchReminders`, `computeNextRun`) já suporte N horários —
  `app/(app)/settings.tsx` (`DEFAULT_SLOTS`). Ampliar é uma mudança pequena e o produto já suporta.
- **CI de qualidade inexistente.** `.github/workflows/` só tem o build manual do EAS
  (`eas-build.yml`). Os ~350 testes, lint e typecheck existem mas **não rodam automaticamente** em
  nenhum PR/push — o maior retorno por esforço pendente no repositório.
- **`functions/` fora do lint.** `eslint.config.js` tem `functions/**` em `globalIgnores` — o
  backend (maior custo de falha silenciosa) é o único código sem verificação estática automatizada.
- **Pequenas duplicações não consolidadas**: `average()` existe em duas implementações
  independentes (`app/(app)/history.tsx:45` e `useReadingsTrend.ts:37`); `getErrorCode()` está
  duplicado em 5 arquivos (`reminders.repo.ts`, `readings.repo.ts`, `deleteAccount.ts`,
  `useSession.tsx`, `reauthenticateWithGoogle.web.ts`) em vez de centralizado em `src/lib/`.
- **Readiness de release (`RELEASE_CHECKLIST.md`)**: os bloqueios de estrutura (seção 0 do
  checklist) já foram todos resolvidos no código, mas os itens que dependem de credencial/decisão
  externa continuam abertos: `google-services.json` real, `.env.local` com valores reais,
  keystore/fingerprint de produção no Firebase Console, domínio final no reCAPTCHA Enterprise,
  Data Safety form e assets da Play Store (feature graphic, screenshots — o ícone do app em si já
  existe em `assets/`).

---

## Funcionalidades Pendentes

Itens presentes nos planos, sem nenhum código correspondente hoje:

- **URL real da política de privacidade** — `app/(app)/settings.tsx:41` ainda tem
  `PRIVACY_POLICY_URL = 'https://SUBSTITUIR-...exemplo'`. **Bloqueia a publicação** (dado de saúde
  exige o link no Data Safety form da Play Store); decisão jurídica, não de engenharia.
- **Card de média semanal/mensal consolidada** (`plano_de_funcionalidades.md`, item 2) — os dados
  para calcular já existem (`computeDailyTrend`, `getAllReadings`), mas não há
  `computeWindowAverage` nem componente de card com esse número único.
- **Relatório em PDF para o médico** (`roadmap_futuro.md`, sugestão #1) — reaproveitaria o mesmo
  dado do CSV/gráfico; zero código.
- **Meta pessoal + indicador de aderência** (`roadmap_futuro.md`, sugestão #2) — o app só classifica
  cada medição isoladamente; não existe conceito de meta definida pelo médico nem de "bati 3x/dia
  em N dos 7 dias".
- **Suporte a iOS** (`roadmap_futuro.md`, item 1) — só o `bundleIdentifier` está reservado em
  `app.config.ts`; nenhum pipeline de build, credencial ou `GoogleService-Info.plist`.
- **Sign in with Apple** (`roadmap_futuro.md`, sugestão #3) — pré-requisito obrigatório da App
  Store para qualquer build iOS com login Google; zero código.
- **Integração Bluetooth com aparelhos de pressão** (`roadmap_futuro.md`, item 2) — o campo
  `source` do modelo é `z.literal('manual')`, ou seja, o schema **rejeita** qualquer outro valor
  hoje; é um lugar reservado, não uma feature parcial.
- **Modo cuidador / perfil de terceiro** (`roadmap_futuro.md`, sugestão #4) — o modelo
  `users/{uid}` dono único não comporta isso sem decisão prévia de modelagem.
- **Widget de tela inicial (Android)** (`roadmap_futuro.md`, sugestão #6) — exige módulo nativo,
  nenhum código.
- **Monetização** (`plano_de_monetizacao.md`) — seis estratégias avaliadas (afiliados, freemium/Pro
  com `entitlements/{uid}`, vitalício via Pix, B2B/painel médico, AdMob — explicitamente
  recomendado **não fazer**, IA/insights) — nenhuma tem código; recomendação do documento é
  sequenciar afiliados+Pix primeiro (zero infra nova).
- **Ecossistema de micro-rotinas** (`plano_de_ecossistema.md`) — análise concluiu que o BP Tracker
  e o `RamonMenz/rastreador-de-metas` **não compartilham nada tecnicamente** hoje; recomendação é
  convergência por marca/monorepo, não fusão de código. Zero implementação.
- **Integração com Google Agenda** (`integracao_google_agenda.md`) — documento de decisão recomenda
  começar pela Opção A (link `calendar.google.com/render`, sem OAuth); nenhuma das duas opções foi
  implementada — hoje o popup de push indisponível só sugere a ideia em texto, sem gerar o link.

---

## Divergências

Pontos onde a arquitetura ou o comportamento implementado difere do que os documentos de
planejamento descrevem:

1. **Deploy web é Vercel, não Firebase Hosting.** `CLAUDE.md §2` e `PLAN.md` documentam
   `firebase deploy --only hosting`, mas `firebase.json` **não tem bloco `hosting`** — o projeto
   tem `vercel.json`/`.vercelignore` reais e funcionais, com o front publicado pela Vercel. O
   comando documentado simplesmente não funciona no estado atual.
2. **Zustand nunca foi implementado.** `PLAN.md §1.2` e `CLAUDE.md §3.2` descrevem
   `src/store/session.store.ts` (Zustand) para estado global de UI — o diretório `src/store/` não
   existe, `zustand` não está no `package.json`. O estado de UI é resolvido inteiramente por
   Context (`useSession.tsx`) e hooks locais por feature, e funciona sem os problemas que o Zustand
   deveria evitar.
3. **A média da segunda medição É persistida, contrariando o escopo escrito originalmente.**
   `prompts_segunda_medicao_e_onboarding_tecnica.md` (cabeçalho, "Escopo do item 5") é explícito:
   *"a média das duas é calculada e mostrada só no CLIENTE, na hora, e nunca persistida"*. O código
   entregue (commit `eae4a86`, `useSecondMeasurementFlow.ts`) faz o oposto: `submitSecondMeasurement`
   chama `updateReading` e **sobrescreve o documento da primeira medição com a média** — as duas
   leituras individuais se perdem. Foi uma decisão de produto tomada durante a implementação (e
   registrada como dívida em `panorama_do_projeto.md §5.2 item 10`), não um bug, mas diverge do
   documento que especificou a feature.
4. **UI da segunda medição virou pop-up, não um card inline reaproveitando o formulário.** O
   prompt original (5.3) pedia um único `SecondMeasurementCard` com três variações visuais,
   reaproveitando a mesma instância do `ReadingForm` para a segunda leitura. A versão em produção
   (commits `348355d`, `201dafe`, `1cc91ca`) usa três diálogos pop-up separados
   (`SecondMeasurementOfferDialog`, `SecondMeasurementDialog`, `SecondMeasurementSummaryDialog`)
   com um formulário próprio e reduzido (só sistólica/diastólica/pulso), decisão tomada depois em
   `prompts_melhorias_registrar_historico_ajustes.md`, que supersede o desenho original.
5. **`RELEASE_CHECKLIST.md` está desatualizado e contradiz o repositório.** Sua "Seção 0 —
   Pré-requisitos bloqueantes" afirma que `package.json`, `functions/package.json`,
   `functions/src/index.ts`, `eas.json`, `assets/` e `public/firebase-messaging-sw.js` "não
   existem" — todos os seis existem e estão funcionais hoje. Um checklist de release que erra sobre
   bloqueios é pior do que nenhum checklist.
6. **Os próprios planos se contradizem entre si por causa da defasagem temporal.**
   `plano_de_funcionalidades.md` (reauditoria de 2026-08-17) já dava CRUD completo, push web e
   Cloud Functions como prontos, enquanto `prompts_de_funcionalidades.md` (mesma pasta, gerado
   antes) ainda os tratava como pendentes. `roadmap_futuro.md` (2026-08-17) lista "coletor de erro
   web" como aberto num item e como **resolvido** três parágrafos depois. Nenhum desses documentos
   deveria ser lido como fonte de verdade isolada — só a leitura do código resolve a ambiguidade
   (é o método usado neste relatório).
7. **Superfície de horários de lembrete é mais estreita do que o back-end suporta.** As rules
   aceitam até 8 `reminderTimes` e `computeNextRun` já é genérico para N horários, mas a tela de
   Ajustes só oferece 3 slots fixos (manhã/tarde/noite) — um limite de produto, não uma limitação
   técnica herdada do plano original.
