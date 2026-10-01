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
- **294 testes Jest** em 36 suítes (app) + 16 de `nextRun` nas Functions + 26 casos de rules —
  executados em 2026-10-01: os dois primeiros grupos passam; a suíte de rules falha por
  configuração (ver item 2 de "Custo de Não Agir").

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
  (`eas-build.yml`). Os ~336 testes, lint e typecheck existem mas **não rodam automaticamente** em
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

---

## Custo de Não Agir × Benefício de Corrigir

Cada item das três seções anteriores, agrupado pelo **momento certo de agir**. Itens que
apareciam em mais de uma seção (ex.: política de privacidade, slots de lembrete) foram unidos.
"Esforço" é uma estimativa relativa: **baixo** = horas, **médio** = 1–3 dias, **alto** = semanas
ou exige decisão de arquitetura antes do código.

Nem todo item vale a pena corrigir agora: para alguns, deixar como está **é** a decisão certa por
enquanto, e isso está dito explicitamente.

### Nível 1 — Bloqueiam o lançamento ou expõem o projeto a risco

**1. URL da política de privacidade (placeholder)** · esforço baixo no código, depende de decisão
jurídica
- **Perda se ficar como está:** o app **não pode ser publicado** na Play Store — app que coleta dado
  de saúde sem política de privacidade é recusado no Data Safety form. Hoje o link "Política de
  privacidade" em Ajustes abre um domínio inexistente: se alguém instalar uma build de teste, o
  primeiro contato com a sua postura de privacidade é uma página de erro, num app que pede dado
  sensível (LGPD). Também trava toda a monetização, que pressupõe app publicado.
- **Ganho ao corrigir:** destrava a publicação e o formulário da loja; dá ao usuário a resposta
  para "onde ficam meus dados?" e cumpre o dever de transparência da LGPD. A troca no código é uma
  linha; o trabalho real é escrever o texto.

**2. CI de qualidade (lint + typecheck + testes)** · esforço baixo
- **Perda se ficar como está:** nada roda sozinho, e o efeito disso já é visível: rodando tudo
  manualmente em 2026-10-01, lint, typecheck, Jest (294 testes) e Functions (16 testes) passam,
  mas **a suíte de Security Rules (`npm run test:rules`) falha nos 26 casos** — não por erro nas
  rules, e sim porque `jest.rules.config.js` usa o preset `jest-expo`, que substitui o `fetch` e
  impede a suíte de alcançar o emulador. Ou seja: os testes que provam que o usuário A não lê os
  dados de B **provavelmente nunca rodaram**, e ninguém percebeu. O projeto cresce por sessões de
  IA independentes; sem CI, uma regressão em `nextRun.ts` (horário de verão) ou nas rules
  (isolamento entre usuários) só aparece em produção.
- **Ganho ao corrigir:** todo PR passa a provar que não quebrou nada; o investimento já feito em
  testes começa a render. É o maior retorno por esforço do repositório — um workflow de algumas
  dezenas de linhas protege todo o resto.

**3. `RELEASE_CHECKLIST.md` desatualizado** · esforço baixo
- **Perda se ficar como está:** o checklist diz que `package.json` "não existe" e que o
  **"primeiro passo real" é rodar `npx create-expo-app` na raiz**. Quem seguir isso à risca —
  você numa semana corrida, ou uma sessão de IA que leia o arquivo como instrução — pode gerar um
  projeto novo por cima do existente. No mínimo, gasta tempo resolvendo bloqueios que não existem
  e perde confiança nos itens que **são** reais (keystore, Data Safety, fingerprint SHA-1).
- **Ganho ao corrigir:** volta a ser um roteiro confiável até a Play Store, com só os bloqueios
  verdadeiros — quase todos 🔴 (credenciais e decisões suas), o que deixa claro que a
  engenharia já fez a parte dela.

**4. App Check nativo sem a Function de atestação (Play Integrity)** · esforço médio
- **Perda se ficar como está:** o enforcement do App Check não pode ser ligado sem derrubar o
  Android, então o Firestore aceita requisições de **qualquer cliente** que use a config pública
  com uma conta Google qualquer. As rules continuam isolando os dados por usuário — **não há
  vazamento entre contas** —, mas qualquer um pode criar contas e escrever volume de dados para
  inflar sua conta do Firebase ou automatizar abuso. O `PLAN.md` trata o App Check como
  "complemento obrigatório", e hoje ele protege só a web.
- **Ganho ao corrigir:** só o seu app (íntegro, instalado pela Play Store) fala com o backend;
  custo previsível e uma camada a mais de defesa para dado de saúde. Atenção à dependência: só dá
  para validar depois que o app estiver no Play Console (internal testing) — não é bloqueio do
  primeiro build, mas deveria entrar logo depois.

### Nível 2 — Baratos e evitam problemas futuros (fazer logo)

**5. Documentação dizendo Firebase Hosting quando o deploy é Vercel** · esforço baixo
- **Perda se ficar como está:** `firebase deploy --only hosting` falha. Pior: alguém (ou uma sessão
  de IA seguindo o `CLAUDE.md`) "conserta" adicionando um bloco `hosting` e passa a existir **dois
  sites web** com versões diferentes — e o domínio do reCAPTCHA Enterprise, o service worker de
  push e o link da política de privacidade passam a depender de qual URL o usuário abriu.
- **Ganho ao corrigir:** um único caminho de deploy, documentado como de fato funciona.

**6. Documentação citando Zustand e `src/store/`** · esforço baixo
- **Perda se ficar como está:** o `CLAUDE.md` é lido como **instrução** por toda sessão de IA. Uma
  sessão futura que precise de estado global vai seguir o documento, instalar Zustand e criar
  `src/store/` — uma dependência e um segundo padrão de estado que o app nunca precisou,
  convivendo com o Context que já funciona.
- **Ganho ao corrigir:** a documentação descreve o padrão real (Context + hooks por feature) e as
  próximas mudanças seguem o mesmo caminho.

**7. Planos em `docs/plans/` que se contradizem** · esforço baixo
- **Perda se ficar como está:** cada documento é um retrato de uma data, e vários dão como pendente
  algo que já está pronto. Quem abrir um deles isolado (inclusive uma sessão de IA recebendo um
  prompt antigo) pode reimplementar uma feature existente ou "corrigir" algo já corrigido.
- **Ganho ao corrigir:** um aviso no topo de cada plano antigo ("registro histórico — estado atual
  em `docs/STATUS_REPORT.md`") resolve sem reescrever nada.

**8. `users/{uid}` sem schema Zod** · esforço baixo-médio
- **Perda se ficar como está:** o mesmo documento é validado de três formas diferentes, em dois
  projetos (app e Functions). Quando o modelo mudar — e muda em qualquer feature do roadmap, como
  meta pessoal ou monetização —, basta esquecer um dos três lugares para o app aceitar um perfil
  que o backend trata de outro jeito (ex.: um fuso horário inválido aceito no cliente que faz o
  lembrete deixar de ser agendado, sem erro visível). Também descumpre uma regra explícita do
  `CLAUDE.md §3.1`.
- **Ganho ao corrigir:** uma fonte única de verdade para o perfil, que vira a base segura para
  qualquer campo novo (meta, plano Pro, preferências).

**9. `functions/` fora do ESLint** · esforço baixo
- **Perda se ficar como está:** o backend que dispara os lembretes — a razão de ser do produto — é
  o único código sem verificação automática. As regras que protegem o app (sem `console`, sem
  `any`, imports organizados) não valem ali; a própria regra do `CLAUDE.md §4.5` (usar o `logger`
  das Functions, nunca `console`) não é verificada.
- **Ganho ao corrigir:** o mesmo padrão de qualidade no código com maior custo de falha silenciosa.
  Combina naturalmente com o item 2 (CI).

**10. Duplicações (`average()` ×2, `getErrorCode()` ×5)** · esforço baixo
- **Perda se ficar como está:** hoje as duas `average()` são idênticas — o risco é **futuro**: se
  alguém mudar o arredondamento num lugar só, o cabeçalho do dia no Histórico e o ponto do
  gráfico passam a mostrar médias diferentes para o mesmo dia, o que destrói a confiança no dado.
  Com `getErrorCode()` em 5 arquivos, um código de erro novo do Firebase tratado num repositório
  continua aparecendo como mensagem genérica nos outros.
- **Ganho ao corrigir:** uma única regra de média e de tradução de erro. Ganho pequeno, mas
  praticamente sem risco — bom candidato para fazer junto de outra mudança nesses arquivos.

### Nível 3 — Decisões de produto com perda real para o usuário

**11. Segunda medição sobrescreve a primeira com a média** · esforço médio (exige mudar modelo de
dados + rules + índices, `CLAUDE.md §3.3`)
- **Perda se ficar como está:** as duas leituras individuais **desaparecem** e o documento salvo
  não indica que é uma média — no histórico e no CSV que vai para o médico, uma média de 128/84 é
  indistinguível de uma medição única. Se as duas leituras foram muito diferentes (ex.: 150 e
  120), essa variação — que pode interessar ao médico — some sem deixar rastro. Também diverge do
  que o próprio plano da feature prometia ("a média nunca é persistida"). Quanto mais tempo
  passar, mais dado histórico fica nesse formato e não pode ser recuperado.
- **Ganho ao corrigir:** registro clínico fiel (as duas leituras + a média identificada como tal),
  CSV/PDF mais úteis para o médico. Se a decisão for **manter** como está, o ganho mínimo é
  marcar o documento como média (um campo a mais) — o que já evita a ambiguidade.

**12. Lembretes travados em 3 horários fixos** · esforço baixo-médio (só UI; backend e rules já
suportam até 8)
- **Perda se ficar como está:** quem foi orientado a medir 2x ou 4x ao dia, ou em horários que não
  encaixam em manhã/tarde/noite (turno noturno), não consegue configurar. Hoje é possível
  **desligar** slots, mas não adicionar. Para o público central (3x/dia), a perda é pequena.
- **Ganho ao corrigir:** o app atende prescrições diferentes sem nenhuma mudança no backend —
  aproveita uma capacidade já construída e testada.

**13. Card de média semanal/mensal** · esforço baixo-médio
- **Perda se ficar como está:** a pergunta que o médico mais faz — "como está sua pressão em
  média?" — não tem resposta direta no app; o usuário precisa estimar olhando o gráfico ou abrir
  o CSV numa planilha.
- **Ganho ao corrigir:** um número único que o usuário mostra na consulta, usando dados e agregação
  que já existem. Alto valor percebido para pouco código; também é a base do relatório em PDF.

**14. Integração com Google Agenda (Opção A — link)** · esforço baixo
- **Perda se ficar como está:** na web sem push (iPhone, navegador sem suporte, VAPID ausente) o
  usuário **não recebe lembrete nenhum** — o objetivo central do produto falha nesse cenário. O
  popup já sugere "crie lembretes no Google Agenda", mas deixa todo o trabalho com o usuário, e
  quem precisa criar três eventos recorrentes à mão geralmente não cria.
- **Ganho ao corrigir:** um toque gera os eventos recorrentes já preenchidos com os horários do
  usuário, sem OAuth, sem backend novo e sem dado de saúde saindo do app. Fecha a lacuna de
  lembrete na web por um custo muito baixo.

### Nível 4 — Evolução de produto (depois do lançamento)

**15. Relatório em PDF para o médico** · esforço médio
- **Perda se ficar como está:** o único formato de saída é CSV, que serve para planilha mas não
  para uma consulta de 15 minutos; o app não chega de fato ao médico. É também a feature Pro mais
  natural no plano de monetização.
- **Ganho ao corrigir:** o dado do usuário vira algo que o médico usa; diferencial claro em relação
  a anotar no papel.

**16. Meta pessoal + indicador de aderência** · esforço médio
- **Perda se ficar como está:** o app cobra "meça 3x ao dia" mas nunca mostra se o usuário está
  conseguindo; sem esse retorno, o hábito perde força, e retenção é exatamente o problema que o
  produto existe para resolver.
- **Ganho ao corrigir:** o objetivo central do produto vira algo visível ("5 de 7 dias completos",
  "dentro da meta do seu médico"), o que tende a sustentar o uso. Depende do item 8 (schema do
  perfil) para guardar a meta com segurança.

**17. iOS + Sign in with Apple** · esforço alto (conta Apple Developer + pipeline + login novo)
- **Perda se ficar como está:** o app não alcança quem usa iPhone, parcela relevante do público. Na
  web do iPhone o push é limitado, então esse usuário hoje fica sem lembrete (ver item 14).
- **Ganho ao corrigir:** mercado potencial maior. Atenção: a App Store **rejeita** login com Google
  sem Sign in with Apple, então os dois itens andam juntos e mudam a decisão "Google como provedor
  único" do `CLAUDE.md` — decidir isso antes de começar.

**18. Widget de tela inicial (Android)** · esforço médio-alto (módulo nativo)
- **Perda se ficar como está:** pequena — o fluxo atual (notificação → formulário) já cumpre a meta
  de ≤ 10 s.
- **Ganho ao corrigir:** registro sem abrir o app e um lembrete visual permanente na tela inicial.
  Bom, mas não urgente.

**19. Modo cuidador / perfil de terceiro** · esforço alto (decisão de modelagem + revisão completa
das rules)
- **Perda se ficar como está:** quem mede a pressão de um pai ou mãe idosos acaba entrando com a
  conta Google **da outra pessoa** no próprio celular — pior para a segurança e para a privacidade
  do que uma solução desenhada para isso.
- **Ganho ao corrigir:** atende um uso real do público. É a mudança de **maior risco de arquitetura**
  da lista; não começar sem antes decidir o modelo (perfis dentro da conta × convite).

**20. Integração Bluetooth com aparelhos** · esforço alto
- **Perda se ficar como está:** o usuário continua digitando os números e pode errar a digitação.
- **Ganho ao corrigir:** menos atrito e menos erro. Mas cada fabricante tem um protocolo, e o
  schema hoje rejeita qualquer `source` que não seja `'manual'`. **Deixar como está é a decisão
  certa** até o produto provar retenção com o registro manual.

### Nível 5 — Estratégia de negócio (deixar como está, por ora, é correto)

**21. Monetização** · esforço variável por estratégia
- **Perda se ficar como está:** zero receita — mas hoje o app nem está publicado, então não há
  receita possível de qualquer forma.
- **Ganho ao corrigir:** receita, seguindo a ordem recomendada no próprio plano (afiliados e Pix
  primeiro, sem infraestrutura nova). Pré-requisito: os itens 1 (política de privacidade) e 8
  (schema do perfil, base de `entitlements`). Começar antes disso é construir sobre base frágil.

**22. Ecossistema de micro-rotinas** · esforço alto
- **Perda se ficar como está:** nenhuma no curto prazo. A análise concluiu que não há código
  compartilhável hoje com o Rastreador de Metas.
- **Ganho ao corrigir:** só aparece depois que o BP Tracker provar o modelo (lançado, com retenção
  medida). Extrair um "core" antes disso é abstração prematura. **Deixar como está é o
  recomendado.**

### Ordem sugerida

| Ordem | Itens | Por quê |
|---|---|---|
| 1º | 2 (CI), 3 (checklist), 5–7 (docs) | Horas de trabalho; protegem tudo o que vem depois e evitam que sessões futuras sigam instruções erradas. |
| 2º | 1 (política de privacidade) | Única coisa entre o código pronto e a loja — depende de você, não de engenharia. |
| 3º | 8 (Zod do perfil), 9 (lint das Functions), 10 (duplicações) | Base segura antes de qualquer campo novo no perfil. |
| 4º | 11 (decisão sobre a segunda medição) | Quanto mais tempo passa, mais dado fica sem as leituras individuais. |
| 5º | 4 (App Check nativo) | Logo depois do primeiro build no Play Console, que é quando passa a ser possível validar. |
| 6º | 13, 14, 12 | Alto valor para o usuário com pouco código. |
| Depois | 15–19 | Evolução de produto, já com o app publicado e com dados de uso. |
| Não agora | 20–22 | Deixar como está é a decisão correta neste momento. |
