# APK standalone de teste pela EAS (perfil `standalone-teste`)

**Branch:** `feat/eas-standalone`, a partir de `origin/staging` em `f8cfdee`.
**Objetivo:** um APK que **embute o JavaScript** (não precisa de Metro nem de PC) com os módulos nativos atuais de staging (`expo-print`, `aferi-local-voice`), gerado pela EAS e disparado pelo GitHub Actions, com o log completo do build visível no GitHub.
**Estado:** ver [Registro para o relatório final](#registro-para-o-relatório-final). **Nada aqui foi validado em aparelho.**

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
6. **Segurança do log.**
   - `EXPO_TOKEN` vem só de `secrets.EXPO_TOKEN` e entra só nos passos que falam com a EAS, nunca no `npm ci`.
   - `tools/eas/env-names.cjs` emite `::add-mask::` para cada valor com 6 ou mais caracteres e imprime só nomes. Nada usa `cat` ou `printenv` no arquivo.
   - A URL do APK passa entre passos por `GITHUB_OUTPUT` e não é impressa.
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

Pré-requisito: o secret **`EXPO_TOKEN`** em *Settings → Secrets and variables → Actions*, criado em expo.dev → *Account settings → Access tokens*. Sem ele, o passo "Conferir o secret EXPO_TOKEN" falha com mensagem explícita. Essa ausência é a causa provável da falha de agosto em 1 s no `eas env:pull`, mas o log daquela execução já expirou e não pôde ser lido.

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
- **Builds na EAS.** *(preenchido na seção 6)*
- **Pendências.** Instalar e usar no aparelho, com voz (conta de teste), PDF e login. Conferir o App Check no APK fora da Play Store.

## 6. Resultado das tentativas

*(atualizado a cada execução)*
