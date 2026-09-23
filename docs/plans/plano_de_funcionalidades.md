# Plano de Funcionalidades — Varredura de Pendências

> Levantamento do estado real do BP Tracker nesta branch, feito em 2026-08-17. Esta é uma
> **reauditoria**: já existia um `plano_de_funcionalidades.md` anterior (auditado em 2026-08-15),
> e desde então o item 1 (`eas.json` inexistente) foi resolvido — ver commits `8d8ee00`,
> `aaed182`, `d689ea2`, `afc8bd6`, `008f8b4`. Este documento substitui o anterior com o estado
> atual, confirmado lendo o código, não a documentação antiga.
>
> Metodologia: busca global por `TODO`/`FIXME`/`WIP`/`HACK`, por `console.log`/`alert()` fora do
> logger, por handlers vazios (`onPress={() => {}}`) e links mortos (`href="#"`), por arrays
> mockados substituindo dados do Firestore, e leitura direta do fluxo de CRUD de medições
> (criar/ler/atualizar/excluir) e dos cálculos de média. **Nada abaixo foi implementado nesta
> tarefa** — é só o mapeamento pedido.

---

## 1. Política de privacidade — URL placeholder

**Onde foi encontrado:** `app/(app)/settings.tsx:38`
```ts
const PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo';
```

**Estado atual:** o botão "Política de privacidade" em Ajustes é tecnicamente funcional — chama
`Linking.openURL` e trata falha de abertura com um `ConfirmDialog` amigável (`settings.tsx:190-198`)
— mas a URL é deliberadamente inválida, como o próprio nome da constante avisa. Sem uma política
real e publicada, o app não pode ser submetido à Play Store: ele trata dado de saúde (LGPD,
`CLAUDE.md` §4.4) e a Play Store exige o link no *Data Safety form*.

**Passo a passo técnico:**
1. 🔴 Decisão do usuário: redigir/hospedar o texto da política (conteúdo jurídico — fora do
   escopo de código, não deve ser inventado).
2. Trocar a constante em `settings.tsx:38` pela URL real assim que publicada.
3. Conferir o *Data Safety form* da Play Store contra o conteúdo da política antes de submeter
   (`PLAN.md` Fase 6, `RELEASE_CHECKLIST.md`).

---

## 2. Média semanal/mensal consolidada — só existe implícita no gráfico, não como número único

**Onde foi encontrado:**
- `app/(app)/history.tsx:30-81` — cada cabeçalho de dia mostra a média **daquele dia**
  (`Média {item.averageSystolic}/{item.averageDiastolic}`, linha 216), calculada por dia via a
  função `average()` local ao arquivo (`history.tsx:43-45`).
- `src/features/readings/useReadingsTrend.ts:37-90` — `computeDailyTrend` calcula médias diárias
  numa janela de 7 ou 30 dias, mas devolve um **array de pontos** (um por dia) para o gráfico, não
  um único valor agregado "média da semana" / "média do mês". A função `average()` daqui
  (linha 37) é praticamente idêntica à de `history.tsx` — duplicação, não bug.
- `src/components/bp/TrendChart.tsx` — plota esse array (linhas 141-142); não existe nenhum
  card/badge com o número único ao lado ou acima do gráfico.

**Estado atual:** os dados e a agregação diária já existem e são reais (nada mockado — confirmado
lendo `useReadings.ts` → Firestore `onSnapshot`, sem nenhum array estático). O que falta é só a
última soma: um card de resumo com "Média 7 dias: 132/85" / "Média 30 dias: 129/84" em algum lugar
visível (Home ou topo do Histórico). Não é uma lacuna crítica de CRUD, é uma melhoria pequena sobre
dado que já está calculado.

**Passo a passo técnico:**
1. `src/domain/`: extrair uma função pura `computeWindowAverage(points: TrendPoint[])` (ou
   receber `Reading[]` direto, a definir) que devolve `{ averageSystolic, averageDiastolic } |
   null` (null quando a janela não tem nenhum dia com dado). Aproveitar para unificar as duas
   implementações de `average()` hoje duplicadas em `history.tsx` e `useReadingsTrend.ts` nesse
   mesmo arquivo de domínio, já que é lógica pura sem I/O (`CLAUDE.md` §3.2).
2. Novo componente `src/components/bp/TrendSummaryCard.tsx` (ou estender `TrendChart.tsx` com uma
   prop) que renderiza esse número, com o mesmo tratamento de "sem dados suficientes" que o
   gráfico já tem — sem alarmismo, seguindo a paleta semântica de `categoryColors`
   (`CLAUDE.md` §1).
3. Decidir com o usuário onde encaixar (Home, abaixo do `LastReadingCard`, ou topo do
   Histórico) — é decisão de produto/UX, não só técnica.
4. Teste unitário da função pura em `useReadingsTrend.test.ts` (ou onde o domínio for extraído),
   cobrindo: janela sem nenhuma medição, janela com só 1 dia de dado, e arredondamento consistente
   com o resto do app.
5. `npm run lint && npm run typecheck && npm test`.

---

## Itens verificados e considerados **completos** (para não parecerem esquecidos na varredura)

- **`eas.json` — resolvido desde a última auditoria.** Existe na raiz com perfis `development`
  (`developmentClient: true`, `distribution: internal`), `preview` e `production`
  (`autoIncrement: true`). `app.config.ts` já tem `projectId` do EAS registrado. Há também um
  workflow manual do GitHub Actions para build Android via EAS (`008f8b4`).
- **CRUD de medições — completo nas 4 operações:** criar (`useAddReading`), ler (`useReadings`,
  `onSnapshot` realtime), atualizar (`useUpdateReading` + `updateReading` no repo + rota
  `app/(app)/edit-reading/[id].tsx`, com `ReadingRow` navegando para lá por toque na linha) e
  excluir (`useDeleteReading`, com `ConfirmDialog` de confirmação). Todas passam por
  `reading.schema.ts` (Zod) antes de virar tipo de domínio, e por `firestore.rules` no servidor —
  inclusive teste explícito de isolamento entre contas em `tests/firestore.rules.test.ts` (usuário
  B não edita/lê medição de A).
- **Gráfico de tendência (`TrendChart.tsx`):** usa dados reais de `useReadingsTrend`, derivados do
  Firestore via `useReadings` — não há array mockado. `computeDailyTrend` é função pura, testada
  em `useReadingsTrend.test.ts`, com janelas de 7/30 dias.
- **Push nativo (Android) e Web (FCM):** `registerPushToken.native.ts` usa
  `getDevicePushTokenAsync` (token nativo FCM/APNs, compatível com `sendEachForMulticast` do
  Admin SDK) e persiste em `devices/{tokenHash}`; `registerPushToken.web.ts` inicializa
  `getMessaging`, checa suporte do navegador, pede permissão e registra o service worker
  (`public/firebase-messaging-sw.js`). Nenhum dos dois é stub.
- **Lembretes locais no Android:** `localReminders.native.ts` agenda notificações diárias reais
  via `expo-notifications`, sempre cancelando e recriando o conjunto inteiro (evita duplicata).
- **Cloud Functions deployáveis:** `functions/package.json`, `functions/tsconfig.json` e
  `functions/src/index.ts` existem e exportam os 4 triggers/scheduler (`dispatchReminders`,
  `onDeviceWrite`, `onUserDelete`, `onUserSettingsWrite`). `npm --prefix functions install/build`
  tem o que rodar.
- **Coletor de erro em produção — nativo resolvido, web é gap declarado (não é bug):**
  `src/services/firebase/index.ts` chama `setCrashReporter(...)` no bootstrap fora de `__DEV__`,
  usando `@react-native-firebase/crashlytics` no Android. Na web, `crashReporter.web.ts` é um
  no-op **intencional e documentado** (`IS_WEB_CRASH_REPORTING_GAP`), não um esquecimento — fechar
  isso exigiria adotar Sentry ou similar, decisão de produto/dependência nova que não deve ser
  tomada de passagem. Registrado em `RELEASE_CHECKLIST.md`.
- **Export CSV:** gera arquivo real com BOM UTF-8 (`src/lib/csv.ts`), inclui pulso e observação,
  compartilha no nativo / baixa na web — não é um botão morto.
- **Exclusão de conta (LGPD):** dupla confirmação, `deleteAccount` aciona limpeza server-side de
  `users/{uid}` (readings + devices) e `schedules/{uid}`.
- **Campos de pulso e observação:** ponta a ponta — `reading.schema.ts` (validação), `models.ts`
  (tipo), formulário (`ReadingForm`, escondidos atrás de um botão "adicionar" por padrão),
  `csv.ts` (exportados) e `firestore.rules` (validados no servidor, opcionais). Nenhuma parte
  mockada.
- **Ícones do app (nativo e PWA):** resolvidos em auditorias anteriores — arte final em
  `assets/*.png` e `public/manifest.json` + `public/icons/`, sem placeholders.
- **Nenhum handler vazio, `console.log` de produção, `alert()` cru ou `href="#"`** encontrado em
  `app/` ou `src/` nesta varredura — o único uso de "TODO"/"WIP" no código é dentro de comentários
  em português usando essas palavras com sentido comum (ex. "cancela TODOS os lembretes"), não
  marcador de pendência.

---

## Itens fora do escopo desta varredura (documentação já existente, não repetida aqui)

- `RELEASE_CHECKLIST.md` ainda tem itens na "Seção 0" (pré-requisitos) **desatualizados** —
  descrevem um estado anterior ao `npm install` inicial (ex.: "`package.json` não existe",
  "`eas.json` não existe"), que já não é verdade. Não é uma funcionalidade pendente do produto, é
  a checklist operacional precisando de uma passada de atualização — sinalizo aqui para não ser
  confundido com um gap de código, mas não mexi no arquivo (fora do que foi pedido nesta tarefa).

---

## Resumo executivo

| # | Funcionalidade | Severidade | Esforço estimado |
|---|---|---|---|
| 1 | Política de privacidade — URL placeholder | 🔴 Alta — bloqueia publicação na Play Store | Fora do código (jurídico) |
| 2 | Média semanal/mensal consolidada (número único) | 🟢 Baixa — melhoria sobre dado já calculado | Pequeno |

Comparado com a auditoria de 2026-08-15: o item "`eas.json` não configurado" foi resolvido e saiu
da lista. Dos 2 itens restantes, 1 exige decisão/conteúdo jurídico do usuário (item 1) — o código
em si, hoje, só tem uma lacuna de funcionalidade de verdade: o item 2 (card de média consolidada).
