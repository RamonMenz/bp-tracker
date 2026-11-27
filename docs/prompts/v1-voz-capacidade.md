# Prompt V1 — Veredito de capacidade de voz: endurecimento, ferramental e adaptador Web (Codex)

Registro do prompt de execução de 26/11/2026 (parte do plano em
[reavaliação](../reavaliacao-2026-11-26.md)). Destinatário: Codex, com este repositório, a partir
de `staging`.

**Configuração recomendada** (não verifiquei as opções atuais do Codex; ajuste ao seu plano):
o modelo de código mais capaz disponível, com esforço de raciocínio **alto** (não o máximo);
sandbox com escrita no workspace e aprovação padrão (não acesso irrestrito); rede só se o
ambiente permitir `npm ci`. O Codex historicamente não alcançou Maven/Gradle nem o emulador do
Firestore nos registros do projeto; este prompt não depende disso.

---

```
Contexto: projeto Aferi (repo RamonMenz/bp-tracker), app Expo SDK 57 / React Native 0.86 (Android
+ Web) para registro de pressão arterial. Esta é a etapa V1 do plano de 26/11/2026: obter um
VEREDITO DE CAPACIDADE do registro por voz, sem tocar no produto. Leia CLAUDE.md,
constitution.md e specs/spec-voz.md (§2, §3.1-3.3, §5, §7) antes de qualquer coisa.

Guardrails inegociáveis: áudio e transcrição só em memória (sem arquivo, cache, log,
telemetria); reconhecimento explicitamente LOCAL, sem fallback remoto de nenhum tipo; nenhum
valor reconhecido é salvo sem confirmação explícita (o cliente de avaliação não salva nada);
indisponibilidade (sem serviço, sem pt-BR, sem permissão) é RESULTADO A REGISTRAR COMO LIMITE,
nunca motivo para contornar; o registro manual não depende de microfone nem de reconhecedor.
Não faça operações em produção. Não use Firebase (os clientes de avaliação não o importam).

Base: origin/staging (HEAD esperado 2afb60d ou mais novo). Crie a branch feat/voz-capacidade
(git switch -c feat/voz-capacidade origin/staging, ou git worktree add ../bp-tracker-voz -b
feat/voz-capacidade origin/staging). Antes de editar, escreva em até 15 linhas o plano e os
arquivos que tocará; depois prossiga sem esperar resposta.

Ambiente do autor (quem compila e roda no aparelho): Windows; Node 24.22.0, npm 11.19.1, JVM
17.0.21, Gradle wrapper 9.3.1, Android SDK em %LOCALAPPDATA%\Android\Sdk com build-tools 36.0.0;
Samsung SM-S731B, Android 17 / API 37. Você provavelmente NÃO consegue compilar Kotlin nem gerar
APK no seu ambiente: não tente contornar bloqueios de rede; valide por revisão estática, Jest,
Node e os checks PowerShell com simulação (o CI roda pwsh nesses checks).

Leia antes: docs/task-12-voz-android.md (inteiro), docs/task-05* e docs/pocs-fotografia-voz.md
(§A3), native-modules/aferi-local-voice/**, src/services/recognition/voice-*.ts,
voice-android.native.ts, web-voice.web.ts, src/features/assisted-entry/useAndroidVoiceReview.ts
e useWebVoiceReview.web.ts, src/screens/AndroidVoiceCaptureScreen.tsx e
WebVoiceCaptureScreen.web.tsx, demos/android-voice/**, demos/web-voice/**,
pocs/src/services/recognition/voice.web.ts (referência de install), e para o padrão a replicar:
demos/android-capture/app.json e demos/android-capture/plugins/**, tools/task07/*.ps1|*.psm1|*.cjs,
tools/task09/*, .github/workflows/ci.yml, docs/task-07-backup-pos-merge.md.

TAREFAS (nesta ordem; um commit atômico por item)

F0 — Revisão estática (sem aparelho). Confronte LocalSpeech.kt, AferiVoiceModule.kt e os
adaptadores JS com a documentação oficial do Android SpeechRecognizer/RecognitionSupport
(isOnDeviceRecognitionAvailable e createOnDeviceSpeechRecognizer: API 31; checkRecognitionSupport,
installedOnDeviceLanguages e triggerModelDownload: API 33; variante com listener: API 34; códigos
de erro, inclusive ERROR_CANNOT_CHECK_SUPPORT). Liste achados classificados em: risco de
compilação, risco de comportamento, observação. Corrija SOMENTE defeitos claros de
compilação/contrato, com teste quando couber. NÃO implemente download automático de modelo, NÃO
mude o comportamento de privacidade e NÃO redesenhe a máquina de estados.

F1 — Paridade de endurecimento do cliente de voz. O cliente demos/android-voice NÃO recebeu o
que o de fotografia recebeu nos PRs #75/#76. Replique, para o pacote com.ramonmenz.aferivoicetest:
android.allowBackup=false, plugin de backup/extração de dados com recursos próprios (nomes
próprios, não reutilize os de captura) e plugin que força EX_DEV_CLIENT_NETWORK_INSPECTOR=false,
cada plugin falhando se o pacote/config divergir (como os de captura). Mantenha RECORD_AUDIO e os
blockedPermissions já existentes (CAMERA e mídia bloqueadas). Crie checks Node equivalentes aos
de tools/task07/AferiBackupRules.check.cjs e AferiNetworkInspector.check.cjs para o cliente de
voz (preferindo parametrizar sem alterar o comportamento dos checks de fotografia, que NÃO podem
regredir) e ligue-os ao .github/workflows/ci.yml.

F2 — Ferramental Windows de build e identificação (somente leitura e build local; nunca instala,
abre o app, assina ou consulta ADB de escrita). Em tools/task12/, derive do padrão de
tools/task07/Build-AferiInspectorEvaluation.ps1: worktree do commit informado (validar que está
limpo), npm ci --ignore-scripts, os checks de F1, prebuild em demos\android-voice, asserção do
gradle.properties, gradlew :app:assembleDebug (arm64-v8a, inspector=false), hash SHA-256 do APK,
metadados do manifesto via aapt2 (esperado: pacote com.ramonmenz.aferivoicetest; RECORD_AUDIO
presente; CAMERA e permissões de mídia ausentes; allowBackup=false com as referências de regras),
e saída JSON sanitizada (sem serial, conta, caminhos de usuário). Acrescente um verificador de
identidade pós-instalação (somente leitura: pacote instalado, hash do base.apk igual ao do APK
construído, RECORD_AUDIO não concedida antes da primeira ação) e a verificação de saúde do Metro
da voz (IPv4, adb reverse), reaproveitando as lições registradas em
docs/task-07-backup-pos-merge.md (bind IPv4/--localhost, reverse, ADB após reboot). Use a porta
8099 do cliente de voz. Cada script novo ganha um .check.ps1 com ADB/aapt2/HTTP simulados e
entra no CI. Os scripts existentes de fotografia não podem mudar de comportamento.

F3 — Documentação do TASK-12. Atualize docs/task-12-voz-android.md: substitua as instruções de
execução defasadas (expo run:android --port 8099) pelo fluxo Windows de F2, com comandos prontos
para copiar; acrescente o modelo de devolução sanitizado dos casos A-D e E-L (código/mensagem
fixa, versão Android/API, modelo genérico, hash do APK; sem áudio, transcrição, serial, conta ou
logcat completo); a taxonomia de resultados (local-unavailable, language-unverified,
model-missing, ready...) com o significado de cada um e a ressalva de que cada um é um LIMITE
registrado, não uma falha de implementação; e um bloco final "Registro para o relatório final"
(fatos, decisões, limitações, comandos de reprodução). Não edite tasks.md.

F4 — Adaptador Web: ação explícita de instalar o pacote pt-BR local. Hoje o adaptador integrado
(src/services/recognition/web-voice.web.ts) devolve model-missing sem caminho para instalar; só a
PoC (pocs/src/services/recognition/voice.web.ts) chama SpeechRecognition.install. Implemente, no
adaptador e em demos/web-voice, uma ação INICIADA PELO USUÁRIO que chama
install({langs:['pt-BR'], processLocally:true}) somente quando available() retornou
'downloadable'; estados (instalando, concluído, falhou) com mensagens fixas em pt-BR (sem erro
cru); timeout; cancelamento; após concluir, reverificar available() (só 'available' habilita o
início). NUNCA instalar automaticamente, nunca iniciar reconhecimento sem 'available' +
processLocally, nunca fallback remoto (preserve a garantia de zero start). Ajuste a mensagem
"nenhum download será iniciado" para refletir que o download só ocorre por ação explícita.
Testes com construtor falso (available/install/start) cobrindo: downloadable→install→available;
install falha; cancelar durante instalação; toques repetidos; resultado tardio. Registre em
docs/task-13-voz-web.md (novo, curto) o comportamento, o modelo de devolução do teste no Chrome
do autor e o bloco "Registro para o relatório final".

FORA DE ESCOPO (não faça): app/, src/features/readings, firestore.rules, qualquer coisa de
fotografia (módulo, demos, tools/task07|task09 além da parametrização estritamente sem
regressão), ROI591, troca de motor, persistência, Firebase, integração ao produto, tasks.md,
refatorações não relacionadas, novas dependências npm/Gradle (justifique antes se achar
indispensável).

VERIFICAÇÃO: npm run lint && npm run typecheck && npm test; node
node_modules/typescript/bin/tsc --noEmit -p demos/android-voice/tsconfig.json (e o de
demos/web-voice, se existir); os checks Node/pwsh novos e os existentes de fotografia; export Web
do cliente de voz se possível. Registre o que NÃO pôde ser verificado (compilação Kotlin, APK,
aparelho, STT real) como pendente, sem declarar sucesso.

ENTREGA: commits atômicos (Conventional Commits, escopo voice/ui/chore conforme CLAUDE.md) na
branch feat/voz-capacidade. NÃO faça push, PR nem merge sem autorização explícita do autor.
Relatório final no chat: achados de F0, o que mudou em F1-F4, comandos exatos que o autor deve
rodar no Windows (um bloco por comando), o que o autor deve devolver, o que ficou pendente e
por quê.

LIMITE: se um bloqueio persistir após duas tentativas de correção, pare e reporte o que foi
tentado, sem contornar guardrails, sem fallback remoto e sem trocar de abordagem.
```
