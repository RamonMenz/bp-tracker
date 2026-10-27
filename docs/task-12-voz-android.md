# TASK-12 — STT Android local conectado à revisão, em avaliação

27/10/2026. Branch `feature/task-12-android-local-voice`, base staging `7d72cb3`,
preservando as frentes locais anteriores. **TASK-12 permanece aberta:** integração
local implementada/testada por portas isoladas, sem Kotlin/APK compilado ou STT
executado em aparelho. Não há comprovação de privacidade interna do serviço do SO.

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
5. Somente `onResults` pode produzir `FinalTranscript` da TASK-03, texto limitado a
   2000 caracteres e instante civil do início de `startListening`. Parciais, buffer,
   volume/RMS e eventos genéricos são ignorados, sem transporte de áudio ao JS.
   Hipóteses textuais distintas retornam `ambiguous-result`; não escolhe a primeira.
6. Invalidar tentativa, cancelar/destruir reconhecedor e abandonar foco antes de
   resolver o resultado final. JS aguarda confirmação de fechamento antes de
   entregar ao `useVoiceReview.receiveFinal` → decoder → parser TASK-14 → revisão.

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
Transcrição final só vive transitoriamente na fronteira/parser; não é exibida.
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

## Verificações efetivas

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

## Executar no computador e demonstrar no aparelho

Use a cópia completa deste workspace, inclusive arquivos **não commitados** de
`src/`, `native-modules/` e `demos/`. Instale Node 24, Android Studio/SDK e JDK
compatível com Expo SDK 57/RN 0.86/Gradle 9.3.1. A configuração da PoC observou
SDK 36, Build-Tools 36.0.0 e NDK 27.1.12297006; confira o requerido pelo Gradle
gerado antes de mudar versões. O primeiro build exige downloads de Gradle/Maven/RN.
Sem esses pré-requisitos não há compilação nativa; não use Expo Go ou EAS Build.

```bash
# Raiz; instalar a partir do lock existente:
npm ci --ignore-scripts
cd demos/android-voice
../../node_modules/.bin/expo prebuild --platform android --no-install
../../node_modules/.bin/expo run:android --device --port 8099
```

No Windows, use o executável equivalente em `node_modules/.bin`/Android Studio.
Ative depuração USB no telefone e aceite a autorização. Com Dev Client já
instalado, inicie Metro nessa pasta com `expo start --dev-client --localhost
--port 8099`, usando o executável local acima; `adb reverse tcp:8099 tcp:8099`
permite conexão USB. Não atualiza o aplicativo clínico, pacote diferente.

1. Abra **Aferi — voz local em avaliação**. Antes de iniciar, o microfone fica
   desligado. Teste o manual de avaliação sem conceder microfone.
2. Volte e toque **Começar a falar (avaliação local)**. API/serviço, permissão e
   pt-BR instalado são checados antes de escutar. Se indisponível, use manual.
   Prepare modelo somente nas configurações do fabricante se necessário; o app
   não baixa automaticamente. Se a permissão gerar background, a tentativa pode
   ser cancelada: depois de conceder, use uma **nova ação explícita** para tentar.
3. Diga “doze por oito” e termine fala. Confira 120/80 mmHg, pulso vazio; repita
   com “cento e vinte por oitenta, pulso setenta e dois”. Isso só comprova o caso
   se o serviço realmente devolver final e os candidatos estiverem corretos.
4. Edite/cancele/fale novamente. Confirmar mostra estado final em memória; não
   grava histórico. Voltar ao manual desmonta voz e inicia campos vazios.

Checks locais na raiz:

```bash
npm test -- --runInBand
npm run lint
npm run typecheck
node node_modules/typescript/bin/tsc --noEmit -p demos/android-voice/tsconfig.json
```

Para repetir autolinking, rode o CLI local `expo-modules-autolinking resolve
--platform android --json` em cada projeto de avaliação e na raiz. Para compilar
somente o módulo, no android gerado use `./gradlew
:aferi-local-voice:compileDebugKotlin`; build/install real seguem pendentes aqui.
Erros de compilação devem ser corrigidos pelo Codex a partir do trecho sanitizado;
não é necessário você modificar Kotlin nem enviar logs completos.

## Roteiro específico de validação física pendente

Registrar modelo genérico, versão Android/API, fabricante/versão do serviço e
idiomas instalados, sem serial, conta, UID pessoal ou dumps de áudio/transcrição.
Usar somente fala sintética do próprio autor. Não coletar terceiros sem o
procedimento da spec/TASK-17. Identificar cada resultado como teste de aparelho.

| Caso | Ação | Resultado que precisa ser verificado |
|---|---|---|
| A — build/isolamento | Compilar/instalar somente com.ramonmenz.aferivoicetest; abrir manual | Sem Firebase/configuração clínica; sem microfone, download de modelo ou reconhecimento no launch/manual |
| B — capacidade | API <31, API 31/32 ou aparelho sem serviço local | Indisponibilidade explícita, sem factory genérica/escuta ou pedido repetido; manual acessível |
| C — idioma | pt-BR ausente, só online/suportado/pendente, ou só pt-PT | Não inicia captura. Após instalar pt-BR nas configurações do SO e nova ação explícita, repetir consulta; não interpretar idioma genérico como pt-BR comprovado |
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

Retorno útil: casos A–L aprovados/reprovados/não verificados, códigos fixos exibidos,
versões gerais e erros de build sanitizados. Não enviar áudio, dados pessoais,
transcrição de paciente ou dumps completos. Correções técnicas ficam com o Codex.

## Próximas dependências

TASK-05/06, compilação/aparelho e inspeção de privacidade acima antes de habilitar
voz clínica. TASK-13 permanece pendente e não foi implementada nesta tarefa.
TASK-11/15 continuam dependentes de emulador/regras/sessão/isolamento entre contas e
integração clínica segura. Recomenda-se executar primeiro A–D e depois E–L no
aparelho disponível, mantendo a prioridade global de fotografia definida na spec.
