# PoCs executáveis de fotografia e voz — TASK-04 / TASK-05

Execução de 27/10/2026 UTC (26/10/2026 em America/Sao_Paulo), sobre `7d72cb3347dca04bde9b8a706f523a6da245dea2`, preservando os documentos e alterações locais das TASK-01–TASK-03. Referências: [arquitetura](./arquitetura-ia.md), [baseline](./baseline-legado.md), [revisão](./revisao-specs.md), [fotografia](../specs/spec-fotografia.md), [voz](../specs/spec-voz.md) e [constituição](../constitution.md).

## 1. O que foi implementado

Um **aplicativo de experimentos independente em `pocs/`**, com lock próprio, entrada Expo sem Router/Firebase, pacote Android `com.ramonmenz.aferipoc` e scheme `aferipoc`. Ele não substitui nem atualiza o aplicativo BP Tracker/Aferi. Não requer conta, `.env.local`, `google-services.json`, homologação Firebase ou serviço de reconhecimento em nuvem.

| Parte | Implementação |
|---|---|
| Fotografia Android | Módulo Expo local em Kotlin; CameraX Preview + ImageAnalysis, frame `media.Image` diretamente para ML Kit latino embarcado. Sem `ImageCapture`, fotografia em URI, arquivo/base64 intermediário ou importação de galeria. Frame fechado após o motor terminar; cancelamento invalida resposta e posterga fechamento se ainda houver leitura nativa |
| Fotografia Web | `getUserMedia` → quadro em canvas → PNG/bytes **em memória** → worker do Tesseract.js/LSTM servido na mesma origem. Uma tentativa/worker; handle existe antes da carga do WASM, permitindo terminar inclusive durante inicialização |
| Candidatos | Interpretação pura mínima, somente SYS/DIA/PUL e número na mesma linha. Ausência e ambiguidade são explícitas; não completa pelo histórico, troca valores ou aplica escala de voz. Não é a implementação completa da TASK-09 |
| Voz Android | Factory `createOnDeviceSpeechRecognizer`; probe de disponibilidade e de pt-BR **instalado**, com `checkRecognitionSupport`. Retorno apenas final; sem gravador, buffer de áudio exposto ao JS ou arquivo. API 31/32 é explicitamente indisponível nesta spike por não oferecer a verificação de idioma da API 33 |
| Voz Web | Verifica `available({langs:['pt-BR'], processLocally:true})`, propriedade real e modo local antes de iniciar. Sem pacote, mostra indisponibilidade. Botão separado pode solicitar instalação do **modelo estático**, sem capturar áudio |
| Interface | Iniciar, capturar/terminar fala, cancelar, resultado temporário, tempos e repetir. Modalidades carregadas por import dinâmico somente após escolher. Texto, fonte escalável e botões de pelo menos 48 px; sem diagnóstico |
| Persistência | **Ausente**: não há writer, repositório, SDK Firebase, botão de salvar ou fila de medição. Nenhum candidato pode ser salvo, mesmo por confirmação nesta spike. `source`/rules não foram alterados |

Não havia parser compartilhado de voz implementado; a PoC mostra a transcrição final temporária e não amplia o trabalho para a TASK-14. O cartão sintético Web faz OCR real em WASM, mas **não é teste de câmera física**.

Os contratos do domínio preservam o desenho da TASK-03: `OcrObservation` identifica frame orientado, instante civil de captura, tokens/caixas normalizadas e confiança nula quando não usada; `CandidateSet` mantém modalidade, instante, campos e motivo de incerteza; `FinalTranscript` exige final, locale pt-BR e instante de início. Saídas nativas são `unknown` e passam por checagens de forma/limites antes da interpretação. A PoC só implementa a base `label` do candidato e os motivos de fotografia necessários ao experimento; não implementa revisão editável, autorização de escrita, parser de voz ou os contratos de persistência futuros. O escopo `Attempt` corresponde à identidade/cancelamento/deadlines das portas ilustrativas; câmera/worker continuam privados, fora do estado React.

### Arquivos e isolamento

- `pocs/package.json` / `package-lock.json`, `app.config.ts`, `index.ts`, Babel/Metro/TS/ESLint próprios: preparação e execução isoladas.
- `pocs/src/PocApp.tsx`, `components/PhotoPoc.*`, `VoicePoc.*`, `Action.tsx`, `Panel.tsx`, `Status.tsx`, `Result.tsx`: entrada e interface por plataforma.
- `pocs/src/features/attempt.ts`, `usePoc.ts`: trava síncrona, deadlines, cancelamento e descarte de resultado atrasado; limpeza também em sucesso, background e desmontagem.
- `pocs/src/domain/`: candidatos, erros enumerados e interpretação conservadora; `src/services/recognition/`: fronteiras de Web/native, sem persistência.
- `pocs/modules/aferi-local-recognition/`: módulo Expo, manifest, dependências Gradle e três arquivos Kotlin (câmera, voz e exposição à bridge).
- `pocs/scripts/prepare-ocr.mjs`: copia somente motor/modelo/licenças estáticos e produz manifest com tamanhos/SHA-256; não recebe captura.
- `pocs/scripts/serve-web.mjs`: servidor local somente leitura, com CSP que restringe scripts, workers e conexões à própria origem. POST não é aceito. Essa CSP é aplicada pelo servidor estático, não pelo servidor de desenvolvimento Metro.
- `pocs/checks/contracts.test.mjs`, `web-runtime.mjs`: testes de contratos e experimento automatizado no Chromium, respectivamente.
- Fora da pasta, `eslint.config.js` recebeu exclusão de `pocs/**`, que tem lint próprio; `CLAUDE.md` lista os novos comandos; `tasks.md` registra evidências/pendências. Código do produto, dependências/lock da raiz, regras e configurações remotas foram preservados.

Diretórios gerados `pocs/android`, `node_modules`, `dist`, `.expo`, caches/builds e `public/ocr` são ignorados pelo Git. O **código-fonte** do módulo local Android está incluído; somente seu diretório `build` é ignorado. Nenhum corpus, imagem, áudio, credencial ou modelo binário foi adicionado ao Git.

## 2. Dependências e parâmetros usados

| Dependência/configuração | Versão escolhida | Justificativa, licença e limite |
|---|---|---|
| Expo / Dev Client / Modules Core | 57.0.8 / 57.0.13 / 57.0.7 | Mesma geração do produto, sem migração. Expo Modules permite bridge mínima auditável; MIT. Compatibilidade de build e de aparelho são evidências distintas |
| React / RN / RN Web | 19.2.3 / 0.86.0 / 0.21.2 | Mesmas versões resolvidas do legado; MIT. Instalação independente mantém motores fora do bundle legado |
| Tesseract.js / core | 7.0.0 / 7.0.0 | Motor escolhido na spec, Apache-2.0. Usamos o protocolo do worker dessa versão fixada para conseguir cancelar antes de terminar a inicialização; manutenção exige reconferir protocolo se atualizar. Sem CDN/defaults de rede: `corePath`/`langPath` locais, OEM 1 LSTM-only, PSM 6, logging desativado, outputs de blocos/linhas |
| `@tesseract.js-data/eng` | 1.0.0, artefato `4.0.0_best_int/eng.traineddata.gz` | Modelo pré-treinado LSTM inteiro; inglês reconhece os rótulos SYS/DIA/PUL e dígitos, não é o idioma da voz. Pacote declara MIT; observar também termos/licença do modelo upstream Tesseract/tessdata. Gzip do modelo aproximadamente 2,9 MiB; não treinado nesta tarefa |
| CameraX camera2/lifecycle/view | 1.5.1 | AndroidX, Apache-2.0; captura por frames, sem biblioteca de fotografia que grave em cache. Mantido apenas no app de PoC |
| ML Kit Text Recognition | `com.google.mlkit:text-recognition:16.0.1` | Modelo latino embarcado, termos Google ML Kit, não confundir com licença de projeto aberto ou variante Play Services. Guia informa incremento da ordem de 4 MB por script/arquitetura; tamanho final real do APK ainda exige build/medição |
| SpeechRecognizer | API nativa; on-device desde API 31, consulta de suporte desde 33 | Sem biblioteca STT adicional ou tarifa por chamada. Idioma/modelo/implementação do serviço variam por aparelho; API/documentação não provam não retenção interna |
| Web Speech | API experimental do navegador; sem pacote npm de STT | Exige implementação local/pt-BR disponível. Sem fallback remoto. Downloads de modelos pertencem ao navegador; cancelar UI não promete interromper download estático já solicitado |
| Tooling | Node 24.19.0, npm 11.9.0, TS 6.0.3 | Scripts de preparação usam Node 24. O app de PoC declara Node >=24.3; não mudou o runtime das Functions |
| Build Android observado | JDK 17.0.16, Gradle 9.3.1, Kotlin 2.1.20, compile/target SDK 36, min SDK 24, Build-Tools 36.0.0, NDK 27.1.12297006 | Prebuild resolveu esses parâmetros. A compilação não terminou por bloqueio de download do React Native; não são evidência de compatibilidade nativa executada |

Assets OCR preparados ocupam aproximadamente **23 MiB** somando variantes normal/SIMD/relaxed-SIMD, JS/WASM, modelo e licenças; cada navegador carrega a variante necessária. O manifest gerado permite conferir tamanho/hash exatos após `prepare:ocr`. Os bytes são do app de testes; não representam aumento do bundle legado. O export Web observou entrada JS de aproximadamente 360 kB e chunks separados de fotografia/voz; Android exportou JS/Hermes de aproximadamente 1,5 MB. Valores do export não equivalem a download comprimido, memória ou tamanho de APK.

Limites **experimentais**, não metas de desempenho aprovadas: câmera/permissão até 30 s, preparação do preview nativo até 20 s, espera de enquadramento até 60 s; Web até 45 s por fase do worker; captura Web redimensionada para lado máximo 1600 px; frame Android solicitado 1280×960; áudio/final até 30 s no serviço, com espera JS nativa até 35 s; probe local 10–12 s; instalação Web de modelo estático até 120 s. Uma tentativa/frame/worker ativos. TASK-06 deve consolidar valores após medições reais.

O Tesseract usa filesystem **virtual em RAM do WASM** para decodificação/modelo. Isso não é arquivo de captura no disco; `cacheMethod:'none'` desativa cache do modelo em IndexedDB pelo worker. Assets estáticos podem estar no cache HTTP. A inexistência de persistência interna do navegador/SO durante captura real ainda exige inspeção; não se promete sobrescrita física da memória.

Fontes consultadas para implementação: [Expo Modules](https://docs.expo.dev/modules/native-view-tutorial/), [ML Kit Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android), [CameraX ImageAnalysis](https://developer.android.com/media/camera/camerax/analyze), [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer), [RecognitionSupport](https://developer.android.com/reference/android/speech/RecognitionSupport) e código/licenças dos pacotes fixados no lock. Fontes documentais não substituem os testes de aparelho abaixo.

Não houve treinamento, contratação, EAS Build, build pago, commit, push ou deploy. Não houve operação contra Firebase de produção. Horas e despesas realizadas, despesas anteriores e saldo das 100 h/R$ 300,00: **não informado**; não presumir saldo integral ou usar duração de comando como esforço realizado.

## 3. Como executar no seu computador — sem experiência prévia de terminal

Você precisará de uma cópia desta pasta do projeto **com as alterações desta entrega**. Elas não foram commitadas nem enviadas ao GitHub. Se outro computador não tiver esses arquivos, é necessário transferir a cópia atual; não envie `node_modules`, credenciais ou dados de usuário. O `package-lock.json` de `pocs/` e o módulo Kotlin devem ir junto.

Instale Node.js 24 LTS pelo instalador do sistema. Abra a pasta do projeto em um editor como VS Code e escolha **Terminal → Novo Terminal**. Nas instruções “raiz do repositório” é a pasta que contém `tasks.md` e `pocs`; “pasta pocs” é essa subpasta. Copie uma linha por vez, aguarde terminar e mantenha a janela aberta quando um servidor estiver rodando. `Ctrl+C` encerra o servidor; não é necessário publicar nada.

### Web — caminho recomendado, com servidor restrito

No terminal na **raiz do repositório**:

```bash
npm --prefix pocs ci
npm --prefix pocs run export:web
npm --prefix pocs run serve:web
```

O segundo comando prepara automaticamente somente os assets estáticos e compila a interface. O terceiro mantém o servidor aberto. No navegador **desse mesmo computador**, digite `http://localhost:8095`. Essa URL não abre a sessão cloud do Codex no seu computador; você precisa executar os comandos na sua cópia local. A primeira instalação/compilação precisa de rede; a câmera/microfone exigem navegador com APIs e contexto seguro. `localhost` é apropriado no próprio computador; acessar um IP HTTP de outro aparelho não comprova suporte a câmera/voz.

Alternativa de desenvolvimento: `npm --prefix pocs run web` (Metro na porta 8090). O servidor estático acima é preferível para verificar a CSP e reduzir tráfego de desenvolvimento. Nenhum comando usa configuração Firebase.

### Android — preparação e Dev Client local

1. Instale **Android Studio** no computador. Na configuração inicial, instale o Android SDK. Em **SDK Manager**, selecione plataforma Android 36 e, em SDK Tools, Platform-Tools, Build-Tools 36.0.0 e NDK **27.1.12297006** (a opção “Show Package Details” permite selecionar a versão). Aceite as licenças pelo próprio Android Studio. Downloads ocupam vários GB; não há cobrança de serviço de build.
2. Disponibilize um **JDK 17** para a toolchain de build. Android Studio pode permitir baixar/selecionar JDK em Settings → Build, Execution, Deployment → Build Tools → Gradle. O ambiente do Codex precisou instalar JDK 17 adicional ao 21. Se o terminal disser “JAVA_HOME” ou “SDK location not found”, não altere código: envie somente esse erro sanitizado e o sistema operacional para o Codex orientar o caminho exato. Nunca envie variáveis de ambiente completas.
3. No Android, abra Configurações → Sobre o telefone e toque sete vezes em “Número da versão” para habilitar Opções do desenvolvedor. Habilite **Depuração USB**, conecte por cabo de dados, desbloqueie o aparelho e aceite a autorização de depuração quando aparecer. Não envie número de série/identificadores do aparelho.
4. No terminal na **raiz do repositório**, execute:

```bash
npm --prefix pocs ci
npm --prefix pocs run android -- --device
```

O Expo gera `pocs/android`, compila **localmente**, oferece seleção do aparelho e instala o app **“Aferi — PoCs locais”**. Não use `eas build`, `eas submit`, Firebase CLI ou Expo Go. Se o CLI precisar da localização do SDK, use o caminho mostrado pelo Android Studio; no Windows ele normalmente está em `%LOCALAPPDATA%\Android\Sdk`, no macOS em `~/Library/Android/sdk` e no Linux em `~/Android/Sdk`. São exemplos, não caminhos comprovados do seu computador.

**Estado desta entrega:** não há APK aprovado. O build neste ambiente parou antes de compilar o módulo local porque o download de `react-android:0.86.0` redirecionou para `repo.reactnative.dev`, bloqueado com HTTP 403. O computador que compilar precisa conseguir acessar esse repositório, além dos repositórios Android/Maven/npm usuais. Se isso também ocorrer na sua rede, devolva o domínio/código do erro; não troque versões, desative TLS ou altere código. Após disponibilizar uma rede permitida ao ambiente Codex, o Codex deve retomar a compilação e corrigir eventuais erros de programação antes do aceite Android.

Para separar geração e build/inspecionar no Android Studio:

```bash
npm --prefix pocs run prebuild:android
```

Depois abra a pasta gerada `pocs/android` no Android Studio e aguarde a sincronização. Para reiniciar somente o servidor JS após ter instalado esse Dev Client:

```bash
npm --prefix pocs start
```

Mantenha computador e telefone conectados ao servidor Metro local, preferencialmente via USB. Se a tela do Dev Client pedir um endereço de servidor, devolva essa mensagem ao Codex para orientar a conexão; não é preciso programar. Nova mudança de módulo Kotlin/dependência nativa exige recompilar com `run android`, não apenas reiniciar JS. O package/scheme distintos preservam o aplicativo legado instalado.

## 4. Verificações executadas e seus limites

Ambiente Linux, Node 24.19.0, npm 11.9.0 e Chromium **154.0.8037.57** headless. Não há câmera/microfone físicos ou aparelho Android conectado. Foram preparados SDK Android e toolchain temporários para avançar no build; isso não torna disponível um aparelho.

| Verificação | Resultado observado |
|---|---|
| Instalação `npm --prefix pocs install` | Aprovada; lock isolado, 745 pacotes. Avisos de pacotes obsoletos não foram confundidos com auditoria de segurança |
| Preparação de assets | Worker/core/modelo/licenças copiados localmente; manifest de bytes/SHA-256 gerado; nenhuma captura usada |
| Typecheck e lint da PoC | Aprovados |
| Testes da PoC | **7 testes aprovados**, cobrindo rótulos/ausência/ambiguidade, saída malformada, descarte/cancelamento/timeout, erros seguros e isolamento estático. Não testam hardware |
| Export Web | Aprovado; interface abriu no Chromium, chunks de modalidades separados |
| OCR real no navegador sobre canvas sintético | Aprovado para o cartão controlado: três campos coincidiram com o esperado. Não foi mock de OCR nem teste de câmera real |
| Cancelar e cancelar durante inicialização | Resultado limpo e callback antigo não restaurou candidatos no percurso automatizado |
| Câmera no Chromium | Dispositivo indisponível, com feedback. Configurar recusa no navegador não substituiu a falta de hardware; negação em câmera real continua pendente |
| Rede/storage Web observados | No percurso de teste: zero requisições não GET/HEAD, zero externas; zero bancos IndexedDB, caches Cache API e service workers nessa origem/perfil isolado. Inspeção limitada ao teste/targets observados, não prova universal de ausência de persistência interna do navegador |
| Voz local Web | API e propriedade presentes; consulta local pt-BR retornou **`downloadable`**, não `available`. Iniciar mostrou modelo ausente; nenhuma captura remota foi iniciada. Tentativa explícita de instalar pacote não o deixou disponível nesse perfil; transcrição local pt-BR **não verificada** |
| Prebuild/autolinking Android | Aprovados; módulo local identificado; módulos Firebase não encontrados no autolinking da spike |
| Bundle JS Android | Aprovado, aproximadamente 1,5 MB em Hermes. Isso não compila nem executa Kotlin |
| Compilação Kotlin / APK | **Bloqueada antes do módulo local**: `:expo-modules-core:compileDebugKotlin` não obteve `react-android-0.86.0-debug.aar`. Maven Central redirecionou para `https://repo.reactnative.dev/maven2/com/facebook/react/react-android/0.86.0/react-android-0.86.0-debug.aar`, com HTTP 403. Não há Kotlin local compilado, APK gerado ou câmera/voz Android executadas |
| Legado: lint/typecheck/Jest | Aprovados; **45 suítes, 384 testes**. Código funcional/configuração Firebase e lock da raiz preservados. Não é ensaio de desempenho Android/Web reais |
| Regras Firestore | Sem alteração e sem escrita de teste. Download do emulador continua bloqueado por HTTP 403 da política para `storage.googleapis.com`; não declarar rules executadas nesta etapa |

Rodadas sintéticas Web observadas tiveram inicialização aproximadamente 140–328 ms e reconhecimento aproximadamente 79–191 ms, com caches e condições variáveis. São **amostras de funcionamento**, não benchmark, percentis ou expectativa de desempenho no aparelho. Inicialização Web mede carga WASM/modelo; Android mede preparação da câmera/cliente, podendo carregar pesos na primeira inferência. Voz Android mede probe/permissão na inicialização e espera de resultado após fim da fala quando disponível; voz Web mede sessão desde início. Não comparar diretamente essas medidas como se fossem a mesma latência.

Comandos de qualidade, a partir da **raiz**:

```bash
npm --prefix pocs run typecheck
npm --prefix pocs run lint
npm --prefix pocs test
npm run lint
npm run typecheck
npm test -- --ci --runInBand
```

O experimento de navegador `npm --prefix pocs run test:web` é para reprodução técnica pelo Codex: requer servidor estático na porta 8095 e Chromium com CDP na 9222. Ele executa OCR sintético real, observa também targets de workers, testa cancelamento/indisponibilidade e produz somente flags e tempos. Não é necessário você configurar CDP para fazer os testes manuais abaixo. Logs sanitizados desta sessão estão em `/tmp/bp-pocs-*.log`; não dependemos de sua permanência como evidência, pois os resultados estão resumidos aqui. Uma execução do teste sem permissão de rede do sandbox falhou ao conectar ao CDP em localhost (`EPERM`); isso é uma restrição do executor, não uma falha observada no app.

Os exports nesta sessão foram executados com `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1`, após instalar os pacotes. Uma tentativa sem essas opções falhou ao criar o diretório de preferências Expo em `/home/agent/.expo`, não gravável no sandbox; a execução offline sem telemetria passou. Essas variáveis foram aplicadas ao comando, sem trocar `HOME`, credenciais ou configuração do produto. No seu computador comum não é necessário reproduzir as restrições do sandbox.

Rastreio dos experimentos da TASK-03: **F04-A bloqueado** (build/recurso Android); **F04-W parcial** (worker real sobre canvas passou, câmera/display faltam); **F04-C parcial** (testes de controle e cancelamento Web passaram, hardware/inspeção faltam); **V05-A bloqueado** (build/aparelho); **V05-W indisponível neste perfil** (pt-BR não instalado, nenhum reconhecimento aprovado); **V05-C parcial** (guardas de controle/erros sem conteúdo, faltam microfone e sessão real). Nenhuma dessas classificações autoriza habilitar a modalidade no produto.

## 5. Suas próximas ações, em ordem

### A1 — Abrir a PoC Web e conferir o teste controlado

**Por que depende de você:** o navegador/dispositivos que você usará não são os do ambiente cloud. **Recurso:** computador com Node 24 e navegador Chromium recente, cópia atual do projeto e rede para instalar dependências/assets.

**Passos:** executar os três comandos Web da seção 3; abrir localhost:8095; escolher Fotografia; tocar **“Testar OCR com cartão sintético (sem câmera)”**; verificar os três campos; cancelar; repetir; sair às PoCs e voltar ao manual/fechar a aba.

**Aprovação:** resultado controlado aparece, cancelar remove resultado, repetir funciona, não há botão Salvar nem necessidade de conta. **Reprovação:** resultado antigo reaparece ou captura/reconhecimento é acionado sozinho. **Devolver:** versão do navegador/OS, aprovado/reprovado, mensagem de erro fixa e os tempos exibidos, sem dados pessoais. **Como permite continuar:** reproduz a instalação e separa falhas de ambiente de problemas do adaptador antes de usar hardware.

### A2 — Executar câmera real Web

**Por que não executado aqui:** não há câmera física ligada ao Chromium cloud. **Recurso:** webcam/câmera do próprio computador e cartão sintético; depois aparelho de pressão próprio/emprestado em condição controlada, sem anexar valores clínicos reais.

**Passos:** Fotografia → Iniciar câmera → permitir → enquadrar cartão com SYS/DIA/PUL → Capturar e reconhecer. Repetir recusando permissão; cancelar enquanto enquadra e durante OCR; iniciar outra tentativa; trocar de aba/minimizar e retornar. Verificar indicador da câmera desligado após capturar/cancelar/sair. Depois ensaiar leitura inicial de display e anotar apenas correspondência/ausência de campos, sem guardar foto de uso.

**Aprovação:** câmera real abre por ação, um processamento por vez, saída temporária coerente, indicador encerra, resultado cancelado não reaparece. Rótulo separado do número pode resultar em “não identificado” pela limitação do parser mínimo; isso não deve ser corrigido inventando valores. **Reprovação:** câmera permanece ativa, mídia aparece em downloads/galeria, erro contém conteúdo capturado ou resultado antigo retorna. **Devolver:** OS/navegador, tipo genérico de câmera, permissões, campos coincidiram/não coincidiram/ausentes e tempos; se houver screenshot, usar apenas o cartão sintético. **Continuidade:** permite corrigir integração/cleanup e delimitar parser/layout antes da TASK-09.

### A3 — Verificar voz local no navegador

**Por que depende do seu ambiente:** o perfil Chromium cloud não tem pt-BR local pronto; falta também microfone físico. **Recurso:** navegador que disponibilize Web Speech local/pt-BR e microfone; não basta “ter Chrome”.

**Passos:** Voz → Iniciar voz local. Se informar modelo ausente, usar **“Preparar modelo pt-BR local (download estático)”**, aguardar e iniciar novamente. O navegador pode pedir permissão/download; se retornar indisponível, registrar esse resultado e usar manual, sem habilitar reconhecimento remoto. Quando pronto, permitir microfone e dizer frases sintéticas do próprio autor; testar Terminar fala e Cancelar. Repetir sem rede depois da preparação; verificar indicador do microfone encerrado. Silêncio/ruído não deve gerar medição salva.

**Aprovação:** transcrição final local pt-BR aparece sem rede após preparo, cancelar a descarta e libera microfone; arquivo de áudio não é criado. Isso ainda precisa de inspeção de rede/armazenamento pelo Codex para aceite de privacidade. **Indisponibilidade:** pacote/API ausente é resultado legítimo e não reconhecimento aprovado. **Devolver:** OS/navegador/versão, mensagem fixa, modelo preparado ou indisponível, frases sintéticas reconhecidas corretamente ou não, tempos e indicador de microfone. Não enviar gravação/transcrição real. **Continuidade:** define cobertura, necessidade de investigação ou bloqueio real da modalidade Web.

### A4 — Instalar e testar a PoC no Android

**Por que depende de você:** não há telefone Android conectado a esta sessão. **Recurso:** computador/Android Studio/JDK/SDK e cabo de dados; telefone com câmera e, para probe verificável de voz, Android 13/API 33+ e serviço/modelo pt-BR on-device.

**Passos:** primeiro disponibilizar ao Codex um ambiente de build com acesso a `repo.reactnative.dev`, ou executar o build local da seção 3 em rede que permita esse domínio, devolvendo somente erros sanitizados se houver. Não há procedimento de programação a realizar: o Codex retoma correções de código se o compilador as exigir. Após build aprovado, instalar o Dev Client local e abrir “Aferi — PoCs locais”. Não fornecer credenciais Firebase. Testar fotografia com o mesmo cartão, leitura inicial de display, recusa, cancelamento, repetição e background. Em voz, iniciar e observar probe: se faltar pt-BR local, preparar o idioma nas configurações do serviço de reconhecimento do aparelho, conforme o fabricante; voltar e repetir. Dizer frases sintéticas, terminar/cancelar, repetir em modo avião após modelo disponível. Android 12/API 31/32 deve explicar idioma não verificável nesta spike.

**Aprovação:** câmera/ML Kit e voz local demonstrados nesse aparelho, recursos encerrados e nenhum resultado cancelado retornando. **Reprovação:** build/app falha, usa serviço remoto, grava mídia ou mantém recurso aberto. **Devolver:** modelo genérico/versão Android, se o app compilou/instalou, códigos/mensagens fixas, resultados por caso, tempos e indicadores. Não enviar serial, conta, dumps completos de logcat ou conteúdo clínico. Se houver erro de compilação, envie apenas trecho do erro sem caminhos pessoais/credenciais; **a correção de código é trabalho do Codex**, não sua obrigação. **Continuidade:** permite reproduzir corrigir binding/serviço e consolidar cobertura na TASK-06.

### A5 — Devolver evidências para fechar os aceites

Use um registro simples: `caso (A1/A2/A3/A4) | plataforma/versão | ação | passou/falhou/indisponível | mensagem fixa | tempos | recurso encerrou?`. Não enviar fotos/áudios de uso, credenciais, dados identificáveis ou medições reais. Os resultados permitem ao Codex repetir a verificação afetada, instrumentar o ambiente sem conteúdo clínico e atualizar o aceite. Ver downloads/galeria vazios e modo avião, isoladamente, não comprovam não persistência: inspeção técnica complementar continua sendo trabalho do Codex.

## 6. O que ainda não foi concluído

### a) Ações que precisam do usuário

A1–A5 acima descrevem instalação/acesso ao hardware e evidências, com procedimento e critérios. Não é necessário escrever parser, Kotlin, TypeScript, testes ou corrigir dependências. Nenhuma ação pede conta Google/Firebase/EAS ou contratação.

### b) Bloqueios técnicos e trabalho restante do Codex

- **Build nativo bloqueado por rede:** obter o artefato de React Native 0.86.0 em ambiente autorizado a acessar `repo.reactnative.dev`; depois repetir, na pasta `pocs/android`, `./gradlew :aferi-local-recognition:compileDebugKotlin --no-daemon --console=plain` (Windows: `gradlew.bat`), e o build/instalação pelo comando Expo da seção 3. O Codex deve corrigir qualquer erro de módulo que então aparecer. Prebuild/bundle não substituem compilação Kotlin nem instalação; não se contornou a política de rede nem se alterou a versão aprovada.
- Investigar falhas reproduzidas de CameraX/ML Kit/serviço de voz/cleanup, a partir dos casos sintéticos; instrumentação de rede/disco sem conteúdo clínico deve ser preparada/interpretada pelo Codex.
- Auditar armazenamento e tráfego dos SDKs/serviço do SO/navegador no hardware elegível. Código sem APIs de arquivo, flags on-device e testes com mocks não provam o comportamento interno de terceiros.
- Medir referência/impacto e consolidar limites/cobertura na TASK-06; não fechar desempenho com tempos do canvas sintético.
- P01 e TAP original seguem registrados nas tarefas anteriores; não são necessários para as spikes sem escrita, mas impedem presumir pronta a integração futura de edição/origem. Não os resolver implementando persistência nesta PoC.

### c) Limitações conhecidas das tecnologias/recorte da PoC

- OCR de texto geral não garante leitura de sete segmentos, reflexos ou layouts sem rótulos. O parser conservador não é a TASK-09.
- Web Speech local é experimental e depende de navegador/idioma/modelo/políticas. Modelo “downloadable” não é modelo instalado; instalação pode falhar por suporte/política/fornecedor e não justifica fallback remoto.
- Android oferece factory on-device desde API 31; verificação usada de idioma instalado só desde API 33, ou pode ser recusada pelo serviço. pt-BR e ausência de retenção não são propriedades garantidas de todo aparelho.
- Chamadas nativas de OCR podem não ser interrompíveis imediatamente. Resultado é invalidado na hora; o frame só pode ser fechado quando o motor deixar de usá-lo. Serviço travado/cleanup que não termina reprova a habilitação.
- Cancelar download estático de idioma não promete impedir o navegador de continuar preparando o modelo. Isso não mantém captura de áudio ativa nem autoriza persistir conteúdo clínico.
- Assets/modelos estáticos e filesystem virtual WASM são distintos de persistência de mídia no disco. Sem acesso ao dispositivo não é possível certificar todos os buffers internos de SO/browser/SDK.

## 7. Situação individual das tarefas

**TASK-04: aberta, com implementação da PoC e verificação Web sintética realizadas.** Falta comprovação de câmera real/leitura de display e inspeção de recursos/armazenamento/rede em Android/Web. Build nativo bloqueado pelo HTTP 403 de `repo.reactnative.dev`, antes da compilação Kotlin local; não há APK homologado. Não concluir a tarefa apenas pelo bundle/compilação.

**TASK-05: aberta, com adaptadores locais e interface implementados.** A indisponibilidade do pacote pt-BR foi observada e tratada na Web, mas não houve transcrição local real nem teste Android de serviço/idioma/microfone. APIs presentes e testes automatizados não são aceite de voz local.

Não houve salvamento clínico, upload de mídia, alteração das escolhas técnicas ou implantação. As próximas tasks de integração continuam dependentes das evidências reais e das condições da TASK-06.
