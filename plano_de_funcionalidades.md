# Plano de Funcionalidades — Varredura de Pendências

> Levantamento do estado real do BP Tracker nesta branch, feito em 2026-08-15. Esta é uma
> **reauditoria**: já existia um `plano_de_funcionalidades.md` anterior (commit `e4ec886`), mas 4
> dos 7 itens que ele listava foram implementados desde então (edição de medição, push web via
> FCM, Cloud Functions deployáveis, Crashlytics nativo — ver histórico do git). Este documento
> substitui o anterior com o estado atual, confirmado lendo o código, não a documentação antiga.
>
> Metodologia: busca global por `TODO`/`FIXME`/`WIP`/`HACK`, por `console.log`/`alert()` fora do
> logger, por handlers vazios (`onPress={() => {}}`) e links mortos (`href="#"`), por arrays
> mockados substituindo dados do Firestore, e leitura direta do fluxo de CRUD de medições
> (criar/ler/atualizar/excluir) e dos cálculos de média. **Nada abaixo foi implementado ainda** —
> é só o mapeamento pedido.

---

## 1. `eas.json` não existe — build nativo (Dev Client/produção) não configurado

**Onde foi encontrado:**
- Raiz do projeto — não há `eas.json`.
- `RELEASE_CHECKLIST.md:25` e seção 2 (`eas build --profile production --platform android`) já
  registram isso como bloqueio conhecido.
- `app.config.ts` já tem tudo que é do lado Expo: `android.package`
  (`com.ramonmenz.bptracker`), `ios.bundleIdentifier`, `scheme`, ícones (ver item 3) e os config
  plugins do `@react-native-firebase/*`.

**Estado atual:** nenhum dos comandos de build do `CLAUDE.md` §2 funciona —
`eas build --profile development --platform android` falha por falta de perfil. O app não tem
como sair do Expo Go/dev server e virar um Dev Client instalável ou um AAB para a Play Store.

**Passo a passo técnico:**
1. 🔴 `eas login` (conta EAS do usuário) + `eas build:configure` — não dá para gerar um `eas.json`
   funcional sem a conta real vinculada ao projeto Expo.
2. Revisar o `eas.json` gerado: perfil `development` com `developmentClient: true` e
   `distribution: internal`; perfil `production` com saída AAB e `autoIncrement` de
   `versionCode`.
3. Confirmar que `google-services.json` é referenciado via EAS Secret file
   (`GOOGLE_SERVICES_JSON`, já suportado por `app.config.ts:78`), nunca commitado (`CLAUDE.md`
   §4.4).
4. `eas build --profile development --platform android` como primeiro teste real; só depois
   tentar o perfil `production`.

---

## 2. Política de privacidade — URL placeholder

**Onde foi encontrado:** `app/(app)/settings.tsx:38`
```ts
const PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo';
```

**Estado atual:** o botão "Política de privacidade" em Ajustes está tecnicamente funcional —
chama `Linking.openURL` e trata falha de abertura com um `ConfirmDialog` amigável — mas a URL é
deliberadamente inválida, como o próprio nome da constante avisa. Sem uma política real e
publicada, o app não pode ser submetido à Play Store: ele trata dado de saúde (LGPD, `CLAUDE.md`
§4.4) e a Play Store exige o link no *Data Safety form*.

**Passo a passo técnico:**
1. 🔴 Decisão do usuário: redigir/hospedar o texto da política (conteúdo jurídico — fora do
   escopo de código, não deve ser inventado).
2. Trocar a constante em `settings.tsx:38` pela URL real assim que publicada.
3. Conferir o *Data Safety form* da Play Store contra o conteúdo da política antes de submeter
   (`PLAN.md` Fase 6).

---

## 3. ~~Ícones do app ainda são placeholders visuais~~ — ✅ Resolvido

**Onde foi encontrado:** `app.config.ts:62-65` (quadrado teal sólido gerado só para destravar a
configuração, sem símbolo ou tipografia).

**O que foi feito:** arte gerada via IA de imagem (Gemini) a partir de um prompt com a paleta e o
estilo "Medical Clean" do projeto (símbolo de braçadeira/manguito estilizado, azul `#2563EB` +
branco, sem vermelho, sem texto). A imagem bruta do Gemini veio com ~6,5% de margem branca ao
redor do quadrado (não era *full bleed*) e um azul levemente fora do hex da marca (`#2567DF` em
vez de `#2563EB`) — ambos corrigidos programaticamente (recorte da margem + normalização exata de
cor por interpolação no eixo azul→branco, preservando o antialiasing do traço) antes de gerar os
4 arquivos finais:
- `assets/icon.png` — 1024×1024, full bleed, `#2563EB` sólido + símbolo branco.
- `assets/adaptive-icon.png` — 1024×1024, símbolo isolado em fundo transparente, redimensionado
  para ocupar ~58% do canvas (dentro da safe zone de 61,1% do Android adaptive icon, com folga).
- `assets/favicon.png` — 48×48, legível no tamanho de aba do navegador.
- `assets/splash-icon.png` — 1024×1024, mesmo símbolo transparente, com mais respiro (tela de
  carregamento).
- `app.config.ts`: removido o comentário `⚠️ PLACEHOLDER`; `android.adaptiveIcon.backgroundColor`
  trocado de `#0E7C86` (teal antigo, nunca correspondeu à paleta real do app) para `#2563EB`
  (blue-600 de `src/theme/colors.ts`).

**Pendente, fora do código:** nenhum. Item fechado — só falta a validação visual final num
dispositivo/emulador real antes do primeiro build de produção (o Android aplica máscaras de forma
variadas por fabricante ao ícone adaptativo; vale conferir em pelo menos 2-3 launchers).

---

## 3.1. ~~Ícone da instalação web (PWA) sem manifest~~ — ✅ Resolvido (encontrado durante o item 3)

**Onde foi encontrado:** ao validar o item 3 num celular de verdade, o ícone ficava nítido no app
nativo mas saía borrado/pixelado ao instalar a versão web pela opção "Adicionar à tela de início"
do navegador. Causa raiz, não relacionada à resolução da arte: `public/index.html` (que o próprio
arquivo já documenta ter prioridade sobre o template padrão do Expo) não tinha **nenhuma** tag de
ícone — nem `<link rel="icon">`, nem `<link rel="manifest">`, nem `<link rel="apple-touch-icon">`.
Sem isso, o navegador não tinha de onde tirar um ícone em resolução alta e caía para um fallback
(upscaling de um ícone pequeno, ou recorte da própria página).

**O que foi feito:**
- `public/manifest.json` (Web App Manifest) novo, com `icons` em 192×192 e 512×512 (`purpose:
  "any"`) + uma variante 512×512 `purpose: "maskable"` (reaproveita o símbolo isolado do item 3,
  já dentro da safe zone, composto sobre o azul da marca).
- `public/icons/apple-touch-icon.png` (180×180, opaco — iOS não aplica máscara/alpha no ícone da
  tela de início).
- `public/favicon.png` — favicon fora do pipeline de assets do Expo, servido direto pelo caminho
  estático (mais confiável que depender do `web.favicon` do `app.config.ts` com um template HTML
  totalmente customizado).
- `public/index.html`: adicionadas as tags `<link rel="icon">`, `<link rel="apple-touch-icon">`,
  `<link rel="manifest">`, `<meta name="theme-color">` e as duas tags específicas do iOS
  (`apple-mobile-web-app-capable`, `apple-mobile-web-app-title`) — Safari ignora o
  `manifest.json` para "Adicionar à Tela de Início", precisa dessas à parte.
- `vercel.json`: a regra de rewrite (`source` do bloco `rewrites`) mandava **tudo** para
  `/index.html` exceto uma lista fixa de exceções, que não incluía os arquivos novos — sem esse
  ajuste, o manifest/ícones ficariam certos localmente e quebrados em produção (o Vercel serviria
  HTML no lugar do PNG/JSON). Adicionado `icons/`, `favicon\.png` e `manifest\.json` à exceção.

**Pendente, fora do código:** nenhum. Vale testar "Adicionar à tela de início" de verdade em
Android/Chrome e iOS/Safari depois do próximo deploy — os dois lêem esse conjunto de arquivos de
formas ligeiramente diferentes.

---

## 4. Média semanal/mensal consolidada — só existe implícita no gráfico, não como número único

**Onde foi encontrado:**
- `app/(app)/history.tsx:30-81` — cada cabeçalho de dia mostra a média **daquele dia**
  (`Média {item.averageSystolic}/{item.averageDiastolic}`, linha 216), calculada por dia via a
  função `average()`.
- `src/features/readings/useReadingsTrend.ts:37-86` — `computeDailyTrend` calcula médias diárias
  numa janela de 7 ou 30 dias, mas devolve um **array de pontos** (um por dia) para o gráfico, não
  um único valor agregado "média da semana" / "média do mês".
- `src/components/bp/TrendChart.tsx` — plota esse array; não existe nenhum card/badge com o
  número único ao lado ou acima do gráfico.

**Estado atual:** os dados e a agregação diária já existem e são reais (nada mockado — ver item
"Itens verificados" abaixo). O que falta é só a última soma: um card de resumo com "Média 7 dias:
132/85" / "Média 30 dias: 129/84" em algum lugar visível (Home ou topo do Histórico). Não é uma
lacuna crítica de CRUD, é uma melhoria pequena sobre dado que já está calculado.

**Passo a passo técnico:**
1. `src/features/readings/useReadingsTrend.ts`: adicionar uma função pura `computeWindowAverage`
   (ou reaproveitar `average()` de `useReadingsTrend.ts`/`history.tsx` — hoje duplicada nos dois
   arquivos, dá pra unificar em `src/domain/` já que é lógica pura sem I/O) que recebe os pontos
   diários e devolve `{ averageSystolic, averageDiastolic }` únicos, ignorando dias sem medição.
2. Novo componente `src/components/bp/TrendSummaryCard.tsx` (ou estender `TrendChart.tsx` com uma
   prop) que renderiza esse número, com o mesmo tratamento de "sem dados suficientes" que o
   gráfico já tem.
3. Decidir com o usuário onde encaixar (Home, abaixo do `LastReadingCard`, ou topo do
   Histórico) — é decisão de produto/UX, não só técnica.
4. Teste unitário da função pura em `useReadingsTrend.test.ts`, cobrindo: janela sem nenhuma
   medição, janela com só 1 dia de dado, e arredondamento consistente com o resto do app.
5. `npm run lint && npm run typecheck && npm test`.

---

## Itens verificados e considerados **completos** (para não parecerem esquecidos na varredura)

- **CRUD de medições — completo nas 4 operações:** criar (`useAddReading`), ler (`useReadings`,
  `onSnapshot` realtime), **atualizar** (`useUpdateReading` + `updateReading` no repo + rota
  `app/(app)/edit-reading/[id].tsx`, com `ReadingRow` navegando para lá por toque na linha) e
  excluir (`useDeleteReading`, com `ConfirmDialog` de confirmação). Todas passam por
  `reading.schema.ts` (Zod) antes de virar tipo de domínio, e por `firestore.rules` no servidor —
  inclusive teste explícito de isolamento entre contas em `tests/firestore.rules.test.ts` (usuário
  B não edita/lê medição de A).
- **Gráfico de tendência (`TrendChart.tsx`):** usa dados reais de `useReadingsTrend`, derivados do
  Firestore via `useReadings` — não há array mockado. `computeDailyTrend` é função pura, testada
  em `useReadingsTrend.test.ts`, com janelas de 7/30 dias.
- **Push na Web (FCM):** `registerPushToken.web.ts` inicializa `getMessaging`, checa suporte do
  navegador, pede permissão, registra o service worker (`public/firebase-messaging-sw.js`) e
  persiste o token em `devices/{tokenHash}` — implementado por completo, não é mais um `throw`
  incondicional.
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
- **Lembretes locais no Android:** `localReminders.native.ts` agenda notificações diárias reais
  via `expo-notifications`, sempre cancelando e recriando o conjunto inteiro (evita duplicata).
- **Nenhum handler vazio, `console.log` de produção, `alert()` cru ou `href="#"`** encontrado em
  `app/` ou `src/` nesta varredura — o único uso de "TODO"/"WIP" no código é dentro de comentários
  em português usando essas palavras com sentido comum (ex. "cancela TODOS os lembretes"), não
  marcador de pendência.

---

## Itens fora do escopo desta varredura (documentação já existente, não repetida aqui)

- `RELEASE_CHECKLIST.md` tem itens na "Seção 0" (pré-requisitos) que estão **desatualizados** —
  descrevem um estado anterior ao `npm install` inicial (ex.: "`package.json` não existe"), que já
  não é verdade. Não é uma funcionalidade pendente do produto, é a checklist operacional
  precisando de uma passada de atualização — sinalizo aqui para não ser confundido com um gap de
  código, mas não mexi no arquivo (fora do que foi pedido nesta tarefa).

---

## Resumo executivo

| # | Funcionalidade | Severidade | Esforço estimado |
|---|---|---|---|
| 1 | `eas.json` / build nativo não configurado | 🔴 Alta — bloqueia qualquer build instalável | Pequeno (+ credencial EAS) |
| 2 | Política de privacidade — URL placeholder | 🔴 Alta — bloqueia publicação na Play Store | Fora do código (jurídico) |
| 3 | ~~Ícones placeholder~~ | ✅ Resolvido | — |
| 4 | Média semanal/mensal consolidada (número único) | 🟢 Baixa — melhoria sobre dado já calculado | Pequeno |

Comparado com a auditoria anterior: 4 dos 7 itens (edição de medição, push web, Cloud Functions
deployáveis, Crashlytics nativo) já foram resolvidos e saíram da lista. Dos 4 itens restantes,
3 exigem uma decisão ou credencial do usuário (conta EAS, texto jurídico, arte de marca) — o
código em si, hoje, só tem uma lacuna de funcionalidade de verdade: o item 4.
