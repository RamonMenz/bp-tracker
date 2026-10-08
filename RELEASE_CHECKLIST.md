# Checklist de Release — BP Tracker

> Verificado contra o commit 5b1969a em 2026-10-08. Se o repositório mudou desde então, reconfira
> antes de confiar.
>
> Checklist operacional da Fase 7 (PLAN.md): do estado atual do repositório até o app instalado
> da Play Store (internal testing), registrando e notificando de ponta a ponta.
>
> 🔴 = exige credencial, conta ou decisão sua — não dá para executar nem inventar o valor.
> ⚠️ = bloqueio real, verificado no repositório neste commit.

---

## 0. Pré-requisitos (só o que é seu)

O projeto já existe: `package.json`, `functions/` (com `src/index.ts`), `eas.json`, `assets/`,
`public/firebase-messaging-sw.js` e `android.package` (`com.ramonmenz.bptracker`, em
`app.config.ts`) estão no repositório. **Não rode `npx create-expo-app`** — geraria um projeto por
cima do existente.

- [ ] 🔴 **`google-services.json`** — gitignored por design (CLAUDE.md §4.4). Baixe em Firebase
      Console → Configurações do projeto → app Android (`com.ramonmenz.bptracker`). Local: na
      raiz. No EAS: variável de arquivo `GOOGLE_SERVICES_JSON` (é o que `app.config.ts` lê;
      sem ela, cai em `./google-services.json`).
- [ ] 🔴 **Variáveis `EXPO_PUBLIC_*` cadastradas na EAS** (`eas env:create`, ambiente
      `production`; o workflow `eas-build.yml` usa `eas env:pull` do ambiente `development`):
      `EXPO_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`,
      `_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (obrigatórias — `requireEnv`
      em `app.config.ts` lança erro sem elas) e as opcionais `EXPO_PUBLIC_FIREBASE_VAPID_KEY`,
      `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`. O `.env.local` é
      local e gitignored: a EAS não o lê.
- [ ] 🔴 **As mesmas variáveis cadastradas na Vercel** (Project Settings → Environment
      Variables), porque o build web roda lá (`npx expo export -p web`).
- [ ] 🔴 **`EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` nunca fora do `.env.local`** — nem na EAS, nem na
      Vercel, nem em CI. É credencial de desenvolvimento (ver `.env.example`).
- [ ] 🔴 **`.env.local`** local (copie de `.env.example`) para rodar o app em dev.

---

## 1. Qualidade

Comandos reais (todos existem no `package.json`; os de Functions em `functions/package.json`):

- [ ] `npm install` e `npm --prefix functions install`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:rules` — suíte de Security Rules (Jest, `jest.rules.config.js`, em
      `tests/firestore.rules.test.ts`) no emulador do Firestore; exige Java 21+.
- [ ] `npm --prefix functions run build`
- [ ] `npm --prefix functions test`

**CI:** `.github/workflows/ci.yml` existe neste commit e roda, a cada PR e a cada push em `main`,
três jobs: app (lint, typecheck, `npm test -- --ci`), Functions (build + testes) e Security Rules
(`npm run test:rules`, com Java 21). Não usa `secrets.*`. Rode localmente antes de commitar
(CLAUDE.md §4.2); o CI é a rede de segurança.

**Só prossiga para a seção 2 com tudo verde.**

---

## Observabilidade — coletor de erro em produção

- [x] ✅ **Nativo: resolvido.** `src/services/firebase/index.ts` chama `setCrashReporter(...)` no
      bootstrap (fora de `__DEV__`, antes de `initAppCheck()`) com o adapter
      `src/services/crashReporter.native.ts`, que usa `@react-native-firebase/crashlytics`. Erro de
      produção no Android vira não-fatal no Crashlytics, agrupado pelo `scope` do `logError`, com
      o contexto já sanitizado como breadcrumb. Coberto por `src/lib/logger.test.ts`.
- [ ] 🔴 **Depende de você antes do primeiro build:** o Crashlytics nativo só inicializa com o
      `google-services.json` no lugar (ver seção 0). `app.config.ts` declara os config plugins
      `@react-native-firebase/app` e `.../crashlytics` e aponta `android.googleServicesFile`; sem
      o arquivo o `prebuild`/`eas build` falha com mensagem explícita — comportamento desejado.
- [x] ✅ **Web: resolvido.** `src/services/crashReporter.web.ts` usa `@sentry/browser` (não existe
      SDK web do Crashlytics). Inicializa de forma preguiçosa na primeira chamada de
      `recordError`, com `sendDefaultPii: false`, `tracesSampleRate: 0` e rastreio de sessão
      desligado — requisito de LGPD (CLAUDE.md §4.4). Coberto por
      `src/services/crashReporter.web.test.ts`.
- [ ] 🔴 **Depende de você para gerar sinal de verdade:** o adapter web só inicializa com
      `EXPO_PUBLIC_SENTRY_DSN` preenchida (projeto criado por você em sentry.io → Settings →
      Projects → Client Keys). Sem ela, registra um aviso único e segue como no-op.

---

## 2. Android / EAS — conferir

O `eas.json` **já existe**. Não rode `eas build:configure` para recriá-lo. Conteúdo atual:

- `cli.appVersionSource: "remote"` (o `versionCode` é gerenciado pela EAS);
- perfil `development`: `developmentClient: true`, `distribution: "internal"`;
- perfil `preview`: `distribution: "internal"`;
- perfil `production`: `autoIncrement: true` (sem `android.buildType`, sem `env`);
- `submit.production: {}` (vazio).

Conferir:

- [ ] 🔴 `eas login` (conta Expo sua).
- [ ] **AAB por padrão no perfil `production`?** Registro: **não verificado** — a documentação do
      EAS (docs.expo.dev) estava inacessível desta sessão e `eas-cli` não está instalado. O que
      consta na documentação pública, de memória, é que o `production` gera AAB quando
      `android.buildType` não é definido, mas confirme antes do build. Se quiser eliminar a
      dúvida, declare `"android": { "buildType": "app-bundle" }` no perfil `production`.
- [ ] 🔴 Variáveis de ambiente `production` na EAS e `GOOGLE_SERVICES_JSON` (seção 0) — o
      `eas.json` não define `env`; elas vêm do `eas env:create`.
- [ ] 🔴 **Keystore:** `eas credentials` (Android). Deixar a EAS gerenciar é o recomendado. Decisão
      sua.
- [ ] 🔴 **Fingerprint SHA-1/SHA-256 de produção no Firebase.** Pegue em `eas credentials` e
      adicione em Firebase Console → Configurações do projeto → app Android → Adicionar impressão
      digital. Sem isso o Google Sign-In quebra **só no build de produção**. (Se a distribuição
      for pela Play com assinatura do app pela Google, adicione também a fingerprint da chave de
      assinatura do Play Console.)
- [ ] 🔴 **Service account para `eas submit`:** `submit.production` está vazio; gere a chave
      JSON no Play Console → Configurações da API e configure-a (`eas submit` / `eas credentials`).
- [ ] 🔴 **Play Integrity / App Check nativo** exige o app registrado no Play Console (ao menos
      internal testing). Ver seção 5.
- [ ] `eas build --profile production --platform android`; acompanhe pelo link do dashboard.
- [ ] Suba o `.aab` como release de *internal testing* e instale num dispositivo real.

---

## 3. Web — deploy pela Vercel

A web **não** sai pelo Firebase Hosting: `firebase.json` não tem (e não deve ganhar) bloco
`hosting`. Config em `vercel.json`: `buildCommand` `npx expo export -p web`,
`outputDirectory` `dist`, `installCommand` `npm ci`, `framework: null`; headers para
`/firebase-messaging-sw.js` (`Service-Worker-Allowed: /`, sem cache) e cache imutável em
`/_expo/static/*`; rewrite de SPA para `/index.html`.

- [ ] 🔴 Projeto Vercel conectado ao repositório, com as variáveis da seção 0.
- [ ] 🔴 **`EXPO_PUBLIC_FIREBASE_VAPID_KEY` no ambiente da Vercel** — sem ela não há push web
      (`public/firebase-messaging-sw.js` existe, mas a chave é necessária; o app funciona sem
      a camada de push web).
- [ ] Testar o build antes de publicar: `npx expo export -p web` e `npx serve dist`; percorra
      login → registrar → histórico.
- [ ] 🔴 **Domínio de produção da Vercel** adicionado à lista permitida da chave no Cloud Console
      → reCAPTCHA Enterprise (a chave foi criada com `localhost`). Adicione também o domínio em
      Firebase Console → Authentication → Domínios autorizados.
- [ ] Confirmar no Firebase Console → App Check que a plataforma web recebe tráfego verificado.

---

## 4. Play Store

### Política de privacidade 🔴

- [ ] Escrever e publicar a política, seguindo o plano do item 1
      (`docs/plans/plano_lacunas_criticas.md`, "Item 1 — Política de privacidade"). Obrigatória
      para app que coleta dado de saúde.
- [ ] ⚠️ **Placeholder ainda presente:** `app/(app)/settings.tsx:41` tem
      `PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo'`.
      Substituir pela URL real antes de publicar.
- [ ] Colar a mesma URL em Play Console → Presença na loja → Política de privacidade.

### Data Safety 🔴 (Play Console → Política → Segurança dos dados)

- [ ] **Dados coletados:** "Saúde e fitness" (pressão arterial, pulso); "Informações pessoais"
      (nome, e-mail — vêm do Google Sign-In); "Identificadores de app" (token FCM).
- [ ] **Crash data:** relatórios de falha vão para Crashlytics (nativo) e Sentry (web), sem
      identificar o usuário (sem PII, contexto sanitizado — ver Observabilidade). Declare
      "Logs de falhas / Diagnóstico" conforme o formulário pedir.
- [ ] **Finalidade:** funcionalidade do app (não publicidade).
- [ ] **Compartilhado com terceiros?** Não — Firestore/FCM são infraestrutura (processador).
      Confirme o enquadramento com a política escrita.
- [ ] **Criptografado em trânsito:** sim (TLS).
- [ ] **Exclusão de dados:** sim — "Excluir minha conta" (`deleteAccount.ts` + trigger
      `onUserDelete`).
- [ ] Dado de saúde pode exigir revisão adicional da Google — planeje prazo maior.

### Ícone e assets visuais 🔴

- [x] ✅ Ícone, adaptive icon, splash e favicon já existem em `assets/` e estão referenciados em
      `app.config.ts` (fundo do adaptive icon `#2563EB`).
- [ ] 🔴 **Feature graphic 1024×500.**
- [ ] 🔴 **Screenshots** de telefone (mín. 2, recomendado 4–8; confira o requisito atual no
      Console). Home com formulário, Histórico, lembretes em Ajustes, badge de categoria. Sem
      dado de saúde real nas capturas.

### Ficha da loja 🔴

- [ ] Questionário de classificação de conteúdo.
- [ ] Categoria (Saúde e fitness / Medicina).
- [ ] Descrições curta e longa — sem linguagem de diagnóstico (CLAUDE.md §1).
- [ ] Público-alvo / faixa etária — confirme que não é direcionado a crianças.

---

## 5. App Check — enforcement

- [ ] Só ligue o enforcement do Firestore **depois** que web **e** Android aparecerem como
      verificados no painel de métricas do App Check. O enforcement vale por serviço, para todas
      as plataformas: ligar antes derruba quem ainda não envia token.
- [ ] O Android depende do item 5 do plano (`docs/plans/plano_lacunas_criticas.md`, "Item 5 —
      App Check nativo"). Neste commit, `appCheck.native.ts` só inicializa se receber um
      `attestationExchange`, e `src/services/firebase/index.ts` chama `initAppCheck()` sem
      opções — ou seja, o nativo ainda segue **sem App Check** em produção. ⚠️ Enquanto isso
      valer, não ligue o enforcement.
- [ ] 🔴 Play Integrity requer o app registrado no Play Console (seção 2).

---

## Ordem recomendada

1. Seção 0 (credenciais e variáveis).
2. Seção 1 até tudo verde (e CI verde no PR).
3. Seção 2 (Android/EAS) — caminho crítico: app instalado via internal testing que registra e
   notifica de ponta a ponta.
4. Seção 3 (web) em paralelo com a 2.
5. Seção 4 (Play Store) em paralelo: política e assets não dependem de build; o submit só depois
   do AAB.
6. Seção 5 (App Check) por último: só após o item 5 do plano implementado e web + Android
   verificados nas métricas.
