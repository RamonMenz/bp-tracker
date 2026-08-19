# Checklist de Release — BP Tracker

> Checklist operacional da Fase 7 (PLAN.md). Não é código — é a sequência de passos pra sair
> daqui até o app instalado da Play Store internal testing, registrando e notificando de ponta a
> ponta (critério de "pronto" do PLAN §Fase 7).
>
> 🔴 = exige credencial, conta ou decisão sua — não posso executar nem inventar o valor.
> ⚠️ = bloqueio real: verifiquei o repo e o passo **não vai funcionar** no estado atual.

---

## 0. Pré-requisitos bloqueantes

Antes de tentar qualquer item abaixo, isto precisa existir — nenhum dos comandos das seções 1–3
roda sem isso:

- [ ] ⚠️ **`package.json` não existe.** Nada de `npm install`/`lint`/`typecheck`/`test` roda.
      Primeiro passo real: `npx create-expo-app` (ou equivalente) na raiz, com Expo Router +
      NativeWind, conforme PLAN §Fase 1.
- [ ] ⚠️ **`functions/package.json` não existe.** As Cloud Functions (`dispatchReminders`,
      `onUserSettingsWrite`, `onDeviceWrite`, `onUserDelete`) têm código e teste, mas não são um
      projeto Node instalável ainda.
- [ ] ⚠️ **`functions/src/index.ts` não existe.** Nenhum dos 4 triggers/scheduler está exportado
      — `firebase deploy --only functions` não teria o que publicar.
- [ ] ⚠️ **`eas.json` não existe.** Ver seção 2.
- [ ] ⚠️ **`app.config.ts` não define `android.package` nem `ios.bundleIdentifier`.** 🔴 Decisão
      sua: o identificador de pacote (ex.: `com.suaempresa.bptracker`) não pode ser trocado
      depois de publicado na Play Store. Não vou inventar um valor.
- [ ] ⚠️ **Nenhum ícone/asset existe** (`assets/` não existe no repo). `app.config.ts` não tem
      campo `icon`/`splash`/`android.adaptiveIcon`. Precisa de artes antes do primeiro build.
- [ ] ⚠️ **`firebase.json` não tem bloco `hosting`.** `firebase deploy --only hosting` falha até
      isso existir (ver seção 3).
- [ ] 🔴 **`google-services.json` não existe** (é gitignored por design — CLAUDE.md §4.4). Baixe
      do Firebase Console → Configurações do projeto → app Android, depois de registrar o app lá
      com o `android.package` acima.
- [ ] 🔴 **`.env.local` com os valores reais do Firebase** — copie de `.env.example` e preencha
      (Fase 0). Sem isso `app.config.ts` lança erro em `requireEnv` e nada builda.

---

## 1. Qualidade — `lint && typecheck && test`

- [ ] `npm install` na raiz.
- [ ] `npm --prefix functions install`.
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm --prefix functions run build` (as Functions são um projeto TS isolado — `tsc` próprio).
- [ ] Rodar a suíte de rules: `firebase emulators:exec --only firestore "npx vitest run"`
      (`tests/firestore.rules.test.ts`, 24 casos da Fase 3).

**Achados já conhecidos que provavelmente vão aparecer aqui** (documentados em fases anteriores
deste mesmo projeto, verificados contra dependências reais em ambiente isolado — nunca contra o
projeto de verdade, porque ele ainda não existe):

- [ ] `useColorScheme() ?? 'light'` (usado em quase toda tela/componente) falha em `strict` contra
      `react-native@0.86`+: `ColorSchemeName` passou a incluir `'unspecified'`, que o `??` não
      cobre. Pode não reproduzir se o Expo SDK instalado fixar uma versão mais antiga de RN — só
      dá pra confirmar depois do `npm install` real.
- [ ] `className` em `View`/`Text`/`Pressable` (todo `src/components/`) só tipa depois que o setup
      do NativeWind gerar `nativewind-env.d.ts` — isso faz parte do `npx expo install nativewind`
      + configuração inicial (PLAN §Fase 1), não uma correção de código.
- [ ] `@shopify/flash-list@2.3.2` (a versão atual do registry) **removeu** a prop
      `estimatedItemSize`, que `app/(app)/history.tsx` usa (v2 fez autosizing). Precisa de ajuste
      quando a versão real for instalada e travada no `package.json`.
- [ ] `BpNumberInput.tsx` passa `invalid` em `accessibilityState`, chave que pode não existir no
      tipo `AccessibilityState` da versão de `@types/react-native` que for resolvida.

Nenhum desses é motivo pra pular a Fase 7 — são exatamente o tipo de coisa que só aparece quando
`npm install` roda pela primeira vez contra versões reais e travadas.

**Só prossiga pra seção 2 com lint/typecheck/test 100% verdes.**

---

## Observabilidade — coletor de erro em produção

- [x] ✅ **Nativo: resolvido.** `src/services/firebase/index.ts` chama `setCrashReporter(...)` no
      bootstrap (fora de `__DEV__`, antes de `initAppCheck()`) com o adapter
      `src/services/crashReporter.native.ts`, que usa `@react-native-firebase/crashlytics`. Erro de
      produção no Android agora vira não-fatal no Crashlytics, agrupado pelo `scope` do `logError`,
      com o contexto já sanitizado como breadcrumb. Coberto por `src/lib/logger.test.ts`.
- [ ] 🔴 **Depende de você antes do primeiro build:** o Crashlytics nativo só inicializa com o
      `google-services.json` no lugar (gitignored por design — ver seção 0). `app.config.ts` já
      declara os config plugins `@react-native-firebase/app` e `.../crashlytics` e aponta
      `android.googleServicesFile`; sem o arquivo, o `prebuild`/`eas build` falha com mensagem
      explícita, que é o comportamento desejado (melhor falhar do que buildar sem coletor).
- [x] ✅ **Web: resolvido.** `src/services/crashReporter.web.ts` usa `@sentry/browser` (não existe
      SDK web do Crashlytics, e o Firebase JS SDK não expõe esse produto). Inicializa de forma
      preguiçosa na primeira chamada de `recordError`, com `sendDefaultPii: false`,
      `tracesSampleRate: 0` e rastreio de sessão desligado — requisito de LGPD do CLAUDE.md §4.4,
      já que é mais um processador de dados recebendo stack trace de app de saúde. Coberto por
      `src/services/crashReporter.web.test.ts`.
- [ ] 🔴 **Depende de você antes de gerar sinal de verdade:** o adapter só inicializa com
      `EXPO_PUBLIC_SENTRY_DSN` preenchida (ver `.env.example`), e essa DSN vem de um projeto criado
      por você em sentry.io (Settings > Projects > seu projeto > Client Keys). Sem ela, o adapter
      registra um aviso único e segue como no-op — não quebra o app, só continua sem coletor web,
      mesmo comportamento do Play Integrity logo abaixo antes do app estar no Play Console.

---

## 2. `eas build --profile production --platform android`

- [ ] 🔴 `eas login` (conta Expo/EAS sua).
- [ ] 🔴 `eas build:configure` — gera o `eas.json` inicial. **Não vou criar esse arquivo com
      valores inventados**; ele precisa ser gerado pela CLI ou escrito por você com os dados reais
      do projeto EAS.

### Campos do `eas.json` pra conferir antes do build de produção

- [ ] **`build.production.android.buildType`** — precisa ser `"app-bundle"` (AAB), não `"apk"`. É
      o formato que a Play Store exige hoje pra apps novos.
- [ ] **`build.production.env`** (ou `eas secret:create` por variável) — todas as
      `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
      `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` precisam estar disponíveis pro build. **O
      `.env.local` é local e gitignored — o EAS não lê esse arquivo.** Sem isso configurado, o
      build de produção quebra no mesmo `requireEnv` que quebraria localmente.
- [ ] **`EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` NÃO pode existir nos secrets/env do EAS** — é
      exclusivamente de dev local (`.env.local`), nunca de CI/build (CLAUDE.md §4.4 e o comentário
      em `appCheck.native.ts`/`appCheck.web.ts`). Confira que não foi adicionado por engano.
- [ ] **`android.package`** em `app.config.ts` — precisa estar definido antes do primeiro build
      (bloqueio já listado na seção 0).
- [ ] **`google-services.json`** — ou commitado como *EAS secret file*
      (`eas secret:create --type file`) ou referenciado via `android.googleServicesFile` no
      `app.config.ts`. Nunca commitado no git (já coberto pelo `.gitignore` da Fase 0).
- [ ] **Credenciais de assinatura (keystore)** — `eas credentials`. Pode deixar o EAS gerenciar
      (recomendado) ou subir um keystore próprio. 🔴 Decisão sua.
- [ ] **`versionCode`** — recomendo `"appVersionSource": "remote"` + `autoIncrement: true` no
      perfil de produção, pra não gerenciar isso manualmente a cada build.
- [ ] **`submit.production`** (se for usar `eas submit` depois) — precisa da
      `service-account.json` do Google Play (🔴 gerada no Play Console → Configurações da API).

### Antes de rodar o build

- [ ] 🔴 **Google Sign-In em produção usa um keystore diferente do de dev.** Pegue o
      SHA-1/SHA-256 real: `eas credentials` → Android → ver keystore. Adicione essa fingerprint em
      **Firebase Console → Configurações do projeto → app Android → Adicionar impressão digital**.
      Sem isso, o login com Google quebra especificamente no build de produção, mesmo funcionando
      em dev.
- [ ] 🔴 **Play Integrity (App Check nativo, Fase 6) precisa do app já registrado no Play
      Console** (ao menos em *internal testing*) antes de poder ser validado de verdade — é uma
      dependência circular conhecida: o primeiro build de produção provavelmente sai *sem* App
      Check nativo funcional, e você liga isso numa iteração seguinte. Não é bloqueio pro primeiro
      build, mas não tente ativar *enforcement* nas rules antes disso.

### Comando

- [ ] `eas build --profile production --platform android`
- [ ] Acompanhar o build até o fim (link do dashboard EAS aparece no terminal).
- [ ] Baixar o `.aab` e testar localmente com `bundletool` ou subir direto como *internal testing*
      release (mais simples — a Play Store instala em dispositivo real a partir daí).

---

## 3. Web: `npx expo export -p web && firebase deploy --only hosting`

- [ ] ⚠️ **`firebase.json` precisa ganhar um bloco `hosting` antes do deploy** — hoje só tem
      `firestore`/`emulators`. Algo como:
      ```json
      "hosting": { "public": "dist", "ignore": ["firebase.json", "**/.*", "**/node_modules/**"] }
      ```
      🔴 Confirme o diretório de saída real do `expo export -p web` da versão do Expo SDK que for
      instalada (mudou de nome entre versões — `web-build` em SDKs mais antigos, `dist` nos
      recentes). Não vou adivinhar sem o `package.json` existir.
- [ ] `npx expo export -p web`
- [ ] Testar o build estático localmente antes de publicar:
      `npx serve dist` (ou o diretório correto) e navegar pelo fluxo de login → registrar →
      histórico.
- [ ] `firebase deploy --only hosting`
- [ ] 🔴 **Depois do primeiro deploy, o domínio `*.web.app` real fica conhecido.** Volte no Cloud
      Console → reCAPTCHA Enterprise → sua chave (Fase 6) e adicione esse domínio à lista
      permitida — a chave foi criada só com `localhost` até aqui.
- [ ] Confirmar no Firebase Console → App Check que a plataforma web está recebendo tráfego
      verificado antes de sequer considerar *enforcement*.
- [ ] 🔴 Se for usar FCM na web: `public/firebase-messaging-sw.js` ainda não existe neste repo
      (mencionado no PLAN §1.3, nunca implementado). Sem ele, notificação push não funciona na
      versão web — mas o app funciona normalmente sem essa camada (lembrete local + push Android
      continuam de pé).

---

## 4. Play Store — política de privacidade, Data Safety, ícone, screenshots

### Política de privacidade 🔴

- [ ] **Escrever a política de privacidade de verdade.** Obrigatória pra qualquer app que colete
      dado de saúde. Precisa cobrir, no mínimo: que dado é coletado (pressão arterial, pulso,
      horário, e-mail/nome do Google), onde fica armazenado (Firestore, região
      `southamerica-east1`), que não é compartilhado com terceiros, como o usuário exclui a conta
      e os dados (já existe, Fase 6 — cite o botão "Excluir minha conta").
- [ ] Publicar em algum lugar estável (a própria Hosting da seção 3 serve — ex.:
      `https://seu-projeto.web.app/privacidade`).
- [ ] ⚠️ **Substituir o placeholder em `app/(app)/settings.tsx`** —
      `PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo'`
      pela URL real. Isso É código (uma linha), mas está fora do escopo desta tarefa de checklist
      — sinalizando aqui pra não esquecer.
- [ ] Colar a mesma URL no campo **Política de privacidade** do Play Console → Presença na loja.

### Data Safety form 🔴 (Play Console → Política → Segurança dos dados)

Preencher com base no que o app realmente faz — não invento essas respostas por você, mas aqui
está o mapeamento pro que o código faz hoje:

- [ ] **Tipo de dado coletado:** "Saúde e fitness" → dado de saúde (pressão arterial, pulso).
      Também "Informações pessoais" (nome, e-mail — vêm do Google Sign-In) e "Identificadores de
      app" (token FCM).
- [ ] **Finalidade:** funcionalidade do app (não analytics, não publicidade — confirme que
      nenhuma dependência adicionada nas fases anteriores contradiz isso).
- [ ] **Compartilhado com terceiros?** Não — Firestore/FCM são infraestrutura (Firebase é
      processador de dados, não terceiro que recebe compartilhamento no sentido da Play Store).
      Confirme esse enquadramento com a política de privacidade escrita acima.
- [ ] **Dado criptografado em trânsito:** sim (Firestore/FCM usam TLS por padrão).
- [ ] **Usuário pode pedir exclusão dos dados?** Sim — cite o fluxo de "Excluir minha conta"
      (Fase 6: `deleteAccount.ts` + trigger `onUserDelete`).
- [ ] **Dado de saúde exige revisão adicional da Google** — plane um prazo maior de aprovação
      pra primeira submissão.

### Ícone e assets visuais 🔴

- [ ] Ícone do app (adaptive icon Android: camada de primeiro plano + fundo, 1024×1024 fonte).
- [ ] Feature graphic da Play Store (1024×500).
- [ ] Configurar `icon`, `android.adaptiveIcon`, `splash` em `app.config.ts` (hoje nenhum existe
      — bloqueio já listado na seção 0).
- [ ] Paleta: teal como cor primária, não vermelho, seguindo CLAUDE.md §1 — evite um ícone que
      pareça um alerta médico.

### Screenshots 🔴

- [ ] Mínimo 2, recomendado 4–8, telefone Android (a Play Store aceita várias proporções —
      confira o requisito atual no Console, muda com frequência).
- [ ] Sugestão de telas pra capturar: Home (formulário com um valor preenchido), Histórico com o
      gráfico de tendência (Fase 7 parte 2), tela de lembretes em Ajustes, o próprio badge de
      categoria em destaque.
- [ ] Sem dado de usuário real nas capturas — gere leituras de exemplo pra não expor dado de
      saúde de ninguém, nem que seja o seu.

### Outros itens padrão da ficha da loja 🔴

- [ ] Questionário de classificação de conteúdo.
- [ ] Categoria do app (Saúde e fitness / Medicina).
- [ ] Descrição curta e longa da loja.
- [ ] Público-alvo / faixa etária — confirme que o app não é direcionado a crianças (afeta
      obrigações de compliance adicionais se marcado errado).

---

## Ordem recomendada

1. Seção 0 até zerar todos os ⚠️.
2. Seção 1 até lint/typecheck/test verdes.
3. Seção 2 (Android) — é o caminho crítico (PLAN: "app instalado da Play Console interna registra
   e notifica de ponta a ponta" é o critério de pronto da Fase 7).
4. Seção 3 (web) pode rodar em paralelo com a 2, não depende dela.
5. Seção 4 (Play Store) começa em paralelo (política de privacidade e assets não dependem de
   build), mas o *submit* em si só acontece depois do AAB da seção 2 existir.
