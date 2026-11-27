# TASK-12 — STT Android local conectado à revisão, em avaliação

Registro inicial de 27/10/2026 na branch `feature/task-12-android-local-voice`,
base staging `7d72cb3`. Naquele momento, a integração local tinha testes por
portas isoladas. O ensaio físico posterior está na seção de resultados da V1.
**TASK-12 permanece aberta** quanto à privacidade interna do serviço do SO.

## Implementação e alcance

Base reaproveitada da TASK-05: `LocalSpeech.kt`, módulo Expo e fluxo Android em
`feature/pocs-fotografia-voz`, `7fbe137`. PoC original preservada. O módulo novo
`native-modules/aferi-local-voice` separa voz de câmera e não acrescenta bibliotecas
npm/Gradle de STT: usa SpeechRecognizer/AudioManager do sistema e Expo já existente.
Sem serviço contratado, build pago ou alteração dos locks/dependências da raiz.

Fluxo por ação explícita:

1. Verificar `isOnDeviceRecognitionAvailable` e API necessária, sem abrir captura.
   API <31 fica `local-unavailable`; API 31/32 fica `language-unverified` porque não
   oferece a consulta usada para comprovar pt-BR instalado.
2. Pedir RECORD_AUDIO no contexto do botão. Não repetir automaticamente.
3. Criar **somente `createOnDeviceSpeechRecognizer`**. Verificar
   `checkRecognitionSupport` no main executor e aceitar **pt-BR em
   installedOnDeviceLanguages**. Não aceita pt genérico, pt-PT, idioma apenas
   online/suportado/pendente. Verificação refeita em toda tentativa; não há flag de
   prontidão persistida. A mesma instância verificada inicia a sessão logo depois.
4. Solicitar foco de áudio transitório exclusivo e reconhecer uma única fala em
   pt-BR, sem parciais ou detecção automática de idioma. Não usa factory genérica,
   `EXTRA_PREFER_OFFLINE`, gravador paralelo, URI, WAV temporário ou fallback remoto.
5. Na demo, somente `onResults` entrega ao JS as hipóteses finais em pt-BR e o
   instante civil do início de `startListening`. São até cinco textos distintos, com até
   2.000 caracteres cada após `trim`. Parciais, buffer, volume/RMS e eventos
   genéricos são ignorados, sem transporte de áudio ao JS.
6. Invalidar tentativa, cancelar/destruir reconhecedor e abandonar foco antes de
   resolver o resultado final. O JS interpreta cada hipótese com o parser da
   TASK-14 e aguarda a confirmação de fechamento antes de abrir a revisão com o
   conjunto concordante ou informar `ambiguous-result` se houver divergência.

`android-voice-session.ts` coordena identidade, uma tentativa global, eventos por
ID, permissão tardia não abortável, deadlines e fechamento aguardado. Toques
repetidos não abrem duas sessões; terminar fala chama `stopListening` uma vez e
aguarda final, sem confirmar. Cancelar, perder foco, erro de áudio/cliente,
background, Activity destruída e desmontagem invalidam callbacks e liberam recursos.
Retornar ao foreground não reinicia. Native possui exclusão global adicional.

Cancel/destroy/abandon são tentados independentemente. Se algum falhar, não afirma
liberação nem permite reutilização do lease nativo; reiniciar o processo de
avaliação é necessário. JS também bloqueia se fechamento falhar/exceder prazo.
Permissão pendente mantém a exclusão até drenar, mesmo após cancelar; concedê-la
tardiamente não abre reconhecedor. Callback com ID antigo não fecha sessão nova.

Limites **experimentais**, não metas aprovadas da TASK-06: disponibilidade/probe JS
12 s, suporte nativo 10 s, permissão 30 s, instância preparada sem início 5 s,
fala nativa 30 s, espera de final após fim/stop 10 s, espera JS total start→final
35 s, fechamento e drenagem de permissão 10 s cada. Não foram medidos p50/p95.
`stopListening` solicita encerrar captura, mas indicador físico/tempo real de
liberação dependem do serviço e devem ser verificados no aparelho.

## Revisão, indisponibilidade e manual

`useAndroidVoiceReview` carrega o binding só no botão. `useVoiceReview` ganhou modo
fixo **preview**, que aceita resultado final de reconhecimento mas confirma apenas
em memória, sem porta clínica. Mudança de props não o promove a reconhecimento
com persistência. Simulação anterior e preparação clínica TASK-11/15 preservadas.

`AndroidVoiceCaptureScreen` mostra estados textuais, erros fixos, começar/terminar,
cancelar, falar novamente e **Ir para registro manual**. Sem módulo/serviço/idioma
comprovado, não inicia microfone e oferece manual. Nenhum erro bruto, transcrição,
hipótese, áudio ou confiança entra em log, estado React, nota ou payload clínico.
As hipóteses finais só vivem transitoriamente na fronteira e no parser.
Não se promete sobrescrita física de RAM ou não retenção interna pelo fabricante.

O manual do cliente isolado reutiliza `ReadingForm`, componentes e validações
existentes, com controller local sem importar `useReadingForm` clínico. Campos
começam vazios, sem reaproveitar transcrição/candidatos; confirmação manual também
é **somente em memória**, com identificação de dados sintéticos. Continua acessível
mesmo com voz indisponível/bloqueada. Não substitui nem altera o manual do produto.
Ao sair da voz, o manual permanece acessível enquanto o fechamento é aguardado;
mostra pendência/falha de liberação e só habilita retorno à voz após ACK positivo.
Desmontar a tela de captura não oculta uma falha de cleanup posterior.

Silêncio, fim automático, texto “salvar”, resultado final e alta confiança nunca
confirmam. Somente botão explícito demonstra confirmação em memória. Parser pode
errar se o STT alucinar uma medição estruturada no ruído; isso precisa ser avaliado
no motor, não é resolvido pela validação de faixa.

## Isolamento e o que está habilitado

`demos/android-voice` é um Dev Client separado, pacote
**`com.ramonmenz.aferivoicetest`**, scheme `aferivoicetest`. Não requer conta,
Firebase, Google Sign-In, App Check, Crashlytics, notificações ou writer clínico.
Permite avaliar localidade/idioma e ditar somente casos sintéticos. **Não é
homologação do serviço do fabricante nem caminho clínico habilitado no produto.**

Autolinking do cliente de voz exclui fotografia e módulos Firebase/Google Sign-In.
Cliente de fotografia passou a excluir explicitamente o novo módulo de voz;
RECORD_AUDIO continua bloqueado naquele cliente. Produto principal não autolinka
nenhum desses módulos locais; nenhuma rota do produto foi habilitada. A configuração
gerada de voz solicita RECORD_AUDIO e remove câmera/permissões de mídia/storage;
Dev Client mantém INTERNET para Metro, não para enviar áudio. Serviço do SO usa
outro processo/permissões, o que exige inspeção separada.

O .d.ts já existente de Firebase Auth foi incluído no tsconfig **da demonstração**
porque o tipo de `ReadingForm` referencia tipos do formulário clínico; isso é só
resolução de tipos, sem importar o hook/SDK no runtime. Testes proíbem esses imports.
Não há mudança de schema, rules, índices, origem ou persistência nesta tarefa.

## Verificações do registro inicial

| Verificação | Resultado e limite |
|---|---|
| Jest completo | **642 testes / 60 suítes aprovados**, 38 novos de sessão/hook/UI/preview. Portas nativas simuladas, não reconhecimento real |
| Guardrails isolados | Disponibilidade/idioma antes de captura, recusa, finais/parciais, mensagens seguras, silêncio/comandos já cobertos pelo parser/revisão, duplicidade, finish, cancelamento, permissão tardia, IDs antigos, interrupção/background/desmontagem e cleanup falho/timeout |
| Revisão/manual | Final sintético pela porta → 120/80/72 no parser/revisão, correção/confirmar só em memória; fallback manual operável sem permissão/STT ou writer; preview não promovido a clínico |
| Lint/TypeScript | Raiz e cliente de voz aprovados; diff sem erros de whitespace |
| Prebuild | Aprovado, sem instalação. Gera projeto/configuração, não compila Kotlin |
| Autolinking | AferiVoiceModule só no cliente de voz; cliente foto só AferiPhotoModule; produto sem ambos. Firebase/Google Sign-In ausentes do cliente de voz |
| Export Android/Hermes | Aprovado, aproximadamente 3,3 MB de JS/HBC; não é APK nem tamanho/memória do modelo local do SO |
| Kotlin/APK | **Não compilados**: bootstrap Gradle 9.3.1 tentou baixar distribuição mesmo com `--offline`, falhou com SocketException/Operation not permitted. SDK/ADB/aparelho ausentes |
| Microfone/STT/rede/disco do aparelho | **Não executados/comprovados**; código/porta simulada/prebuild/bundle não comprovam ausência de arquivos ou tráfego do serviço do fabricante |

Nenhuma fala/áudio real, download de modelo, Firebase, publicação de rules,
commit, push, deploy ou contratação. Custo novo contratado R$ 0; despesas acumuladas,
horas reais e saldo global do teto R$ 300 não informados.

## Windows — gerar e identificar o APK local

Comece na raiz do repositório com o commit da revisão a avaliar selecionado.
A V1 usou a branch `feat/voz-capacidade`. Para o reteste de 27/11, selecione um
commit que contenha a correção das hipóteses. O ambiente de referência usa Node
24.22.0, npm 11.19.1, JVM 17.0.21, wrapper Gradle 9.3.1 e SDK em
`%LOCALAPPDATA%\Android\Sdk` com Build-Tools 36.0.0. O destino
`C:\dev\aferi-voz-build` deve estar livre. Preserve
worktrees e APKs anteriores. Os comandos abaixo usam `powershell.exe`,
validado na rodada Windows do autor, onde `pwsh` não estava disponível.
Os checks do CI usam PowerShell 7.

```powershell
$aferiBuild = 'C:\dev\aferi-voz-build'
$aferiCommit = git rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'voice-source-unavailable' }
$aferiBuildJson = powershell.exe -NoLogo -NoProfile -File .\tools\task12\Build-AferiVoiceEvaluation.ps1 -Commit $aferiCommit -BuildPath $aferiBuild
if ($LASTEXITCODE -ne 0 -or -not $aferiBuildJson) { throw 'voice-build-failed' }
$aferiBuildJson
```

O build cria uma worktree destacada, confere commit e árvore limpa, instala pelo
lock com `npm ci --ignore-scripts`, executa os checks da demo e roda o prebuild
sem instalação. Compila `assembleDebug` para arm64-v8a com inspector desativado.
A assinatura de debug é a padrão do Gradle. O script não invoca um assinador
separado nem acessa ADB. O JSON só sai após conferir SHA-256, pacote, permissões,
`allowBackup=false` e referências e conteúdo dos XML empacotados. Se uma etapa
falhar, devolva o código fixo que o script mostrou e, se disponível, a mensagem
curta sanitizada do compilador.

### Instalação explícita pelo autor

Se o JSON confirmou o build, conecte apenas o aparelho de avaliação, autorize
ADB via USB e mantenha a demo fechada até concluir a identificação. Execute no
mesmo terminal. A instalação é separada e não concede permissões. Se já houver
uma instalação, rode primeiro a consulta de identidade abaixo. Prossiga com ela
se o hash coincide e o microfone ainda não foi concedido. Em caso de
divergência, preserve a instalação e registre o impedimento.

```powershell
$aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$aferiApk = Join-Path $aferiBuild 'demos\android-voice\android\app\build\outputs\apk\debug\app-debug.apk'
$aferiSha = ($aferiBuildJson | ConvertFrom-Json).Sha256Apk
if ((Get-FileHash -LiteralPath $aferiApk -Algorithm SHA256).Hash -ine $aferiSha) { throw 'voice-apk-changed' }
& $aferiAdb -d install -R $aferiApk
if ($LASTEXITCODE -ne 0) { throw 'voice-install-failed' }
```

### Identidade instalada, antes da primeira ação no app

```powershell
$aferiSha = ($aferiBuildJson | ConvertFrom-Json).Sha256Apk
powershell.exe -NoLogo -NoProfile -File .\tools\task12\Test-AferiVoiceInstalled.ps1 -ExpectedSha256 $aferiSha
```

Esperado: `Pacote=com.ramonmenz.aferivoicetest`, `CoincideComBuild=true` e
`RecordAudioConcedida=false`. `EstadoRecordAudio` distingue negativa explícita
(`negada`) de instalação sem entrada de permissão em runtime
(`sem-entrada-runtime`). O verificador lê o estado do usuário Android ativo.
Permissão já concedida, hash diferente ou consulta inconclusiva são impedimentos
a registrar antes de abrir a demo.

### Metro da demo, na porta 8099

No **terminal A**, execute:

```powershell
Set-Location -LiteralPath 'C:\dev\aferi-voz-build\demos\android-voice'
$env:EXPO_NO_TELEMETRY = '1'
node --dns-result-order=ipv4first ..\..\node_modules\expo\bin\cli start --dev-client --localhost --port 8099
```

Aguarde o Metro iniciar. Preserve a porta 8099 e deixe o terminal aberto. No
**terminal B**, a partir da raiz da branch de trabalho, consulte:

```powershell
$aferiBuild = 'C:\dev\aferi-voz-build'
powershell.exe -NoLogo -NoProfile -File .\tools\task12\Test-AferiVoiceMetro.ps1 -BuildPath $aferiBuild
```

Se `EstadoAdb=device`, `Http.MetroPronto=true` e `Reverse=missing`, o autor
cria o mapeamento separadamente:

```powershell
$aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $aferiAdb -d reverse --no-rebind tcp:8099 tcp:8099
if ($LASTEXITCODE -ne 0) { throw 'voice-reverse-failed' }
```

```powershell
powershell.exe -NoLogo -NoProfile -File .\tools\task12\Test-AferiVoiceMetro.ps1 -BuildPath $aferiBuild
```

Espere `Pronto=true`: IPv4 HTTP 200, raiz esperada e `Reverse=ready`.
Após reiniciar PC ou telefone, confirme autorização USB, Metro e reverse de
novo. Registre conflito, erro ADB ou IPv4 indisponível como impedimento.
Com identidade e Metro confirmados, abra **Aferi — voz local em avaliação**
no aparelho. Comece por A–D e execute E–L onde a capacidade permitir.

## Roteiro específico de validação física pendente

Registrar modelo genérico, versão Android/API, fabricante/versão do serviço e
idiomas instalados, sem serial, conta, UID pessoal ou dumps de áudio/transcrição.
Usar somente fala sintética do próprio autor. Não coletar terceiros sem o
procedimento da spec/TASK-17. Identificar cada resultado como teste de aparelho.

| Caso | Ação | Resultado que precisa ser verificado |
|---|---|---|
| A — build/isolamento | Compilar/instalar somente com.ramonmenz.aferivoicetest; abrir manual | Sem Firebase/configuração clínica; sem microfone, download de modelo ou reconhecimento no launch/manual |
| B — capacidade | API <31, API 31/32 ou aparelho sem serviço local | Indisponibilidade explícita, sem factory genérica/escuta ou pedido repetido; manual acessível |
| C — idioma | pt-BR ausente, só online/suportado/pendente, ou só pt-PT | Não inicia captura. Registrar o estado encontrado. Se o SO já oferecer configuração de pt-BR local, anotar qualquer mudança feita pelo autor e tratá-la como rodada separada |
| D — permissão | Negar, conceder, revogar e cancelar durante diálogo | Erro seguro e manual. Concessão tardia nunca abre microfone; não repetir solicitação automaticamente. Background do diálogo pode exigir nova tentativa |
| E — positivos | Duas frases básicas acima; decimal “treze vírgula cinco por oito vírgula cinco” | Final real chega à revisão; 120/80 ou 135/85, pulso só identificado; data/hora do início. Registrar separadamente falha STT e falha parser, sem chamar o acerto de um caso de acurácia |
| F — negativos | Silêncio, ruído, “salvar”, escala mista, dois pares/autocorreção, pulso isolado | Sem confirmação automática; campos ausentes/incertos. Observar alucinações do STT em ruído; se aparecer medição estruturada inventada, registrar reprovação/limitação do motor |
| G — fim/final | Terminar antes/depois de falar, tocar terminar/iniciar repetidamente, final automático | Uma sessão, nenhum salvamento; indicador de microfone encerra. Final/erro/timeout encerra serviço e abandona foco antes da revisão; medir liberação real |
| H — cancelamento | Cancelar em checking, permissão, suporte, opening, listening, reconhecimento e revisão; tentar novamente | Sem resultado tardio ou segundo microfone. Cancel antigo não fecha sessão nova. Se limpeza falhar, manter bloqueio e manual, sem alegar liberação |
| I — ciclo/interrupção | Home, tela bloqueada, recents, rotação/Activity recriada, sair para manual, ligação e perda de foco por outro áudio | Background/destruição/perda de foco cancelam, encerram indicador/microfone e descartam revisão; retornar não recomeça. Rotação sem recriar Activity não deve iniciar sessão extra. Avaliar conflito entre foco exclusivo do cliente e foco do próprio serviço; se inviável, manter voz indisponível até correção validada |
| J — acessibilidade | TalkBack, leitura dos avisos, fonte ampliada e Bluetooth | Controles operáveis; avisos/TTS do app não viram fala clínica. Troca de rota ou interrupção não reabre microfone. Se reprovado, documentar alcance restrito |
| K — rede/armazenamento | Com modelo instalado, repetir com/sem rede e monitorar app **e processo do serviço do SO** em sucesso/falha/cancelamento/background | Sem envio/retenção de áudio/transcrição, arquivos temporários, logs clínicos ou relatório de falha. Modo avião sozinho e inspeção só do UID do app não comprovam privacidade do serviço |
| L — confirmação | Revisar, corrigir, cancelar, confirmar repetido; sair/reabrir | Somente estado em memória. Nenhum documento/fila Firestore e nenhuma transcrição na nota. App clínico legado continua manual sem depender desta instalação |

Inspeção de K deve usar ambiente/testes sintéticos controlados, metadados/contagens
e documentação auditável do fabricante; não exportar logcat/HAR/PCAP/heap que possa
conter mídia/dados de uso. Não é possível afirmar ausência de retenção em diretórios
privados do serviço sem acesso/evidência correspondente. Se essa comprovação não
for viável, **produto continua com voz indisponível**, mesmo que o teste de frase
funcione. Indicador de microfone apagado também não comprova não persistência.

## Resultado da V1 no Samsung

**Veredito de capacidade.** O Samsung Galaxy com Android 17/API 37 produziu
candidatos corretos em pt-BR, inclusive em modo avião com Wi-Fi e dados móveis
desligados. O Metro permaneceu disponível por USB na porta 8099. A repetição
teve resultados variáveis nas formas curtas e completas.

O autor compilou em Windows o commit local `66cc97c5159adca175a4c9122b52d3406290d949`,
criado pela aplicação do patch cumulativo sobre `3c5a078`. O build retornou
fonte limpa e SHA-256 do APK
`ddf7cb774473015108e6c98aec9dc747ca17db83ca026b5483cc42f1196693f9`.
O manifesto final conferiu pacote, permissão de microfone, ausência de
câmera/mídia e regras de backup. A configuração do build registrou inspector
desativado. A consulta do Metro retornou IPv4 HTTP 200, fonte esperada e reverse
ativo. O hash acima é do JSON de build do autor.

### Diagnóstico e correções da rodada

- **Transporte para Windows.** O `fetch` de `staging` trouxe a base do Git.
  Os commits locais foram transferidos por `git bundle`. O autor salvou e
  extraiu o ZIP, verificou o bundle com `git bundle verify` e então importou a
  branch usando o caminho local do arquivo.
- **Gradle e árvore limpa.** A primeira saída sem JSON deixou um APK no disco.
  O Git confirmou o commit esperado e os arquivos rastreados intactos. Os 188
  arquivos não rastreados pertenciam ao `android/build/` do módulo de voz. A
  inspeção do APK existente passou depois de verificar esse escopo. A regra
  de Git agora ignora apenas `build/` nesse módulo. O build seguinte passou
  pela guarda de árvore limpa e retornou o JSON completo.
- **Tela cinza.** A `MainActivity` abriu e o menu Expo mostrou o runtime e o
  Metro local corretos. A abertura a frio não resolveu a tela em branco. O
  export Android no host reproduziu a ausência de `flex-1` no CSS gerado. A
  configuração Tailwind própria da demo restaurou os estilos. Reiniciar o
  Metro com `--clear` e recarregar o mesmo APK tornou a tela e o manual
  acessíveis no Samsung.
- **Permissão após o diálogo.** O autor observou cancelamentos na concessão e
  na nova tentativa. O módulo chamava a API de solicitação mesmo com
  `RECORD_AUDIO` concedida. A correção lê o estado concedido diretamente no
  Android. O APK recompilado chegou à escuta após ação explícita. A rodada
  não isolou a causa exata dos cancelamentos anteriores. O teste automatizado
  cobre cancelamento no diálogo e avanço apenas após um novo toque.
- **Identidade e conexão no reteste.** `voice-microphone-already-granted` é
  emitido após a validação do pacote e do hash. Esse estado é esperado num
  reteste de permissão já concedida. Para atualizar a demo, o autor verificou
  o APK anterior e inspecionou o novo antes da instalação. O Metro precisa usar
  a mesma worktree do novo build. Com `Reverse=missing`, o autor restaurou
  apenas o mapeamento 8099 e confirmou `Pronto=true` antes de abrir a demo.

| Caso | Resultado sanitizado |
|---|---|
| A | O autor abriu a interface após corrigir a configuração de estilos da demo e acessou o manual antes de conceder microfone. |
| B–C | A demo chegou à escuta após as verificações de serviço local e pt-BR instalado neste aparelho. Variantes sem serviço, com API inferior ou sem pt-BR não foram exercitadas. |
| D | A recusa do microfone manteve o manual acessível. Na primeira rodada, a concessão e um novo toque encerraram em cancelamento. Depois da correção que reutiliza a concessão existente, o autor chegou à escuta. |
| E | Pares sintéticos completos conferiram com e sem pulso. Também houve `ambiguous-result`, tentativas sem candidato e revisão com todos os campos vazios. A expressão coloquial com pulso conferiu em uma tentativa offline. O cenário decimal ficou sem verificação. |
| F | No silêncio, apareceu “Voz indisponível nesta tentativa”. Nenhum candidato foi exibido e o indicador de microfone apagou. O código específico do motor não foi identificado. |
| G | O fim automático produziu os candidatos esperados e o indicador apagou. A revisão foi cancelada. |
| H | Cancelar em escuta apagou o indicador e manteve a revisão fechada. |
| I | Pressionar Home durante a escuta apagou o indicador. Ao voltar, a escuta permaneceu encerrada e a revisão fechada. |
| J | Sem verificação. |
| K | Em modo avião, uma tentativa abriu revisão vazia e outra produziu os três candidatos esperados. O ensaio cobre capacidade offline nas condições descritas. Tráfego e retenção interna do serviço permanecem sem inspeção. |
| L | Após confirmar candidatos sintéticos, sair para o manual e retornar, a revisão e a confirmação anteriores haviam desaparecido. Evidência de comportamento visível da demo. |

## 27/11/2026 — Concordância das hipóteses finais

No reteste relatado pelo autor no Samsung, as duas formas curtas
sem pulso falharam em 10 de 10 tentativas. Predominou `ambiguous-result` e
algumas tentativas abriram revisão vazia. As mesmas formas com pulso acertaram
em 6 de 6 tentativas. A inspeção confirmou que duas strings distintas bastavam
para o Android recusar o resultado antes do parser, mesmo com `EXTRA_MAX_RESULTS`
igual a 1. A equivalência das hipóteses recebidas nessas tentativas segue por
verificar no aparelho.

Na demo, o Android agora solicita até cinco resultados e retorna somente as
hipóteses distintas de `onResults`. Remove espaços nas pontas e descarta
entradas em branco. Uma lista sem texto útil, mais de cinco textos distintos ou
qualquer texto com mais de 2.000 caracteres após `trim` produz `no-result`.
O JS interpreta cada hipótese com `interpretVoice` e exige igualdade de campos,
status, valores, bases de interpretação e motivos de incerteza. “12 por 8” e
“doze por oito” concordam. Um conjunto vazio e outro com candidatos geram
`ambiguous-result`. Se todos produzirem campos vazios, a revisão continua vazia
e exige correção antes de confirmar. A confirmação continua explícita e em memória
na demo. O modo `recognition` do produto mantém a entrada nativa de transcrição
única e o fluxo de confirmação existente.

Somente a demo mostra a faixa de hipóteses distintas (`1`, `2` ou
`3+`) e se houve concordância (`sim` ou `não`) na tentativa concluída. O painel
é limpo ao iniciar outra tentativa ou cancelar. O diagnóstico fica em memória e
contém somente esses dois dados. A mudança aumenta a quantidade de resultados
solicitada ao motor. O reteste mede o comportamento dessa configuração no aparelho.
A compilação Kotlin e a execução em aparelho desta revisão ficaram **não
verificadas** no ambiente sem SDK Android e sem Samsung. Segue pendente a inspeção
de armazenamento e tráfego do processo do reconhecedor do fabricante.

### Reteste no Samsung

Gere e instale um novo APK do cliente de avaliação e
use o Metro da mesma revisão, conforme os blocos Windows acima. Repita 10
tentativas, alternando “cento e vinte por oitenta” e “sistólica cento e vinte,
diastólica oitenta”. Repita 6 tentativas com as mesmas formas seguidas de
“pulso setenta e dois”. Por grupo, registre quantas revisões conferiram, quantas
vieram vazias e os códigos fixos de recusa. Anote a faixa e a concordância quando
o painel aparecer. Repita em modo avião com Metro via USB, exercite toques
repetidos em iniciar e terminar e cancele durante a escuta e o reconhecimento.
Observe o indicador de microfone e confirme que resultado tardio não reabre a
revisão. Devolva as contagens e o quadro sanitizado abaixo, sem áudio,
transcrições, valores reconhecidos ou posição de hipótese.

## Taxonomia do veredito

Cada indisponibilidade confirmada representa um **limite de capacidade no
ambiente observado**. Registre a fase e se a tentativa abriu o microfone.
Uma divergência do fluxo esperado, como iniciar sem `ready` da preparação,
é um resultado distinto.

| Código ou estado | Significado |
|---|---|
| `unsupported` | Binding Android ausente no cliente executado. |
| `local-unavailable` | API anterior à 31, serviço local não identificado ou indisponível na criação/abertura. Manual disponível. |
| `language-unverified` | Sem consulta de idioma (API 31–32) ou a consulta falhou. Inclui `ERROR_CANNOT_CHECK_SUPPORT`. Não autoriza escuta. |
| `model-missing` | A consulta não listou pt-BR instalado, ou o serviço recusou o idioma em captura. Registre a fase. pt genérico, pt-PT, suporte online e download pendente não contam como pronto. |
| `permission-denied` | O microfone não foi concedido ou ficou indisponível por permissão. Nova tentativa depende de ação do usuário. |
| `ready` | No probe inicial, API/serviço permitem prosseguir. Na preparação, o reconhecedor local verificou pt-BR instalado. Só este segundo estado habilita a captura; ainda não demonstra uma fala reconhecida. |
| `resource-busy`, `interrupted`, `timeout` | Reconhecedor ocupado, sessão interrompida ou tempo excedido. Registre fase e liberação observável. |
| `no-result`, `ambiguous-result`, `engine-failed` | Resultado final ausente ou fora dos limites, interpretações divergentes ou falha do motor. Registre o código e a mensagem fixa. Na demo, registre também a faixa e a concordância quando disponíveis. |
| `cancelled`, `cleanup-failed` | Sessão cancelada ou liberação não confirmada. A segunda condição deixa a voz bloqueada e o manual acessível. |

## Devolução sanitizada da rodada

Preencha uma linha por caso ou variante exercitada com `passou`, `falhou`,
`limite` ou `não verificado`. Para Android, use o modelo genérico
(exemplo `Samsung Galaxy`), a versão Android/API e o SHA-256 completo do APK.
Devolva os JSONs de build, identidade e Metro da mesma rodada. O build e a
identidade vinculam o APK pelo hash. O Metro identifica a fonte e a porta. Informe o código conhecido ou
`—` e copie apenas a mensagem fixa da tela. Para perguntas sobre o motor,
informe se os campos sintéticos bateram e se o indicador de microfone encerrou.
Amostras que dependam de outra API, outro idioma ou serviço ausente podem ficar
`não verificado` quando a condição não ocorrer no aparelho. Se A–D bloquear
a captura, marque E–L dependentes com o impedimento observado.

```text
APK SHA-256=<64 hex> | Modelo genérico=<modelo> | Android=<versão> | API=<número>
A–D | Caso=<A/B/C/D + variante> | Estado=<passou/falhou/limite/não verificado> | Código=<código/—> | Mensagem fixa=<texto/—> | Microfone=<abriu/não abriu/não verificado> | Manual=<acessível/não verificado>
E–L | Caso=<E/F/G/H/I/J/K/L + variante> | Estado=<passou/falhou/limite/não verificado> | Código=<código/—> | Mensagem fixa=<texto/—> | Candidatos=<conferem/divergem/ausentes/não verificado> | Liberação=<observada/não observada/não verificada> | Duração=<ms ou —>
```

Devolva somente os JSONs sanitizados de cada etapa executada e esse quadro.
Em caso de falha de build, inclua etapa, código e um trecho curto sem caminhos
pessoais. Áudio, transcrição, valores reais, serial, conta e logcat completo
ficam fora do relato.

## Registro para o relatório final

- **Fatos.** O cliente isolado solicita somente a permissão de áudio entre
  câmera/mídia/microfone, usa a factory Android local e exige pt-BR instalado.
  O prebuild foi validado em host e os checks executam mods Expo reais ou
  fixtures sintéticas. A [revisão estática](task-12-revisao-estatica.md) mapeia
  APIs, erros e o ajuste de registro do listener.
- **Decisões.** Registrar resultados por aparelho e condição. Manter o caminho
  manual acessível e a confirmação da avaliação em memória. Vincular evidência
  física ao APK verificado e usar Metro IPv4/USB na porta 8099.
- **Limitações.** A V1 confirmou compilação, manifesto, ligação USB/Metro no
  Windows e capacidade offline no Samsung da rodada. A repetibilidade, os
  cenários ainda não exercitados e a evidência do processo reconhecedor sobre
  armazenamento e tráfego permanecem pendentes. O resultado vale para o
  aparelho e as condições registradas.
- **Reprodução.** Executar os blocos Windows acima e registrar A–D antes de E–L.
  Na raiz, usar `node tools/task07/AferiBackupRules.check.cjs --voice`,
  `node tools/task07/AferiNetworkInspector.check.cjs --voice`,
  `npm run lint`, `npm run typecheck` e `npm test`. Rodar cada
  `tools/task12/*.check.ps1` com `pwsh -NoLogo -NoProfile -File`.
- **Continuidade.** A capacidade offline também foi observada no
  [Chrome do autor](task-13-voz-web.md#resultado-da-v1-no-chrome). O
  [plano de 26/11](reavaliacao-2026-11-26.md)
  prevê V2 Web atrás de flag desligada por padrão e V3 Android com rebuild do
  Dev Client. A verificação de privacidade do serviço e os aceites de
  confirmação, cancelamento e troca de conta ainda condicionam a habilitação.

### Atualização de 27/11/2026

- **Evidência.** O autor relatou 10 falhas em 10 tentativas sem pulso e 6 acertos
  em 6 tentativas com pulso no Samsung. A regra anterior recusava grafias
  distintas antes do parser. Testes com a porta nativa simulada verificam
  concordância, divergência, descarte de texto e cancelamento.
- **Decisão.** Exigir concordância integral das interpretações, preservar a
  revisão explícita e mostrar somente faixa e concordância na demo.
- **Limites e reprodução.** Compilação Kotlin e eficácia no Samsung continuam
  sem verificação para esta revisão. Recompilar a demo e repetir os grupos
  sintéticos com e sem pulso, incluindo a rodada offline e o cancelamento.
