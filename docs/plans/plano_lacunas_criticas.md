# Plano — Lacunas Críticas

> Plano de desenvolvimento dos cinco itens que `docs/STATUS_REPORT.md` ("Custo de Não Agir ×
> Benefício de Corrigir") identificou como os que **mais pesam se ficarem como estão**. Escrito em
> 2026-10-01 a partir do código em `HEAD` (`claude/gap-analysis-progress-report-dg3cke`), com as
> suítes de verificação **executadas**, não só lidas. Os prompts de execução estão em
> [`prompts_lacunas_criticas.md`](./prompts_lacunas_criticas.md).
>
> 🔴 = depende de decisão, credencial ou ação sua fora do repositório — não dá para resolver no
> código nem para inventar o valor.

---

## Estado verificado antes do plano

Rodado neste container com `npm ci` real a partir do `package-lock.json`:

| Checagem | Resultado |
|---|---|
| `npm run lint` | ✅ verde |
| `npm run typecheck` | ✅ verde |
| `npm test` (Jest) | ✅ 36 suítes, 294 testes |
| `npm --prefix functions run build` + `test` | ✅ build ok, 16 testes |
| `npm run test:rules` | ❌ **26 de 26 falham** — `HTTP Error undefined when attempting to reach Emulator Hub` |

**Causa raiz da falha de rules, confirmada por isolamento:** `jest.rules.config.js` usa
`preset: 'jest-expo'`, cujo setup substitui o `fetch` global por stubs do React Native. O
`@firebase/rules-unit-testing` usa `fetch` para falar com o hub do emulador e recebe uma falha sem
status HTTP. Prova: o mesmo `initializeTestEnvironment` em Node puro, sob o mesmo
`emulators:exec`, conecta; e a mesma suíte com `babel-jest` + `babel-preset-expo` **sem** o preset
`jest-expo` passa nos **26 testes**. Ou seja, as rules estão corretas — quem estava quebrado era o
harness de teste delas, e por isso os testes de isolamento entre usuários provavelmente nunca
rodaram de verdade.

---

## Ordem de execução recomendada

A numeração dos itens segue a do relatório; a **ordem de execução** é outra:

| Ordem | Item | Por quê |
|---|---|---|
| 1º | **2 — CI** | Tudo o que vem depois (rules novas no item 4, dependência nativa no item 5) precisa de uma rede de proteção rodando. |
| 2º | **3 — `RELEASE_CHECKLIST.md`** | Só documentação; passa a refletir o estado real, incluindo o CI recém-criado. |
| 3º | **1 — Política de privacidade** | Código pequeno, mas depende do texto revisado por você/jurídico 🔴 — começar cedo porque o prazo é externo. |
| 4º | **4 — Segunda medição** | Mudança de modelo de dados: entra com o CI já protegendo as rules. Quanto antes, menos dado fica sem as leituras individuais. |
| 5º | **5 — App Check nativo** | Só pode ser validado depois que o app estiver no Play Console (internal testing) 🔴. |

---

## Item 1 — Política de privacidade

### Problema
`app/(app)/settings.tsx:41` tem `PRIVACY_POLICY_URL = 'https://SUBSTITUIR-...exemplo'`. Não há
texto de política em lugar nenhum do repositório. A tela de login (`app/(auth)/sign-in.tsx`) não
tem link para a política — o usuário entrega nome/e-mail ao fazer login sem ter tido acesso a ela.

### Decisões de desenho
- **Página HTML estática em `public/privacidade.html`**, não uma rota do Expo Router. Motivos:
  1. O `useAuthRedirect` manda qualquer rota fora de `(auth)` para o login quando não há sessão —
     uma rota do app exigiria abrir exceção no gate de autenticação só para isso.
  2. A Play Store exige uma URL pública, acessível sem login e que não seja PDF. Um HTML estático
     servido pela Vercel atende sem JavaScript, sem bundle e sem depender do app carregar.
  3. O `npx expo export -p web` copia `public/` para `dist/`, que é o `outputDirectory` do
     `vercel.json`. O `rewrite` catch-all precisa ganhar `privacidade\.html` na lista de exceções,
     no mesmo padrão de `favicon.ico`/`manifest.json`.
- **URL como constante no código, não variável de ambiente.** A URL não é segredo, e uma variável a
  mais seria mais um item para esquecer de cadastrar no EAS de produção — o link quebraria
  silenciosamente. 🔴 Você informa o domínio de produção da Vercel.
- **Link também na tela de login**, antes de qualquer dado ser coletado.
- **O texto é um rascunho técnico, não um parecer jurídico.** Ele descreve com precisão o que o
  código faz (o que é coletado, onde fica, quem processa, como apagar); a adequação legal é
  validação sua/de um advogado 🔴.

### O que o texto precisa cobrir (LGPD art. 9º + dado sensível do art. 11)
Levantado do código, para o rascunho não inventar nada:

| Tema | Fato no código |
|---|---|
| Dados de conta | Nome, e-mail e foto da conta Google (`ensureUserProfile.ts`) |
| Dados de saúde | Sistólica, diastólica, pulso, data/hora da medição, observação livre (`models.ts`) |
| Preferências | Fuso horário, horários de lembrete, notificações ativadas (`users/{uid}`) |
| Identificadores | Token de push do aparelho (`devices/{hash}`) |
| Dados só no aparelho | Tema, "onboarding visto", aviso dispensado (AsyncStorage) — nunca saem do aparelho |
| Diagnóstico de erro | Crashlytics (Android) e Sentry (web), **sem** identificar o usuário e com contexto sanitizado de dado de saúde (`logger.ts`, `crashReporter.*.ts`) |
| Infraestrutura | Google Firebase (Auth, Firestore, Cloud Functions, FCM), Vercel (hospedagem web), Sentry |
| Não faz | Analytics, publicidade, venda ou compartilhamento com terceiros para outros fins |
| Exclusão | Ajustes → "Excluir minha conta" apaga medições, aparelhos, índice de lembretes e a conta (`deleteAccount.ts` + `onUserDelete`) |

🔴 **Dados que só você tem:** nome/razão social do controlador, CPF/CNPJ se aplicável, e-mail de
contato do encarregado (DPO), região real do Firestore no Console (o plano previa
`southamerica-east1`), região da organização no Sentry (EUA/UE — implica transferência
internacional), prazos de retenção do Crashlytics/Sentry configurados nas contas, data de vigência.

### ⚠️ Ponto em aberto para o jurídico: consentimento
O LGPD art. 11, I, exige, para dado de saúde, **consentimento específico e destacado** (a outra
base legal possível, tutela da saúde, é restrita a profissionais e serviços de saúde). Hoje o app
não coleta consentimento nenhum: o usuário faz login e já pode gravar medições. Uma política
publicada **não substitui** esse consentimento. Por isso o plano tem um Prompt 1.3 **condicional**:
só execute se o jurídico confirmar que ele é necessário (o mais provável).

### Critério de pronto
- `https://<seu-domínio>/privacidade.html` abre sem login, em celular, com o texto revisado.
- O link de Ajustes e o da tela de login abrem essa página.
- A URL está no Play Console → Política do app.
- (Se 1.3) Ninguém grava medição sem ter aceitado a versão vigente da política, e o aceite fica
  registrado no servidor.

---

## Item 2 — CI de qualidade

### Problema
`.github/workflows/` só tem `eas-build.yml`, disparado manualmente. Nenhum PR roda lint,
typecheck ou testes, e a suíte de rules está quebrada sem que ninguém tenha notado (ver "Estado
verificado"). O `CLAUDE.md §2` também não lista `npm run test:rules`, embora o script exista
(regra do próprio §2: script novo atualiza a seção no mesmo commit).

### Decisões de desenho
- **Primeiro consertar o harness, depois automatizar** — um workflow sobre uma suíte quebrada só
  nasceria vermelho.
- **Correção do harness, já validada:** trocar o `preset: 'jest-expo'` de `jest.rules.config.js`
  por `transform` com `babel-jest` + `babel-preset-expo` e `transformIgnorePatterns` liberando
  `firebase|@firebase`. Testado neste container: 26/26 verdes. A suíte de rules não renderiza
  React Native, então não precisa do preset.
- **Um workflow, três jobs paralelos**, em `pull_request` e `push` para `main`:
  1. `app` — `npm ci`, `lint`, `typecheck`, `test`;
  2. `functions` — `npm --prefix functions ci`, `build`, `test`;
  3. `rules` — `npm ci`, Java 21 (`actions/setup-java`), cache de
     `~/.cache/firebase/emulators`, `npm run test:rules`.
- **Node 20** — o mesmo de `eas-build.yml` e de `functions/package.json` (`engines`).
- `permissions: contents: read` e `concurrency` com `cancel-in-progress` (push novo cancela a
  execução antiga do mesmo PR).
- **Sem segredos.** Nenhum dos três jobs precisa de `.env.local`: os testes mockam o Firebase e as
  rules rodam no emulador com um `projectId` fictício. Esta foi a condição verificada aqui (tudo
  rodou sem `.env.local`).
- **Fora do escopo:** o ruído de `console.error` de `act(...)` nos testes de tema (não falha nada) e
  o lint de `functions/` (item 9 do relatório) — entram depois, com o CI já protegendo.

### Critério de pronto
- `npm run test:rules` verde localmente.
- O workflow aparece nos PRs com os três jobs verdes.
- 🔴 Em GitHub → Settings → Branches, você marca os três jobs como *required status checks* da
  `main` — sem isso o CI avisa, mas não impede o merge.

---

## Item 3 — `RELEASE_CHECKLIST.md` desatualizado

### Problema
O checklist foi escrito antes de o projeto existir e nunca foi reconciliado. Afirmações
falsas hoje, todas verificadas:

| Afirmação do checklist | Realidade |
|---|---|
| `package.json` não existe; "primeiro passo real: `npx create-expo-app`" | Existe, com Expo SDK 57 — seguir o passo **criaria um projeto por cima do existente** |
| `functions/package.json` e `functions/src/index.ts` não existem | Existem; as 4 Functions estão exportadas |
| `eas.json` não existe; "não vou criar com valores inventados" | Existe, com `development`/`preview`/`production` e `appVersionSource: remote` |
| `app.config.ts` sem `android.package` | `com.ramonmenz.bptracker` |
| Nenhum ícone/asset | `assets/` tem ícone, adaptive icon, splash e favicon |
| `firebase.json` precisa de bloco `hosting` para a web | A web é publicada pela **Vercel** (`vercel.json`); não há e não precisa haver `hosting` |
| `public/firebase-messaging-sw.js` não existe | Existe |
| "Achados conhecidos" do `npm install` (`useColorScheme` com `'unspecified'`, `estimatedItemSize` da FlashList, `invalid` em `accessibilityState`) | Typecheck verde; `history.tsx` não usa `estimatedItemSize` — nenhum dos três se manifesta |
| Seção 1: rodar a suíte de rules com `npx vitest run` | O projeto usa Jest; o comando certo é `npm run test:rules` (e ele precisa do conserto do item 2) |
| "Paleta: teal como cor primária" (ícone) | A primária é blue-600 (`CLAUDE.md §1`, `app.config.ts`) |

### Decisões de desenho
- **Reescrever o arquivo inteiro.** É exceção justificada ao "nunca reescreva um arquivo inteiro"
  do `CLAUDE.md §4.1`: quase todas as seções estão erradas, e uma edição pontual deixaria o
  documento metade verdade, metade não.
- **Manter o que é verdade e é seu:** 🔴 `google-services.json`, `.env.local`/variáveis no EAS,
  keystore e fingerprints SHA-1/SHA-256 no Firebase, Data Safety form, screenshots, feature
  graphic, classificação de conteúdo, domínio no reCAPTCHA Enterprise, DSN do Sentry.
- **Cabeçalho de verificação** ("verificado contra o commit X em DATA") — para o próximo leitor
  saber o quanto confiar, e para não voltar a apodrecer em silêncio.
- **Ligação com os outros itens:** a política de privacidade aponta para o item 1; o App Check
  nativo, para o item 5; a seção de qualidade, para o CI do item 2.

### Critério de pronto
Cada afirmação factual do checklist confere com o repositório, e todo item aberto que sobra é
genuinamente 🔴 (seu) ou aponta para um item deste plano.

---

## Item 4 — Segunda medição sobrescreve a primeira

### Problema
`useSecondMeasurementFlow.submitSecondMeasurement` chama `updateReading` e grava a **média** por
cima do documento da primeira medição. As duas leituras individuais se perdem, e nada no documento
indica que ele é uma média: no histórico e no CSV, "média de 150/95 e 120/80" fica indistinguível
de uma única medição de 135/88.

### Opções consideradas

| Opção | Como fica | Prós | Contras |
|---|---|---|---|
| **A — Média + leituras individuais no mesmo documento** ✅ | Um documento por sessão, com a média nos campos de sempre e um campo novo `sessionReadings` com as duas leituras | Histórico, gráfico, média diária e export continuam funcionando como hoje; o dado individual é preservado; a média fica identificada | Mudança de modelo (schema, tipo, rules, testes) |
| B — Dois documentos independentes, média só na tela | Volta ao escopo original do `prompts_segunda_medicao_e_onboarding_tecnica.md` | Sem campo novo | A média que o protocolo AHA manda reportar não fica registrada; o histórico ganha duas linhas por sessão; a média do dia pesa a sessão em dobro |
| C — Manter a sobrescrita e só marcar como média | Campo booleano | Mudança mínima | Continua perdendo as leituras individuais — resolve só metade do problema |

**Recomendação: Opção A.** Os prompts assumem essa escolha; se você preferir outra, ajuste antes
de rodar.

### Desenho da Opção A
- **Modelo** (`src/types/models.ts`):
  `sessionReadings: [SessionReadingValues, SessionReadingValues] | null`, com
  `SessionReadingValues = { systolic: number; diastolic: number; pulse: number | null }`.
  `null` = medição única (todos os documentos antigos e toda medição comum).
- **Zod** (`reading.schema.ts`): campo `nullish → null` (documentos antigos não têm a chave e
  precisam continuar válidos); tupla de exatamente 2; cada item com as **mesmas** faixas e a mesma
  regra sistólica > diastólica da medição principal, reaproveitando as constantes já existentes.
- **Rules** (`firestore.rules`): `sessionReadings` entra no `hasOnly`; quando presente e não nulo,
  precisa ser lista de tamanho 2, cada item um `map` com `hasOnly(['systolic','diastolic','pulse'])`
  e as mesmas faixas de `intBetween`. A **coerência da média** (o valor principal ser o
  arredondamento da média das duas) **não** vai para as rules: o arredondamento de `math.round` nas
  rules não está documentado com a mesma semântica do `Math.round` do JavaScript, e uma divergência
  de meia unidade negaria escritas legítimas. A coerência é garantida pela função pura
  `computeSessionAverage`, já testada.
- **Índices** (`firestore.indexes.json`): sem mudança — nenhuma query nova. Registrar isso no
  commit, porque o `CLAUDE.md §3.3` exige revisar os quatro arquivos juntos.
- **Edição de uma medição que é média** (`app/(app)/edit-reading/[id].tsx`): se o usuário mudar
  sistólica, diastólica ou pulso, o valor deixa de ser a média daquelas leituras — o
  `sessionReadings` vira `null` (a medição passa a ser um valor corrigido manualmente). Se mudar só
  observação ou horário, `sessionReadings` é preservado.
- **Interface:**
  - `ReadingRow`: legenda "Média de 2 medições: 150/95 e 120/80"; o rótulo de leitor de tela
    acrescenta "média de 2 medições, 150 por 95 e 120 por 80" (nunca "barra", `CLAUDE.md §4.7`).
  - Diálogo de resumo: o texto passa a dizer que a média **e** as duas medições foram salvas.
  - **CSV:** coluna nova **no fim** (`medicoes_da_sessao`), vazia para medição única e no formato
    `150/95 (72) e 120/80 (70)` para sessões — no fim para não quebrar quem importa as colunas por
    posição; sem `;` dentro do valor.
- **Dado já gravado:** as médias salvas antes desta mudança **não podem ser recuperadas** —
  continuam como medições comuns. Vale registrar isso no texto do commit.

### Critério de pronto
- Sessão de duas medições grava a média **e** as duas leituras; o histórico e o CSV mostram as
  duas.
- Documentos antigos (sem o campo) continuam aparecendo normalmente.
- Rules: casos positivos e negativos novos passando no CI (item 2).

---

## Item 5 — App Check nativo (Android)

### Problema
`src/services/firebase/appCheck.native.ts` só inicializa o App Check se receber um
`attestationExchange`, e ninguém fornece um: `src/services/firebase/index.ts` chama
`initAppCheck()` sem opções. Em produção, o nativo cai no `logError` "inicialização ignorada" e
segue **sem App Check**. O comentário do arquivo descreve como solução uma Cloud Function própria
de troca de atestação do Play Integrity — que não existe em `functions/src/`.

Consequência: o enforcement do App Check no Firestore **não pode ser ligado** — o enforcement vale
por serviço, para **todas** as plataformas, e o Android pararia de funcionar.

### Caminhos

| | Caminho A — ponte RNFirebase ✅ | Caminho B — Function própria |
|---|---|---|
| Como | `@react-native-firebase/app-check` (mesma família do `@react-native-firebase/app` 26 já instalado) obtém o token com o provider **nativo** de Play Integrity; o `CustomProvider` do JS SDK devolve esse token | Módulo nativo próprio pega o token do Play Integrity → Cloud Function nova chama a Play Integrity API, valida o veredito e emite o token com `admin.appCheck().createToken()` |
| Quem valida a atestação | O próprio Firebase | **Você** — erro nessa validação transforma o endpoint numa fábrica de tokens válidos |
| Código novo | Uma dependência + um adapter | Módulo nativo Expo + Function + conta de serviço com acesso à Play Integrity API |
| Custo | Nenhum servidor novo | Uma invocação de Function por renovação de token |

**Recomendação: Caminho A.** O comentário atual de `appCheck.native.ts` descarta o RNFirebase
argumentando que o token seria anexado só às chamadas do RNFirebase — o que vale para **inicializar**
o App Check pelo RNFirebase, mas não para **usar o RNFirebase só como fonte do token** e entregá-lo
ao JS SDK pelo `CustomProvider`, que é o que este plano propõe.

**Risco a eliminar primeiro (spike):** o token emitido pelo RNFirebase pertence ao **app Android**
registrado no Firebase, enquanto o JS SDK é inicializado com a config do **app web**
(`EXPO_PUBLIC_FIREBASE_APP_ID`). A expectativa é que o Firestore aceite qualquer token válido de um
app registrado no mesmo projeto, mas isso **não está confirmado** e decide o caminho. O Prompt 5.1
começa provando isso com enforcement ligado num projeto de desenvolvimento; se falhar, o plano cai
para o Caminho B (Prompt 5.B).

### Pré-requisitos 🔴 (todos seus, fora do código)
1. App publicado no Play Console, ao menos em *internal testing*.
2. Play Integrity API vinculada ao projeto do Google Cloud do Firebase (Play Console → Integridade
   do app).
3. No Firebase Console → App Check → app Android: provider Play Integrity registrado com o
   **SHA-256 da chave de assinatura do Play App Signing** (não a do upload, nem a do EAS de dev).
4. Para builds de desenvolvimento: debug token registrado no Console (o
   `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` já existe para isso — continua só no `.env.local`, nunca no
   EAS/CI).

### Rollout
1. Publicar a versão com a ponte em *internal testing*.
2. Acompanhar o painel de métricas do App Check (requisições verificadas × não verificadas) por
   alguns dias, **para web e Android**. A web também precisa estar verificada: confira que
   `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` está no ambiente de produção da Vercel e que o domínio
   de produção está na chave do reCAPTCHA Enterprise.
3. Só com as duas plataformas perto de 100% verificadas: ligar o enforcement do **Firestore**.
4. Atualizar o `RELEASE_CHECKLIST.md`.

### Critério de pronto
Com enforcement ligado, o app instalado pela Play Store e a web de produção funcionam
normalmente, e uma requisição feita com a config pública fora do app é rejeitada.

---

## Resumo de esforço e modelos

| Item | Prompts | Esforço | Modelo predominante |
|---|---|---|---|
| 1 — Política de privacidade | 1.1, 1.2, (1.3 condicional) | Baixo no código + revisão jurídica 🔴 | Opus 5.5 (texto legal e consentimento) / Sonnet 5 (fiação) |
| 2 — CI | 2.1, 2.2 | Baixo | Sonnet 5 |
| 3 — Checklist | 3.1 | Baixo | Sonnet 5 |
| 4 — Segunda medição | 4.1, 4.2, 4.3 | Médio | Opus 5.5 (rules) / Sonnet 5 (fluxo e UI) |
| 5 — App Check nativo | 5.1, (5.B contingência) | Médio (A) / Alto (B) | Opus 5.5 |
