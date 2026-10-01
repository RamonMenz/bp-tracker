# Prompts de Desenvolvimento — Lacunas Críticas

> Um ou mais prompts autocontidos para cada item de
> [`plano_lacunas_criticas.md`](./plano_lacunas_criticas.md). Cada prompt pode ser colado direto
> numa sessão nova do Claude Code — não depende de memória de conversa anterior, só do estado do
> repositório. Mesma convenção dos demais `prompts_*.md`: seguir `CLAUDE.md` (TypeScript estrito,
> sem `any`, Zod para dado do Firestore, `@/` em vez de `../../../`, exports nomeados, componente
> burro/hook esperto, mudanças cirúrgicas, um commit semântico por prompt, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit — e, depois do Prompt 2.1,
> também `npm run test:rules` sempre que `firestore.rules` mudar).
>
> | Modelo | Quando usar aqui |
> |---|---|
> | **Claude Opus 5.5** | Segurança (Security Rules, App Check, atestação), texto com peso jurídico ou clínico, ou decisão de arquitetura ainda em aberto dentro do prompt. |
> | **Claude Sonnet 5** | Mudança bem especificada — o "o quê" já está fechado no prompt, falta o "como" —, inclusive verificar fatos no repositório. |
> | **Claude Haiku 4.5** | Não indicado para nenhum destes prompts: mesmo os de documentação exigem conferir cada afirmação contra o código, e um erro ali é exatamente o problema que o item 3 corrige. |
>
> **Ordem de execução:** 2.1 → 2.2 → 3.1 → 1.1 → 1.2 → (1.3) → 4.1 → 4.2 → 4.3 → 5.1 → (5.B).
> A justificativa está em `plano_lacunas_criticas.md`, "Ordem de execução recomendada".

---

## Item 2 — CI de qualidade

### Prompt 2.1 — Consertar a suíte de Security Rules

```
Contexto: no BP Tracker (Expo + Firebase, ver CLAUDE.md), `npm run test:rules` falha nos 26 testes
de tests/firestore.rules.test.ts com "HTTP Error undefined when attempting to reach Emulator Hub at
undefined". As rules NÃO estão erradas. Causa raiz, já confirmada por isolamento (ver
docs/plans/plano_lacunas_criticas.md, "Estado verificado"): jest.rules.config.js usa
`preset: 'jest-expo'`, cujo setup substitui o `fetch` global por stubs do React Native, e o
@firebase/rules-unit-testing usa `fetch` para falar com o hub do emulador. Sem o preset, com
babel-jest + babel-preset-expo, os 26 testes passam.

Tarefa:
1. Em jest.rules.config.js, troque `preset: 'jest-expo'` por:
     transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
     transformIgnorePatterns: ['/node_modules/(?!(firebase|@firebase)/)'],
   mantendo `testEnvironment: 'node'` e o `testMatch` atual. Atualize o comentário do topo do
   arquivo para explicar POR QUE esta suíte não usa o preset jest-expo (o fetch substituído, o
   sintoma "Emulator Hub at undefined"), para ninguém "padronizar" de volta com o jest.config.js.
2. Rode `npm run test:rules` (exige Java 21+ e baixa o emulador na primeira vez) e confirme os 26
   verdes. Se algum teste falhar por motivo REAL de regra, pare e reporte — não altere
   firestore.rules nem enfraqueça teste para ficar verde.
3. Em CLAUDE.md §2, bloco "Qualidade — rode antes de qualquer commit", adicione
   `npm run test:rules   # Security Rules no emulador (exige Java 21+)` — o script já existe no
   package.json e a regra do próprio §2 manda listá-lo. Mudança cirúrgica, não reescreva a seção.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(rules): rodar a suíte de security rules sem o preset jest-expo
```

**Modelo recomendado:** Claude Sonnet 5 — causa e correção já validadas; é aplicar, confirmar e
documentar o porquê.

---

### Prompt 2.2 — Workflow de CI

```
Contexto: no BP Tracker, .github/workflows/ só tem eas-build.yml (build manual do EAS). Nada roda
em PR. Depois do Prompt 2.1, as quatro verificações passam localmente: `npm run lint`,
`npm run typecheck`, `npm test` (Jest, sem infra externa), `npm --prefix functions run build` +
`npm --prefix functions test`, e `npm run test:rules` (emulador do Firestore via
`firebase emulators:exec`, firebase-tools já é devDependency). Nenhuma delas precisa de
.env.local ou segredo: os testes mockam o Firebase e as rules usam um projectId fictício.

Tarefa:
1. Crie .github/workflows/ci.yml:
   - name: CI
   - on: pull_request (qualquer branch) e push em main.
   - permissions: contents: read
   - concurrency: group por workflow + ref, cancel-in-progress: true.
   - Três jobs independentes, em paralelo, todos em ubuntu-latest, com actions/checkout@v4 e
     actions/setup-node@v4 (node-version: 20 — mesma versão de eas-build.yml e do `engines` de
     functions/package.json):
     a) `app`: cache npm; npm ci; npm run lint; npm run typecheck; npm test -- --ci.
     b) `functions`: cache npm com cache-dependency-path: functions/package-lock.json;
        npm --prefix functions ci; npm --prefix functions run build; npm --prefix functions test.
     c) `rules`: cache npm; actions/setup-java@v4 (distribution: temurin, java-version: 21);
        actions/cache@v4 em ~/.cache/firebase/emulators (chave com o hash do package-lock.json,
        onde a versão do firebase-tools está travada); npm ci; npm run test:rules.
   - Nenhum `secrets.*` em nenhum job. Comente no topo do arquivo por que não precisa (e que, se
     um dia precisar, a fonte é a EAS via `eas env:pull`, como em eas-build.yml — nunca duplicar
     segredo em GitHub Secrets).
   - Nomes de job e de step em português, no mesmo estilo de eas-build.yml.
2. Não altere eas-build.yml.
3. Valide a sintaxe do YAML localmente (ex.: `npx --yes yaml-lint .github/workflows/ci.yml` ou
   equivalente que não adicione dependência ao package.json) e rode os mesmos comandos dos três
   jobs localmente, na mesma ordem, para garantir que o primeiro run nasce verde.
4. Ao final, avise o usuário (não é código, é configuração dele no GitHub): marcar os jobs
   `app`, `functions` e `rules` como required status checks da branch main em Settings → Branches.

Commit:
ci: rodar lint, typecheck, testes, functions e security rules em cada PR
```

**Modelo recomendado:** Claude Sonnet 5 — workflow padrão com todas as decisões fechadas no prompt.

---

## Item 3 — `RELEASE_CHECKLIST.md`

### Prompt 3.1 — Reconciliar o checklist com o repositório

```
Contexto: no BP Tracker, RELEASE_CHECKLIST.md (raiz) foi escrito antes de o projeto existir e
nunca foi reconciliado. Hoje ele é perigoso: a seção 0 manda rodar `npx create-expo-app` na raiz
como "primeiro passo real" — num repositório que já tem package.json, isso gera um projeto por
cima do existente. A lista completa de afirmações falsas, já verificada, está em
docs/plans/plano_lacunas_criticas.md, "Item 3" (package.json, functions/, eas.json,
android.package, assets/, firebase-messaging-sw.js existem; a web sai pela Vercel e não pelo
Firebase Hosting; os "achados conhecidos" do npm install não se manifestam; a suíte de rules roda
com `npm run test:rules`, não vitest; a primária é blue-600, não teal).

Tarefa: reescreva RELEASE_CHECKLIST.md por inteiro (exceção justificada ao CLAUDE.md §4.1: quase
todas as seções estão erradas, e edição pontual deixaria metade verdade, metade não).
1. CONFIRA cada fato no repositório antes de escrevê-lo — não copie do plano sem olhar. Rode
   `git rev-parse --short HEAD` e abra o arquivo com: "Verificado contra o commit <hash> em
   <data>. Se o repositório mudou desde então, reconfira antes de confiar."
2. Mantenha a convenção atual: 🔴 = depende de credencial/conta/decisão do usuário; ⚠️ = bloqueio
   real verificado no repositório. Não use ⚠️ para nada que não tenha conferido.
3. Estrutura:
   - 0. Pré-requisitos: só o que é de fato do usuário (🔴 google-services.json; 🔴 variáveis
     EXPO_PUBLIC_* cadastradas na EAS — `eas env:create` — e na Vercel; nunca
     EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN fora do .env.local).
   - 1. Qualidade: os comandos reais (npm run lint, typecheck, test, test:rules, functions
     build/test) e que o workflow .github/workflows/ci.yml roda tudo em cada PR — SE ele existir
     neste commit (Prompt 2.2); se não existir, diga que ainda falta e aponte para
     docs/plans/prompts_lacunas_criticas.md. Remova a lista de "achados conhecidos" antigos.
   - Observabilidade: mantenha os itens ✅ de Crashlytics e Sentry e os 🔴 de google-services.json
     e EXPO_PUBLIC_SENTRY_DSN (estão corretos).
   - 2. Android/EAS: eas.json JÁ existe — transforme a seção em "conferir", não "criar". Leia o
     eas.json e diga o que está nele (perfis, appVersionSource remote, autoIncrement em
     production). Confira na documentação do EAS se o perfil production sem `android.buildType`
     gera AAB por padrão e registre o resultado. Mantenha os 🔴 de keystore/`eas credentials`,
     fingerprint SHA-1/SHA-256 de produção no Firebase (sem isso o Google Sign-In quebra só no
     build de produção), service account para `eas submit`.
   - 3. Web: deploy pela Vercel (vercel.json: buildCommand `npx expo export -p web`,
     outputDirectory dist, headers do service worker). Remova toda a instrução de bloco `hosting`
     no firebase.json. Mantenha os 🔴 de domínio de produção no reCAPTCHA Enterprise e de
     EXPO_PUBLIC_FIREBASE_VAPID_KEY no ambiente da Vercel para push web.
   - 4. Play Store: política de privacidade apontando para o plano do item 1
     (docs/plans/plano_lacunas_criticas.md) — se app/(app)/settings.tsx ainda tiver o
     placeholder `SUBSTITUIR`, é ⚠️; Data Safety (mantenha o mapeamento atual, que está correto, e
     acrescente que crash data vai para Crashlytics/Sentry sem identificar o usuário); ícone
     (`assets/` já tem — o que falta é feature graphic 1024×500 e screenshots); classificação de
     conteúdo, categoria, descrições, público-alvo.
   - 5. App Check (nova): enforcement do Firestore só depois que web e Android estiverem
     verificados no painel de métricas; o nativo depende do item 5 do plano
     (docs/plans/plano_lacunas_criticas.md).
   - Ordem recomendada: atualize para refletir as seções novas.
4. Não toque em PLAN.md, CLAUDE.md nem nos arquivos de docs/plans/ (são registros históricos).
5. Rode npm run lint && npm run typecheck && npm test (nada deveria mudar — é só documentação).

Commit:
docs(release): reconciliar o checklist de release com o estado real do repositório
```

**Modelo recomendado:** Claude Sonnet 5 — documentação, mas cada linha precisa ser conferida
contra o repositório (e uma pesquisa pontual na documentação do EAS); um modelo mais leve tende a
copiar o plano sem verificar, que é exatamente o defeito que o prompt corrige.

---

## Item 1 — Política de privacidade

### Prompt 1.1 — Rascunho da política como página estática

```
Contexto: o BP Tracker coleta dado de saúde (pressão arterial — dado sensível pela LGPD) e
app/(app)/settings.tsx:41 ainda tem um PRIVACY_POLICY_URL placeholder. Não existe texto de política
no repositório. Decisões já tomadas (docs/plans/plano_lacunas_criticas.md, "Item 1"): a política
é uma página HTML estática em public/privacidade.html, publicada pela Vercel junto do app web
(`npx expo export -p web` copia public/ para dist/), acessível sem login. Este prompt cria só a
página; a fiação no app é o Prompt 1.2.

Tarefa:
1. Levante os fatos no CÓDIGO antes de escrever (não confie só na tabela do plano): o que
   ensureUserProfile.ts grava em users/{uid}; os campos de src/types/models.ts; o que vai para
   devices/; o que fica só no AsyncStorage (busque por AsyncStorage em src/features/); o que
   src/lib/logger.ts sanitiza e o que crashReporter.native.ts/.web.ts enviam (e o que NÃO enviam
   — sem setUser, sendDefaultPii: false); o que deleteAccount.ts e functions/src/triggers/
   onUserDelete.ts apagam; confirme no package.json que não há SDK de analytics nem de anúncio.
2. Crie public/privacidade.html:
   - Documento único, lang="pt-BR", meta viewport, <title>Política de Privacidade — BP Tracker</title>.
   - CSS inline, sem fonte externa, sem script, sem nenhum recurso de terceiro (a página da
     política não pode ela mesma rastrear quem a lê). Paleta "Medical Clean" do CLAUDE.md §1:
     fundo slate-50 (#F8FAFC), superfície branca, texto slate-800 (#1E293B), links blue-600
     (#2563EB); dark mode via @media (prefers-color-scheme: dark) com contraste AA; corpo ≥ 16px,
     largura máxima de leitura ~70ch, legível em celular.
   - Seções (LGPD art. 9º): quem é o controlador e como falar com o encarregado; quais dados são
     coletados e para quê (separe dados de conta, dados de saúde, preferências, identificadores
     de aparelho, dados de diagnóstico de erro, dados que ficam só no aparelho); base legal; com
     quem os dados são tratados (Google Firebase — Auth, Firestore, Cloud Functions, Cloud
     Messaging, Crashlytics —, Vercel, Sentry) e que não há venda, publicidade nem analytics;
     transferência internacional; onde ficam armazenados; por quanto tempo; segurança (regras de
     acesso por usuário, App Check); direitos do titular (LGPD art. 18) e como exercê-los; como
     excluir a conta e todos os dados pelo próprio app (Ajustes → "Excluir minha conta" — cite o
     texto exato do botão em settings.tsx); que o app registra e não diagnostica (reaproveite o
     sentido de src/components/ui/Disclaimer.tsx); público-alvo adulto; alterações desta
     política; data de vigência.
   - Tudo que só o usuário sabe vira marcador visível e fácil de achar, no formato
     [PREENCHER: descrição] — nunca invente: nome/razão social do controlador, CPF/CNPJ se
     aplicável, e-mail do encarregado, região do Firestore (o plano previa southamerica-east1 —
     escreva como a confirmar), região da organização no Sentry, prazos de retenção do
     Crashlytics/Sentry, data de vigência.
   - Base legal para dado de saúde: escreva a de consentimento (LGPD art. 11, I) e deixe um
     comentário HTML <!-- REVISÃO JURÍDICA: ... --> explicando que o app ainda não coleta
     consentimento explícito (ver Prompt 1.3) e que isso precisa ser decidido antes de publicar.
   - Linguagem clara, sem juridiquês desnecessário e sem promessas que o código não cumpre (não
     escreva "criptografia de ponta a ponta", por exemplo — o Firestore criptografa em trânsito e
     em repouso, mas não ponta a ponta).
   - Primeira linha visível da página, enquanto houver [PREENCHER]: um aviso "Rascunho — não
     publicar antes da revisão" — para ser impossível publicar sem perceber.
3. Em vercel.json, acrescente `privacidade\\.html` à lista de exceções da regex do rewrite
   catch-all (mesmo padrão de favicon\\.ico e manifest\\.json), para o rewrite nunca mandar a
   política para o index.html do app.
4. Rode `npx expo export -p web` e confirme que dist/privacidade.html existe. Não commite dist/.
5. Rode npm run lint && npm run typecheck && npm test.
6. No resumo final para o usuário, liste todos os [PREENCHER] e o ponto de revisão jurídica.

Commit:
docs(privacy): rascunho da política de privacidade como página estática
```

**Modelo recomendado:** Claude Opus 5.5 — texto com peso jurídico sobre dado sensível de saúde,
que precisa ser fiel ao que o código realmente faz e não pode prometer o que não existe.

---

### Prompt 1.2 — Ligar a política no app (Ajustes e login)

```
Contexto: no BP Tracker, public/privacidade.html já existe (Prompt 1.1) e o texto foi revisado pelo
usuário (sem [PREENCHER] nem o aviso de rascunho — confira com grep antes de começar; se ainda
houver, PARE e avise, não publique link para um rascunho). O usuário informou o domínio de
produção da Vercel: <COLE AQUI O DOMÍNIO, ex.: https://bp-tracker.vercel.app>.
Hoje app/(app)/settings.tsx:41 tem PRIVACY_POLICY_URL placeholder, e a tela de login
app/(auth)/sign-in.tsx não tem link para a política.

Tarefa:
1. Crie src/lib/legal.ts com `export const PRIVACY_POLICY_URL = '<domínio>/privacidade.html';`
   e um comentário curto: constante e não variável de ambiente porque a URL é pública e uma
   variável a mais seria mais um item a esquecer no EAS de produção (link quebrado em silêncio).
2. Em app/(app)/settings.tsx: remova a constante placeholder e o comentário dela; importe de
   @/lib/legal. O tratamento de erro existente (diálogo 'privacyPolicyFailed') continua igual.
3. Em app/(auth)/sign-in.tsx: acrescente, abaixo do botão de login, um texto curto do tipo "Ao
   entrar, você concorda com a Política de Privacidade" em que "Política de Privacidade" é um link
   (accessibilityRole="link", alvo de toque ≥ 48dp, cor palette.primary) que abre a mesma URL via
   Linking.openURL, com try/catch e mensagem amigável em português se falhar (CLAUDE.md §4.3 —
   todo catch faz algo; siga o padrão já usado em settings.tsx). Não mude o fluxo de login.
4. Testes: em __tests__/app/(app)/settings.test.tsx, garanta que tocar "Política de privacidade"
   chama Linking.openURL com PRIVACY_POLICY_URL; crie ou ajuste o teste da tela de login para o
   mesmo comportamento. Teste comportamento, não implementação (CLAUDE.md §4.6).
5. Rode npm run lint && npm run typecheck && npm test.
6. Avise o usuário para colar a mesma URL no Play Console → Política do app → Política de
   privacidade.

Commit:
feat(privacy): apontar ajustes e login para a política de privacidade publicada
```

**Modelo recomendado:** Claude Sonnet 5 — fiação pequena e totalmente especificada.

---

### Prompt 1.3 — Consentimento explícito para dado de saúde (CONDICIONAL)

> Só rode se o jurídico confirmar que o app precisa coletar consentimento específico e destacado
> (LGPD art. 11, I) — ver `plano_lacunas_criticas.md`, "Ponto em aberto para o jurídico".

```
Contexto: no BP Tracker, a política de privacidade já está publicada (Prompts 1.1/1.2) e o
jurídico confirmou que, para tratar dado de saúde, o app precisa de consentimento específico e
destacado (LGPD art. 11, I), registrado de forma verificável. Hoje o usuário faz login e já pode
gravar medições sem aceitar nada. O consentimento precisa ficar no SERVIDOR (prova do aceite), não
no AsyncStorage.

Antes de codar, leia: firestore.rules (validProfile de users/{uid}), src/features/auth/
ensureUserProfile.ts e auth.repo.ts (merge seletivo do perfil a cada login), src/features/
onboarding/useOnboardingGate.ts e app/_layout.tsx (padrão de gate de navegação),
functions/src/triggers/onUserSettingsWrite.ts (guarda isSameSchedule — confirme que o campo novo
não faz todo aceite recalcular o lembrete).

Tarefa:
1. Modelo: em users/{uid}, campo opcional `privacyConsent: { version: string, acceptedAt:
   Timestamp }`. Constante PRIVACY_POLICY_VERSION em src/lib/legal.ts (ex.: '2026-10-01'); quando
   a política mudar de forma relevante, a versão muda e o aceite é pedido de novo.
   CLAUDE.md §3.3 — no MESMO commit: tipo em src/types/models.ts (UserProfile), firestore.rules
   (hasOnly + validação: map com hasOnly(['version','acceptedAt']), version string ≤ 32,
   acceptedAt == request.time quando o campo muda — o cliente não pode antedatar o aceite),
   firestore.indexes.json (sem mudança — diga isso no commit) e testes de rules: positivo (dono
   grava aceite com request.time), negativos (acceptedAt no passado, chave extra no map, usuário B
   gravando aceite de A).
   users/{uid} ainda não tem schema Zod (dívida registrada em reminders.repo.ts:31). Crie
   src/features/auth/user-profile.schema.ts só com o que este prompt precisa ler (privacyConsent
   + o que já for lido no mesmo lugar) — não migre todos os leitores do perfil aqui, isso é outra
   tarefa.
2. Repositório: função em auth.repo.ts para gravar o aceite (serverTimestamp, try/catch, mensagens
   amigáveis como os demais repos) e leitura do aceite via o schema novo. ensureUserProfile NÃO
   pode apagar privacyConsent no merge de cada login — confira e cubra com teste.
3. Gate: hook src/features/privacy/useConsentGate.ts, no mesmo padrão de useOnboardingGate
   (decide só depois de isLoading; useRef para não navegar em loop). Sem aceite da versão vigente
   → router.replace('/consent'). O gate de consentimento tem PRIORIDADE sobre o de onboarding
   (o onboarding só aparece depois do aceite) — ajuste a ordem em app/_layout.tsx e explique.
4. Tela: app/consent.tsx (rota de composição) + src/screens/ConsentScreen.tsx (componente burro).
   Conteúdo: título claro; em 2–3 frases, o que é coletado e para quê; link para a política
   completa (PRIVACY_POLICY_URL); um Switch/checkbox "Autorizo o tratamento dos meus dados de
   pressão arterial para registro e lembretes" — destacado, separado de qualquer outro texto, e
   DESMARCADO por padrão (consentimento não pode ser pré-marcado); botão "Continuar" habilitado só
   com a caixa marcada; botão "Não autorizo" que explica que o app não funciona sem isso e
   oferece sair (signOut). Tom calmo, sem pressão (CLAUDE.md §1). Acessibilidade do §4.7. Não
   enfraqueça o texto da autorização sem pedir ao usuário — ele foi decidido pelo jurídico.
5. Ajustes: mostrar "Você autorizou em <data>" no card Privacidade; revogar o consentimento =
   excluir a conta (o fluxo já existe) — não crie um segundo caminho de revogação; deixe isso
   escrito na tela.
6. Testes comportamentais da tela e do gate; npm run lint && npm run typecheck && npm test &&
   npm run test:rules.

Commit:
feat(privacy): pedir e registrar consentimento para tratar dado de saúde
```

**Modelo recomendado:** Claude Opus 5.5 — mudança de modelo do perfil com Security Rules, ordem de
gates de navegação e texto com consequência jurídica; muitas peças com risco de regressão
silenciosa (o merge de `ensureUserProfile`, a guarda `isSameSchedule`).

---

## Item 4 — Segunda medição preserva as leituras individuais

> Os três prompts assumem a **Opção A** do plano (média + leituras individuais no mesmo
> documento). Se você escolheu outra, ajuste antes de rodar.

### Prompt 4.1 — Modelo de dados, schema e Security Rules

```
Contexto: no BP Tracker, a segunda medição (protocolo AHA) grava a MÉDIA por cima do documento da
primeira (useSecondMeasurementFlow.submitSecondMeasurement → updateReading) e as duas leituras
individuais se perdem; nada no documento indica que é uma média. Decisão tomada
(docs/plans/plano_lacunas_criticas.md, "Item 4", Opção A): manter um documento por sessão, com a
média nos campos de sempre e um campo novo `sessionReadings` com as duas leituras. Este prompt
cobre só o modelo e a segurança; o fluxo é o 4.2, a interface é o 4.3.

Tarefa (CLAUDE.md §3.3 — tudo no MESMO commit):
1. src/types/models.ts:
     export interface SessionReadingValues { systolic: number; diastolic: number; pulse: number | null }
     export type SessionReadings = [SessionReadingValues, SessionReadingValues];
   e em Reading: `sessionReadings: SessionReadings | null;` com comentário curto: null = medição
   única; quando presente, systolic/diastolic/pulse do documento são a média
   (computeSessionAverage) destas duas leituras. `SessionReading` de src/domain/session-average.ts
   tem o mesmo formato — reaproveite um tipo no outro em vez de manter dois iguais (decida a
   direção respeitando que src/domain/ não importa de src/types/ se isso violar o fluxo de
   dependência do CLAUDE.md §3.2; se violar, src/types/ reexporta o do domínio).
2. src/features/readings/reading.schema.ts: `sessionReadings` como tupla de exatamente 2 itens,
   `.nullish().transform(v => v ?? null)` (documentos antigos não têm a chave e precisam
   continuar válidos — teste isso). Cada item usa as MESMAS constantes de faixa
   (SYSTOLIC_MIN/MAX etc.) e a mesma regra sistólica > diastólica — extraia o que for preciso para
   não duplicar as faixas. Mensagens de erro em português, no padrão do arquivo. Não coloque no
   schema de LEITURA nenhuma regra que possa fazer um documento existente sumir do histórico.
3. firestore.rules, bloco readings:
   - 'sessionReadings' no hasOnly de validReading.
   - Quando `d.get('sessionReadings', null) != null`: é list, size() == 2, e cada item (índices 0
     e 1, via função auxiliar validSessionEntry) é map com keys().hasOnly(['systolic','diastolic',
     'pulse']), keys().hasAll(['systolic','diastolic']), intBetween nas mesmas faixas,
     systolic > diastolic, pulse opcional via get(..., null) como já se faz no documento.
   - NÃO valide nas rules que o valor principal é a média das duas: o arredondamento de math.round
     das rules não tem semântica documentada igual à do Math.round do JS, e meia unidade de
     diferença negaria escrita legítima. Escreva esse porquê num comentário.
4. tests/firestore.rules.test.ts: positivos — dono cria medição sem o campo (continua valendo);
   dono atualiza a própria medição incluindo sessionReadings válido; dono grava sessionReadings
   null. Negativos — 1 item, 3 itens, item com chave extra, item fora de faixa, item com
   sistólica ≤ diastólica, sessionReadings como map em vez de list, usuário B gravando
   sessionReadings em medição de A.
5. firestore.indexes.json: sem mudança (nenhuma query nova) — diga isso na mensagem de commit.
6. Este prompt faz o TypeScript apontar todos os lugares que constroem Reading/ReadingInput. Para
   manter este commit compilando SEM mudar comportamento: medição comum passa
   `sessionReadings: null` onde for exigido (useAddReading, useUpdateReading, fixtures de teste). O
   fluxo da segunda medição continua igual até o 4.2.
7. Rode npm run lint && npm run typecheck && npm test && npm run test:rules.

Commit:
feat(readings): modelar as leituras individuais de uma sessão de duas medições
```

**Modelo recomendado:** Claude Opus 5.5 — mudança de modelo de dado de saúde com Security Rules
(casos negativos, compatibilidade com documentos antigos, decisão consciente de não validar a
média nas rules).

---

### Prompt 4.2 — Gravar as leituras individuais e tratar a edição

```
Contexto: no BP Tracker, o Prompt 4.1 já criou `sessionReadings: SessionReadings | null` em Reading
(models.ts), no schema Zod e nas rules. Hoje todo mundo grava null. Este prompt faz a segunda
medição gravar as duas leituras e define o que acontece ao EDITAR uma medição que é média.

Antes, leia: src/features/readings/useSecondMeasurementFlow.ts (submitSecondMeasurement,
FirstMeasurement), useUpdateReading.ts e useAddReading.ts (ReadingFormValues), useReadingForm.ts
(modo edição com initialReading/EditableReading) e app/(app)/edit-reading/[id].tsx.

Tarefa:
1. ReadingFormValues ganha `sessionReadings?: SessionReadings | null` (opcional: o formulário de
   criação continua sem saber disso; ausente = null). useUpdateReading e useAddReading repassam o
   valor ao candidato validado por parseReadingInput.
2. useSecondMeasurementFlow.submitSecondMeasurement: além da média, envia
   `sessionReadings: [primeira, segunda]` com os valores numéricos das duas leituras (sem id/note/
   measuredAt). Atualize o comentário do topo do hook e do método: a média continua no documento
   da primeira medição, e agora as duas leituras ficam preservadas em sessionReadings.
3. Edição (useReadingForm em modo edição): se systolic, diastolic e pulse continuarem iguais aos
   de initialReading (compare como número), preserve initialReading.sessionReadings; se QUALQUER
   um dos três mudou, envie null — o valor deixou de ser a média daquelas leituras e passa a ser
   uma correção manual. Mudar só observação ou horário preserva. Essa regra mora no hook, não na
   tela (CLAUDE.md §3.4). Comente o porquê em uma linha.
4. Testes:
   - useSecondMeasurementFlow.test.ts: updateReading recebe sessionReadings com as duas leituras,
     na ordem primeira → segunda, e a média nos campos principais.
   - useReadingForm.test.ts: edição de medição-média mudando só a observação preserva
     sessionReadings; mudando a sistólica envia null; edição de medição comum continua null.
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): preservar as duas leituras ao salvar a média da sessão
```

**Modelo recomendado:** Claude Sonnet 5 — regras de fluxo e de edição totalmente especificadas no
prompt.

---

### Prompt 4.3 — Mostrar e exportar as leituras da sessão

```
Contexto: no BP Tracker, depois dos Prompts 4.1/4.2, medições que são média de uma sessão têm
`sessionReadings` (duas leituras) e as demais têm null. Falta o usuário (e o médico) ver isso.

Tarefa:
1. src/components/bp/ReadingRow.tsx: quando reading.sessionReadings !== null, uma legenda
   (Text variant="caption", mesmo estilo da legenda "Pendente de sincronização") "Média de 2
   medições: 150/95 e 120/80" (formate a partir dos dados; inclua o pulso entre parênteses só se a
   leitura tiver pulso). No accessibilityLabel da linha, acrescente ", média de 2 medições, 150
   por 95 e 120 por 80" — NUNCA "barra" (CLAUDE.md §4.7). Componente continua burro; se a
   formatação ficar maior que uma linha, extraia uma função pura para src/lib/ com teste.
2. src/components/bp/SecondMeasurementSummaryDialog.tsx: o texto vira "A média foi salva no seu
   histórico, junto com as duas medições." e o comentário JSX acima dele é atualizado (hoje diz
   que a média SUBSTITUIU a primeira leitura, o que deixa de ser verdade).
3. src/lib/csv.ts: coluna nova `medicoes_da_sessao` no FIM do cabeçalho (depois de observacao —
   no fim para não quebrar quem importa por posição). Vazia para medição única; para sessão,
   `150/95 (72) e 120/80 (70)`, omitindo "(…)" de leitura sem pulso. O valor nunca contém `;`,
   mas passe pelo mesmo escape das outras colunas por consistência.
4. Testes: ReadingRow.test.tsx (legenda e rótulo acessível com e sem sessão); csv.test.ts
   (cabeçalho novo, linha de medição única com coluna vazia, linha de sessão com e sem pulso);
   SecondMeasurementSummaryDialog.test.tsx (texto novo). Ajuste os testes existentes que
   conferem o cabeçalho antigo.
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): exibir e exportar as duas leituras de uma sessão de medição
```

**Modelo recomendado:** Claude Sonnet 5 — textos e formatos fechados no prompt; o cuidado de
acessibilidade está explícito.

---

## Item 5 — App Check nativo

### Prompt 5.1 — Ponte RNFirebase App Check → JS SDK (com spike de validação)

```
Contexto: no BP Tracker, src/services/firebase/appCheck.native.ts só inicializa o App Check se
receber um `attestationExchange`, e src/services/firebase/index.ts chama initAppCheck() sem
opções — em produção o Android segue SEM App Check (cai no logError "inicialização ignorada").
Por isso o enforcement no Firestore não pode ser ligado. O comentário do arquivo propõe uma Cloud
Function própria de troca de atestação, que não existe. Decisão do plano
(docs/plans/plano_lacunas_criticas.md, "Item 5", Caminho A): usar
@react-native-firebase/app-check (mesma família do @react-native-firebase/app já instalado, 26.x)
para obter o token com o provider NATIVO de Play Integrity — o Firebase valida a atestação —, e
entregar esse token ao JS SDK pelo CustomProvider já usado em appCheck.native.ts.

RISCO A ELIMINAR PRIMEIRO: o token do RNFirebase é emitido para o app ANDROID registrado no
Firebase; o JS SDK é inicializado com a config do app WEB (EXPO_PUBLIC_FIREBASE_APP_ID, ver
firebase.native.ts). É preciso confirmar que o Firestore aceita esse token com enforcement ligado.

Tarefa:
1. Pesquisa antes do código (CLAUDE.md §4.1 — dependência nova se justifica antes): confira na
   documentação do React Native Firebase da versão instalada (26.x) a API de app-check
   (ReactNativeFirebaseAppCheckProvider, configure({ android: { provider, debugToken } }),
   initializeAppCheck, getToken — e o formato exato do retorno), se exige config plugin próprio
   no app.config.ts ou se o de @react-native-firebase/app basta, e o que a documentação do
   Firebase diz sobre usar um token App Check emitido para um app num cliente de outro app do
   mesmo projeto. Registre as fontes no resumo final. Se a documentação disser que NÃO funciona,
   PARE e reporte — o caminho passa a ser o Prompt 5.B.
2. Instale com `npx expo install @react-native-firebase/app-check` (tem parte nativa — versão
   pareada; confira que ficou na mesma major de @react-native-firebase/app).
3. Crie src/services/firebase/appCheckBridge.native.ts:
   - Configura o provider do RNFirebase: `playIntegrity` em produção; em __DEV__, `debug` com
     process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN dentro de `if (__DEV__)` (mesmo cuidado de
     dead code elimination já explicado em appCheck.native.ts — o token nunca pode ir para o
     bundle de produção nem para `extra`).
   - Exporta `getNativeAppCheckToken(): Promise<AppCheckToken>` ({ token, expireTimeMillis }) para
     o CustomProvider. Se o RNFirebase não devolver a expiração, extraia o `exp` do payload do JWT
     (decodificação base64url, sem verificar assinatura — quem verifica é o backend; sem
     dependência nova para isso; função pura em src/lib/ com teste).
   - Em falha: logError('appCheck.nativeToken', error) e relança — o SDK do App Check trata
     falha de provider com retry/backoff; não devolva token falso.
4. appCheck.native.ts: o caminho padrão passa a usar a ponte quando nenhum attestationExchange for
   passado. Escolha UM caminho de debug no nativo: o debug provider do RNFirebase (exercita a mesma
   ponte de produção) — remova a injeção do FIREBASE_APPCHECK_DEBUG_TOKEN global do JS SDK no
   nativo se ela ficar redundante, explicando no comentário. Reescreva o comentário grande do
   arquivo: ele hoje diz que o RNFirebase "não resolveria"; explique a diferença entre inicializar
   App Check pelo RNFirebase e usá-lo só como fonte do token. appCheck.web.ts não muda.
5. Testes (mock de @react-native-firebase/app-check): token devolvido com expireTimeMillis
   correto; decodificação do exp (JWT válido, malformado, sem exp); falha do RNFirebase loga e
   relança; em produção o provider configurado é playIntegrity e nunca debug.
6. npm run lint && npm run typecheck && npm test.
7. No resumo final, entregue ao usuário o roteiro de validação (não é código, é dele):
   a) build de desenvolvimento com debug token registrado no Console → app funciona;
   b) num projeto Firebase de DESENVOLVIMENTO, ligar o enforcement do Firestore e confirmar que o
      dev build continua lendo/gravando — esta é a prova do risco acima; se falhar, Prompt 5.B;
   c) publicar em internal testing com Play Integrity configurado (SHA-256 do Play App Signing no
      Firebase Console) e acompanhar as métricas do App Check por alguns dias, web e Android;
   d) só então ligar o enforcement do Firestore em produção.

Commit:
feat(security): app check nativo via play integrity com ponte para o sdk js
```

**Modelo recomendado:** Claude Opus 5.5 — segurança, dependência nativa nova, pesquisa de
compatibilidade com decisão de parar e uma premissa a provar antes de confiar.

---

### Prompt 5.B — Contingência: troca de atestação por Cloud Function

> Só se o Prompt 5.1 provar que o Firestore **não** aceita o token emitido para o app Android num
> cliente inicializado com a config web.

```
Contexto: no BP Tracker, a ponte RNFirebase → JS SDK para App Check (Prompt 5.1 de
docs/plans/prompts_lacunas_criticas.md) não funciona porque <descreva aqui o resultado do teste
com enforcement>. Caminho B do plano: o app obtém um token do Play Integrity e uma Cloud Function
o troca por um token App Check. src/services/firebase/appCheck.native.ts já descreve esse fluxo e
já aceita `attestationExchange` no CustomProvider.

ATENÇÃO DE SEGURANÇA: admin.appCheck().createToken() emite token sem validar nada. Se a Function
emitir token sem verificar a atestação corretamente, qualquer pessoa chama o endpoint e ganha um
App Check válido — pior do que não ter App Check, porque dá falsa sensação de proteção.

Tarefa:
1. Antes de codar, apresente ao usuário um desenho curto e espere aprovação: (a) como obter o
   token do Play Integrity no app — avalie biblioteca mantida compatível com Expo SDK 57 vs. um
   Expo Module próprio (Kotlin, com.google.android.play:integrity, StandardIntegrityManager);
   (b) a Function — onRequest ou onCall, região southamerica-east1 como as demais, proteção contra
   abuso do próprio endpoint; (c) como o nonce/requestHash é gerado e amarrado à requisição para
   impedir replay; (d) permissões da conta de serviço para a Play Integrity API
   (playintegrity.googleapis.com, decodeIntegrityToken) via Secret Manager/defineSecret se houver
   segredo (CLAUDE.md §4.4).
2. Depois de aprovado, a Function em functions/src/appcheck/exchangePlayIntegrity.ts deve, antes
   de emitir qualquer token, verificar no veredito: requestDetails (requestPackageName ==
   'com.ramonmenz.bptracker', requestHash/nonce == o esperado, timestamp recente),
   appIntegrity (appRecognitionVerdict == 'PLAY_RECOGNIZED', packageName,
   certificateSha256Digest contendo o SHA-256 do Play App Signing — configuração, não hard-code
   espalhado), deviceIntegrity (MEETS_DEVICE_INTEGRITY). Qualquer falha → 403 sem detalhe do
   motivo para o cliente, logger.warn com o motivo no servidor (sem token, sem PII).
   Só então admin.appCheck().createToken(<appId do app WEB usado pelo JS SDK>,
   { ttlMillis } entre 30 min e 7 dias) e devolver { token, expireTimeMillis }.
3. Exporte em functions/src/index.ts. Testes Jest no projeto functions cobrindo cada recusa
   (pacote errado, app não reconhecido, certificado errado, dispositivo sem integridade, nonce
   errado, veredito velho) e o caminho feliz — a verificação é a parte que importa testar.
4. Cliente: attestationExchange chama o módulo nativo + a Function e devolve o AppCheckToken.
5. npm run lint && npm run typecheck && npm test && npm --prefix functions run build &&
   npm --prefix functions test.

Commit:
feat(security): troca de atestação play integrity por token app check
```

**Modelo recomendado:** Claude Opus 5.5 — o prompt de maior risco de segurança do conjunto (uma
validação incompleta anula o recurso inteiro), com código nativo e decisões que precisam de
aprovação antes.
