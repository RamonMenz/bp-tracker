# APK standalone de teste pela EAS (perfil `standalone-teste`)

**Branch:** `feat/eas-standalone`, a partir de `origin/staging` em `f8cfdee`.
**Objetivo:** um APK que **embute o JavaScript** (não precisa de Metro nem de PC) com os módulos nativos atuais de staging (`expo-print`, `aferi-local-voice`), gerado pela EAS e disparado pelo GitHub Actions, com o log completo do build visível no GitHub.
**Estado:** APK gerado pela EAS e inspecionado no CI (build `257aeb67…`, §6). **Nada aqui foi validado em aparelho.**

## 1. Decisões

1. **Perfil novo, os outros intocados.** `eas.json > build.standalone-teste`:
   - `extends: "development"` e `developmentClient: false`. O perfil filho sobrescreve o pai. Sem Dev Client, a EAS usa o `buildType`: `apk` roda `:app:assembleRelease`. É um build **release**: `__DEV__` é `false` e o bundle JS vai dentro do APK.
   - `distribution: "internal"`: gera link de instalação no expo.dev.
   - `environment: "development"` **explícito**. Sem ele, a EAS escolheria `preview`, porque a regra automática só escolhe `development` quando `developmentClient` é `true`.
   - `env.EXPO_PUBLIC_ANDROID_VOICE_ENABLED: "true"` **só neste perfil**. Se a mesma variável existir no ambiente da EAS, o `env` do perfil vence, e o eas-cli avisa no log.
   - `development`, `preview` e `production` ficaram iguais. Validado com `@expo/eas-json` (`EasJsonUtils.getBuildProfileAsync`).
2. **A flag atua em dois pontos, os dois cobertos pelo `env` do perfil.** O `metro.config.js` decide se o código de voz entra no bundle (resolução no export). O `app.config.ts > extra.androidVoiceEnabled` é lido em runtime por `useAssistedWriteContext`. No builder, o `env` do perfil está presente no prebuild e na tarefa Gradle que gera o bundle.
3. **O `eas build` espera o fim, mas não mostra o log.** No eas-cli 27.11.0, `waitForBuildEndAsync` só acompanha o status, e no CI o spinner fica desligado. O workflow então chama `eas build:view <id> --json` e baixa os `logFiles` (URLs assinadas, que nunca são impressas). O script `tools/eas/build-report.cjs` imprime o log por fase (grupos recolhíveis), um resumo das linhas de erro e a URL da página do build.
4. **Pré-voo nativo gratuito.** Antes de gastar cota, o job `preflight_nativo` roda no runner do GitHub, que já tem Android SDK:
   - `expo export -p android` com a flag ligada, conferindo que a voz entrou no bundle;
   - `expo prebuild` com config Firebase **fictícia**;
   - `./gradlew :app:compileReleaseKotlin`, que compila o Kotlin/Java de todos os módulos, inclusive `aferi-local-voice`.

   Ele não usa token nem variável da EAS. Se falhar, o build na EAS não é disparado. Dá para desligar pelo input `preflight`.
5. **`eas env:pull` no job standalone.** O passo existe por três motivos: falhar cedo se o token estiver errado, listar os **nomes** das variáveis e mascarar os valores. A config dinâmica não depende dele: com `environment` no perfil, o próprio eas-cli carrega as variáveis "Plain text" e "Sensitive" para avaliar o `app.config.ts`. O eas-cli não lê `.env`, e o builder recebe as variáveis no servidor.
   - O arquivo vai para `$RUNNER_TEMP`, fora do repositório, e nunca é impresso.
   - `.eas/.env`, onde o `env:pull` grava a variável de arquivo `GOOGLE_SERVICES_JSON`, é apagado antes do build, porque não está no `.gitignore` e não deve subir com o projeto.
   - **Valores fictícios para resolver o projectId.** Antes de saber o projectId, o eas-cli avalia o `app.config.ts` com `expo config --json`, sempre com `EXPO_NO_DOTENV=1` (`src/project/expoConfig.ts`). Como o `app.config.ts` exige seis `EXPO_PUBLIC_*` (`requireEnv`), num runner vazio `env:pull`, `build` e `build:view` falham em cerca de 1 s com `expo config --json exited with non-zero code: 1`.
     - O job standalone define essas seis com o valor `ci-placeholder`.
     - O env passado ao `expo config` é `{ ...process.env, ...variáveis da EAS }`, então, na avaliação final do `eas build`, os valores reais do ambiente `development` sobrescrevem os fictícios.
     - O builder da EAS nunca recebe esses valores: ele usa só o ambiente da EAS e o `env` do perfil.
     - **Esta é a causa reproduzida da falha em 1 s**. Ela também afeta o job `development`, que foi mantido como estava a pedido e continuará falhando no `env:pull` até receber o mesmo bloco `env`.
6. **Segurança do log.**
   - `EXPO_TOKEN` vem só de `secrets.EXPO_TOKEN` e entra só nos passos que falam com a EAS, nunca no `npm ci`.
   - `tools/eas/env-names.cjs` emite `::add-mask::` para cada valor com 6 ou mais caracteres e imprime só nomes. Nada usa `cat` ou `printenv` no arquivo.
   - A URL do artefato passa entre passos **por arquivo** em `$RUNNER_TEMP`. Na 2ª execução ela ia em `env:` do passo, e o GitHub imprime esse bloco no cabeçalho de cada passo, então a URL apareceu no log daquela execução (ver §6). O conserto veio na 3ª execução.
7. **Um build por vez.** `concurrency: eas-build`, sem cancelar o que está em curso. Timeouts: 60 min no pré-voo e 180 min no build, porque a fila gratuita pode demorar. Se o job estourar o tempo, o build continua na EAS e pode ser acompanhado com o input `build_id`, que **não cria build novo**.
8. **Versões fixadas no job novo.** Node 22: a doc do EAS CLI marca o Node 20 como obsoleto. `eas-cli@27.11.0`: a versão cujo código foi lido para estas decisões. O job `development` ficou como estava (Node 20, `eas-cli` mais recente, `--no-wait`).
9. **Inspeção do APK sem gastar cota.** O workflow baixa o APK pronto e confere, imprimindo só contagens:
   - `assets/index.android.bundle` presente (JS embutido);
   - a voz presente no bundle e o módulo `expo/modules/aferivoice` nos dex;
   - as permissões `RECORD_AUDIO`, `CAMERA` e `POST_NOTIFICATIONS` (via `aapt`);
   - o **debug token do App Check ausente**, quando ele é legível no ambiente.

## 2. Privacidade: o que vai embutido no APK

Toda `EXPO_PUBLIC_*` usada no código é substituída pelo valor literal no bundle JS. Quem tem o APK consegue lê-las. Os valores da `extra` do `app.config.ts` também vão para o manifesto do app. **Só nomes:**

| Variável | Onde | Observação |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_APP_ID`, `…_MESSAGING_SENDER_ID` | `extra.firebase` | Públicas por design (CLAUDE.md §4.4). |
| `EXPO_PUBLIC_FIREBASE_VAPID_KEY` | `extra.firebase` e código | Só a web a usa. Pública. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `extra` | OAuth client ID, público. |
| `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` | `extra.appCheck` | Site key, pública. |
| `EXPO_PUBLIC_SENTRY_DSN` | `extra.sentry` | Endereço do coletor, público. |
| `EXPO_PUBLIC_WEB_VOICE_ENABLED`, `EXPO_PUBLIC_ANDROID_VOICE_ENABLED` | `extra` (booleanos) | Flags. Neste APK, a Android vale `true`. |
| `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` | código, **só dentro de `if (__DEV__)`** | ⚠️ **Credencial.** Ver abaixo. |

**O que de fato estava no ambiente `development` da EAS** (lido na 3ª execução, só nomes):
- **Plain text ou sensitive, embutidas no APK:** `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- **Secret:** `GOOGLE_SERVICES_JSON`, que é variável de arquivo e vai para a config nativa, não para o JS.
- **Ausentes no ambiente:** `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN`, `EXPO_PUBLIC_FIREBASE_VAPID_KEY`, `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` e `EXPO_PUBLIC_SENTRY_DSN`. **Não há debug token na EAS**, então ele não está no APK. A flag de voz vem do `env` do perfil.

**Risco do debug token.** Um debug token registrado no Console dá acesso que passa por cima do App Check. Neste APK release, `__DEV__` é `false` e o bloco que o lê é eliminado no bundle. Mesmo assim, se a variável estiver no ambiente `development` da EAS, ela está no builder e no `env:pull` do CI. O workflow avisa quando o nome existe (`::warning::`) e **falha** se o valor aparecer no APK. A recomendação é não manter essa variável na EAS: deixá-la só no `.env.local` do computador. O APK é de uso interno do autor, mas não deve ser repassado: ele carrega a config do projeto Firebase de teste.

**Outros riscos registrados.**
- **App Check.** Em release, o app usa o provider **Play Integrity**. Um APK instalado fora da Play Store tende a não receber atestação válida. Com o enforcement desligado (modo monitor, ver `appCheck.native.ts`), o app segue funcionando, mas registra a falha `appCheck.nativeToken`. Se o enforcement estiver ligado no projeto de teste, leituras e escritas falham neste APK.
- **Crashlytics** fica ativo em release (`!__DEV__`). Ele recebe só o escopo e o erro, sem valores de medição, pela regra de logs do CLAUDE.md §4.5.

## 3. Comandos

O disparo é manual: **Actions → EAS Build → Run workflow**. Escolha a branch `feat/eas-standalone` e, depois do merge, `staging`.

| Input | Valor | Efeito |
|---|---|---|
| `profile` | `standalone-teste` | pré-voo, build EAS, log completo e inspeção do APK |
| `profile` | `development` | igual a antes (Dev Client, `--no-wait`) |
| `build_id` | UUID de um build existente | só acompanha e traz o log, **sem gastar cota** |
| `preflight` | desmarcado | pula o pré-voo (só se ele já passou no mesmo commit) |

Equivalente local, com o eas-cli logado:

```bash
eas build --platform android --profile standalone-teste
```

Pré-requisito: o secret **`EXPO_TOKEN`** em *Settings → Secrets and variables → Actions*, criado em expo.dev → *Account settings → Access tokens*. Sem ele, o passo "Conferir o secret EXPO_TOKEN" falha com mensagem explícita. O log da falha de agosto já expirou. Com o token presente, a 1ª tentativa desta branch falhou igual, em 1 s no `env:pull`, por causa do `requireEnv` (§1.5). A ausência do token, portanto, não era a única causa possível.

## 4. No celular (o que o autor faz)

1. Abra a **página do build**: a URL está no fim do log do job e no resumo da execução. Toque em **Install** ou baixe o `.apk`.
2. Instale **por cima** do BP Tracker atual. O pacote é o mesmo (`com.ramonmenz.bptracker`) e os perfis usam a mesma keystore da EAS, então a atualização mantém os dados locais. Se o Android disser "pacote em conflito" ou "app não instalado", a assinatura é diferente. Nesse caso, é preciso desinstalar antes, e escritas offline ainda não sincronizadas se perdem.
3. O APK abre **sem Metro**. Se aparecer a tela do Dev Client pedindo servidor, você instalou o APK errado.
4. ⚠️ **A voz está LIGADA neste APK.** Use a **conta de TESTE** e frases sintéticas para a voz, conforme o roteiro de [voz-android-produto.md](voz-android-produto.md) a partir do passo 3. Os passos com Metro não se aplicam. A leitura confirmada grava `source: 'voice'` de verdade no Firestore dessa conta.
5. O roteiro do PDF Android está em [pdf-android.md §9](pdf-android.md). O passo 14, que inspeciona temporários com `run-as`, **não funciona** neste APK, porque o build release não é *debuggable*.
6. **Voltar ao Dev Client ou a uma versão sem a flag:** reinstale o APK do Dev Client (perfil `development`, pela página do build antigo no expo.dev ou por um build novo). Também dá para gerar um APK release sem voz com o perfil `preview`, que não liga a flag. Se o Android recusar a instalação por `versionCode` menor, desinstale antes.

## 5. Fontes

O acesso a `docs.expo.dev` estava bloqueado neste ambiente. A doc foi lida no código-fonte dela, em `expo/expo/docs` (branch `main`, 27/11/2026), e no código do eas-cli v27.11.0:
- `docs/pages/eas/json.mdx` e os schemas `docs/public/static/schemas/unversioned/eas-json-build-common-schema.js` e `eas-json-build-android-schema.js`: `extends`, `developmentClient` (padrão `false`), `distribution`, `environment` (`development`, `preview` ou `production`), `env` (só valores que poderiam ir para o git) e `buildType` (`apk` → `:app:assembleRelease`).
- `docs/pages/build-reference/apk.mdx`: perfil de APK e instalação pelo link do build.
- `docs/pages/eas/environment-variables/usage.mdx` e `faq.mdx`: `environment` no perfil, a escolha automática (`development` só com `developmentClient: true`), o eas-cli sem leitura de `.env`, as variáveis "secret" fora do `env:pull` e as variáveis de arquivo.
- `docs/pages/eas/cli.mdx` e `packages/eas-cli/README.md`: Node 20 obsoleto, `eas build --[no-]wait --json`, `eas build:view --json` e `eas env:pull --path`.
- Código do eas-cli v27.11.0:
  - `src/commands/env/pull.ts`: secret vira comentário e o arquivo vai para `.eas/.env`;
  - `src/build/evaluateConfigWithEnvVarsAsync.ts`: `{ ...serverEnvVars, ...buildProfile.env }`, com o perfil vencendo, e o log só com nomes;
  - `src/build/build.ts` (`waitForBuildEndAsync`): espera sem log;
  - `src/graphql/types/Build.ts`: `logFiles` e `artifacts.applicationArchiveUrl`;
  - `src/build/utils/url.ts`: URL da página do build.

## Registro para o relatório final

- **Decisão.** O perfil `standalone-teste` gera um APK release com JS embutido e voz Android ligada só nele, pelo ambiente `development` da EAS. O workflow tem input de perfil, pré-voo nativo gratuito, espera do build, log completo no GitHub, inspeção do APK e URL da página do build. Os perfis `development`, `preview` e `production` não mudaram.
- **Evidência no host.** O `@expo/eas-json` resolve os quatro perfis como esperado. O `expo export -p android` com a flag ligada e config fictícia passou, com a voz presente no bundle. O `expo prebuild` com config fictícia passou. Lint passou nos scripts novos. Typecheck passou.
- **Builds na EAS.** Gastei **1 de 3**.
  - O build `257aeb67-4c74-477c-b905-e9c75b63af90` terminou com **FINISHED** em cerca de 23 min: [página do build](https://expo.dev/accounts/ramoncode/projects/bp-tracker/builds/257aeb67-4c74-477c-b905-e9c75b63af90).
  - APK de 109 MB, com o JS embutido (`assets/index.android.bundle`), a voz no bundle, o módulo `aferivoice` compilado nos dex e sem dev launcher.
  - Permissões `RECORD_AUDIO` e `POST_NOTIFICATIONS` declaradas, `CAMERA` ausente. Debug token ausente do ambiente.
  - O Kotlin do `aferi-local-voice` compilou no pré-voo e no builder da EAS.
- **Erros corrigidos.**
  - O `eas env:pull` falhava em 1 s porque o eas-cli avalia o `app.config.ts` com `EXPO_NO_DOTENV=1`, e o `requireEnv` exige variáveis. Corrigido com `ci-placeholder` (§1.5).
  - A URL do artefato aparecia no cabeçalho `env:` de um passo. Agora ela passa por arquivo.
- **Pendências.**
  - Instalar e usar no aparelho, com voz (conta de teste), PDF e login Google. **Nada validado em aparelho.**
  - Conferir o App Check (Play Integrity) no APK fora da Play Store.
  - O job `development` continua falhando no `env:pull` até receber o mesmo bloco `env` com `ci-placeholder`. Ele foi mantido como estava a pedido.
  - O log da execução 46080650099 contém a URL do artefato. O autor pode apagar esse log em Actions, se quiser.
  - O commit `c142321` usa o tipo `ci(build)`, fora da tabela do CLAUDE.md. Corrigir no squash: a reescrita com force-push foi bloqueada pela política do ambiente.

## 6. Resultado das tentativas

*(atualizado a cada execução; cota EAS usada até aqui: 1 build)*

| # | Execução do GitHub | Pré-voo nativo | Build EAS | Causa e correção |
|---|---|---|---|---|
| 1 | [46079186932](https://github.com/RamonMenz/bp-tracker/actions/runs/46079186932) | ✅ passou: export com voz, prebuild e `:app:compileReleaseKotlin` em cerca de 5 min | **não criado** (0 de cota) | `eas env:pull` falhou em 1 s: `expo config --json exited with non-zero code: 1` (`requireEnv` sem variáveis no runner). Correção: `ci-placeholder` no job (§1.5), reproduzido no host. |
| 2 | [46080650099](https://github.com/RamonMenz/bp-tracker/actions/runs/46080650099) | pulado (já passou na 1ª, mesmo nativo) | **build 1/3: FINISHED** em cerca de 23 min, [página do build](https://expo.dev/accounts/ramoncode/projects/bp-tracker/builds/257aeb67-4c74-477c-b905-e9c75b63af90) | APK de 109 MB. Inspeção: `assets/index.android.bundle` presente, voz no bundle (1), `expo/modules/aferivoice` nos dex (24), dev launcher ausente (0), `RECORD_AUDIO` e `POST_NOTIFICATIONS` declaradas, `CAMERA` ausente. Debug token não legível no `env:pull`. Falha minha: a URL do artefato apareceu no cabeçalho `env:` do passo de inspeção. Corrigido. |
| 3 | [46083732616](https://github.com/RamonMenz/bp-tracker/actions/runs/46083732616) | pulado | **sem cota**: `build_id` do build 1, só relatório e reinspeção | Confirmado: a URL do artefato não aparece mais no log. Os nomes das variáveis estão na §2. O mesmo resultado de inspeção do APK. |
