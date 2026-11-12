# TASK-07 — registro da depuração e validação inicial em Android

> **Retomada posterior em 11/11/2026:** o PR #64 foi confirmado como mesclado
> (`6f7a249`). A integração funcional, as diferenças frente aos artefatos e as
> novas verificações estão no [registro de integração](task-07-integracao-android.md).
> O conteúdo abaixo preserva a evidência e os limites do arquivamento original.

**Registro documental: 11/11/2026 (UTC).** Projeto Aferi. Fonte principal: mensagens,
logs e capturas apresentados neste chat, mais código e artefatos produzidos nele.
As etapas abaixo estão em ordem de ocorrência; não se atribuem datas a mensagens
que não trouxeram uma data verificável. Horários locais dos prints não foram
convertidos em datas de execução. Este registro não retrodata os testes.

## Resultado e alcance

A captura Android real e o reconhecimento do cartão sintético **SYS 120 / DIA 80 /
PUL 72** chegaram à revisão com os três valores corretos no Samsung S25 FE. A
última captura de tela identifica **`captura-5`, `Nativo: preview-1` e fase
`reviewing`**. Depois de desativar Fast Refresh, o autor informou que a faixa
“Atualizando” não apareceu e que as três repetições orientadas pareceram funcionar.

Isso permite continuar a avaliação no cliente isolado. **TASK-07 permanece
parcial, sem aceite integral.** Não há validação de display de medidor real,
confirmação clínica, persistência, privacidade do SDK/SO ou comportamento de todas
as interrupções. A revisão desse cliente é somente em memória. Captura e OCR são
reais; os dados do cartão são sintéticos; a escrita clínica não está conectada.

Este documento complementa o registro histórico da TASK-07 e o acompanhamento;
não substitui uma auditoria de todas as tarefas nem comprova a entrega de outros
relatórios ou resultados de outras conversas.

## Entrega Git autorizada posteriormente

Após o arquivamento local, o autor autorizou o envio ao Git. A entrega documental
usa a branch **`docs/task-07-validacao-android`**, criada a partir de
`staging`/`d94e5f3c9fe0ad4e048542b47afdb822ff911153`, com PR destinado a `staging`.
A base remota foi obtida em um worktree separado, preservando os arquivos locais.
O aviso histórico já existente em `docs/STATUS_REPORT.md` foi mantido.

Antes do commit documental, na cópia baseada em staging, foram executados e
aprovados `npm run lint`, `npm run typecheck` e Jest completo: **64 suítes / 691
testes**, sem snapshots. Locks e código funcional ficaram inalterados. Essa rodada
valida a entrega documental sobre a base de staging; não aplica nem homologa as
correções arquivadas. Functions e regras não foram reexecutadas localmente nesta
publicação; seus checks remotos fazem parte do fluxo de PR obrigatório.

Esta entrega versiona documentação, cartão sintético e patches como artefatos.
As correções funcionais continuam pendentes de integração/revisão na frente de
código; publicar este arquivo não aplica o patch ao app. Nenhuma caixa de tarefa
é marcada e não há merge ou deploy nesta entrega. Commit/checks remotos e estado
do PR devem ser consultados no GitHub; os dados do arquivamento inicial abaixo
continuam sendo históricos, não uma afirmação de ausência de publicação futura.

## Base Git e limites das fontes

| Local / fonte | Estado verificado no arquivamento inicial |
|---|---|
| Checkout desta sessão | Branch `work`, HEAD `3f8220f7c89831f917081f4abd84c9b9cacb6bef`; sem alterações antes desta documentação |
| Referências locais | Somente `origin/main` disponível; sem referência local `origin/staging` |
| Staging remoto | Consulta somente de leitura pelo conector GitHub: `staging` idêntica a `d94e5f3c9fe0ad4e048542b47afdb822ff911153` |
| Implementação de origem | Arquivos da TASK-07 e dependências em `d94e5f3`, consultados pelo conector; ausentes deste checkout antigo |
| Correções do chat | Preparadas em diretórios temporários, entregues em arquivos/patches; arquivadas neste repositório como evidências, sem aplicação ao código funcional deste checkout |
| Cópia Windows do autor | `C:\dev\aferi-task07`; branch, HEAD, diff completo e hash do APK não fornecidos. Os marcadores visuais confirmam versões do diagnóstico, não identidade integral da fonte |
| Integração remota | Staging consultada não contém os patches do chat. Não se presume que estejam commitados em outra branch ou no computador do autor |

Na etapa inicial do arquivamento não foram feitos checkout, reset, merge, fetch
com atualização de referências, commit, push ou deploy. Alterações locais do autor
não foram acessadas nem sobrescritas.

Referências imutáveis consultadas:

- [Diretrizes do repositório](https://github.com/RamonMenz/bp-tracker/blob/d94e5f3c9fe0ad4e048542b47afdb822ff911153/CLAUDE.md),
  [constituição](https://github.com/RamonMenz/bp-tracker/blob/d94e5f3c9fe0ad4e048542b47afdb822ff911153/constitution.md)
  e [plano de tarefas](https://github.com/RamonMenz/bp-tracker/blob/d94e5f3c9fe0ad4e048542b47afdb822ff911153/tasks.md).
- [TASK-07 original](https://github.com/RamonMenz/bp-tracker/blob/d94e5f3c9fe0ad4e048542b47afdb822ff911153/docs/task-07-captura-android.md),
  [guia de validação/staging](https://github.com/RamonMenz/bp-tracker/blob/d94e5f3c9fe0ad4e048542b47afdb822ff911153/docs/guia-validacao-e-staging.md)
  e [acompanhamento TASK-19](https://github.com/RamonMenz/bp-tracker/blob/d94e5f3c9fe0ad4e048542b47afdb822ff911153/docs/task-19-acompanhamento.md).

O registro de 27/10 que dizia “APK/Kotlin/câmera não verificados” continua correto
para aquela execução. O build Windows e os ensaios aqui descritos são evidência
posterior e limitada ao dispositivo utilizado; não alteram retroativamente o
acompanhamento nem encerram suas demais pendências.

## Ambiente observado

| Item | Informação e qualidade da evidência |
|---|---|
| Computador | Windows + PowerShell; edição/versão do Windows não informadas |
| Telefone | Samsung S25 FE informado pelo autor; ADB identificou `SM_S731B` |
| Android / API do telefone | Não informados; `minSdk`/`targetSdk` do build não identificam o Android instalado |
| USB | Inicialmente sem cabo; cabo obtido; dispositivo posteriormente listado pelo ADB como `device` |
| Pasta operacional | `C:\dev\aferi-task07\demos\android-capture`, fora de OneDrive e sem acentos no caminho |
| Pacote de avaliação | `com.ramonmenz.afericapturetest`, conforme configuração versionada da demo |
| Expo | Terminal informou 57.0.8 e sugeriu `~57.0.32`; atualização não comprovada nem necessária para a correção |
| Toolchain Gradle | Gradle 9.3.1; Kotlin 2.1.20; KSP 2.1.20-2.0.1, conforme log |
| SDK solicitado | Build Tools 36.0.0, compile/target SDK 36, min SDK 24, NDK 27.1.12297006 |
| Downloads do primeiro build | NDK 27.1.12297006, Platform 36 revision 2 e Build Tools 35.0.0 instalados; a solicitação de 35 por outra etapa não equivale a mudança manual do SDK 36 |
| Captura e OCR | CameraX 1.5.1 e ML Kit latino embarcado 16.0.1 declarados no módulo; `aferi-photo-capture` 0.1.0 aparece no build |
| JDK / Node / npm no Windows | Versões exatas não fornecidas. Não confundir com versões do ambiente isolado dos testes do Codex |
| Metro | Porta 8097; acesso por Dev Client e QR Code na rede local; não foi comprovado ensaio offline |
| Estado final para ensaios | Cabeçalho `captura-5`, módulo `preview-1`, Fast Refresh desativado |

O primeiro build bem-sucedido levou **31 min 27 s**, com 537 tarefas Gradle
(406 executadas, 99 do cache, 32 atualizadas). Outro log anexado mostrou build
incremental bem-sucedido em **11 s** (19 executadas, 518 atualizadas). São durações
dos comandos; não representam esforço de trabalho, latência do OCR ou benchmark.

## Histórico de problemas e tratamento

| Etapa | Sintoma / evidência | Diagnóstico e tratamento | Resultado / limite |
|---|---|---|---|
| 1. Preparação | Autor preparou PC/celular, copiou projeto e instalou dependências; inicialmente faltava cabo | Fluxo Windows com Android físico, cabo de dados e depuração USB | Preparação relatada; não há inventário completo do PC |
| 2. Dispositivo ausente | Expo: `No Android connected device found`; ADB com lista vazia | Verificar cabo de dados, porta USB, autorização e depuração; usar ADB do SDK instalado | ADB passou a listar `SM_S731B` como `device`; causa física exata inicial não demonstrada |
| 3. Pasta errada: raiz | Execução Expo na raiz cobrou `EXPO_PUBLIC_FIREBASE_API_KEY` | A raiz inicializa a configuração do produto; usar `demos/android-capture` para o cliente isolado | Fluxo prosseguiu na demo; não preencher credenciais de produção para resolver esse erro |
| 4. Caminho com acento | Plugin React Native não encontrado em caminho com `Ciência` corrompido pela codificação | Transferir cópia operacional para `C:\dev\aferi-task07` | O erro deixou de aparecer no build subsequente; não se demonstrou que OneDrive isoladamente o causava |
| 5. SDK não localizado | `SDK location not found` | Apontar `ANDROID_HOME` para o SDK existente; `android/local.properties` é alternativa local | Gradle encontrou SDK, aceitou licenças e instalou componentes; não versionar caminhos locais |
| 6. Build versus ADB | `BUILD SUCCESSFUL`, seguido de `device … not found`; outro log com `Error: closed` no `adb ... am start` | Separar compilação/instalação de abertura do Dev Client; reconectar/verificar ADB e reiniciar só Metro quando apropriado | APK compilado não implica sessão USB estável. Falha de abertura não é falha de OCR |
| 7. Pasta errada: perfil | `npx --no-install` executado fora do projeto tentou resolver Expo 58.0.23 e foi cancelado | Voltar à pasta da demo para usar o Expo instalado pelo projeto | Não houve evidência de instalação/migração para SDK 58 |
| 8. Tela cinza | Metro empacotava `index.tsx`, mas UI vazia | Faixa com estilos inline e diagnóstico de JS/SafeArea separou inicialização e estilo; NativeWind não encontrava config local da demo | Criada config Tailwind local que reutiliza a da revisão; conteúdo passou a aparecer |
| 9. Botão sem avanço | Iniciar parecia não fazer nada após ciclos de recarga | Sessão criada em estado podia ficar descartada após cleanup/setup de efeito; criar sessão por efeito e aguardar liberação da anterior | Correção e regressões isoladas; abertura no aparelho ainda dependia de resolver permissão |
| 10. Permissão e background | Diagnóstico `captura-2`: permissão solicitada → `app:background` → cancelamento → concessão tardia | Diálogo/fluxo nativo interrompia a tentativa. Consultar `PermissionsAndroid.check` antes de pedir uma permissão já concedida | `captura-3` mostrou `ja-concedida-sem-dialogo`; cancelamento por background foi mantido |
| 11. Quadro recusado | `captura-3`: ready → recognizing → `frame-failed`; nenhuma revisão | Falha anterior ao OCR. Resolução alvo era preferência; conversor tinha teto rígido. Filtrar resoluções pelo mesmo teto e projetar metadados técnicos limitados | Primeiro sucesso com `captura-4`/`frame-1`. Não há dimensões do quadro que falhou para provar a causa específica |
| 12. Preview preto | `captura-4` marcava ready com quadrado preto; reload permitia imagem | Modo COMPATIBLE sozinho não resolveu. Habilitar layout Android do Expo; aguardar STREAMING antes de emitir ready | `captura-5`/`preview-1` mostrou imagem e revisão correta; repetição posterior relatada sem falhas |
| 13. “Atualizando” | Recarga alguns segundos depois de iniciar; terminal também mostrara Bundled/Opening | Fast Refresh é hipótese apoiada pelo código do React Native; desativado pelo menu de desenvolvimento | Autor relatou ausência da faixa depois. Arquivo/evento exato que disparava atualização não identificado |
| 14. Repetição | Orientadas três tentativas sem reload; autor respondeu “parece que deu tudo certo” | Registrar como relato de repetibilidade no mesmo ambiente/cartão | Sem registro individual, tempos ou inspeção instrumental; não converter em taxa estatística de acurácia |

### Avisos que não impediram o build

- Aviso de SDK XML versão 4 versus ferramenta que entende até 3: desalinhamento
  de ferramentas; o build subsequente concluiu. Atualizar ferramentas pode ser
  manutenção futura, sem trocar dependências durante o ensaio sem necessidade.
- Recursos Gradle depreciados/incompatibilidade futura com Gradle 10 e
  `Configuration on demand is an incubating feature`: avisos, sem falha no build
  apresentado; não houve migração para Gradle 10.
- Aplicação dos plugins Expo e listagem de módulos são mensagens de configuração.
  A presença de `expo-file-system` na lista não prova que a captura grave arquivos;
  sua ausência de uso no código também não prova privacidade interna no aparelho.
- `Android Bundled …` e `Opening exp+…` registram empacotamento/abertura do cliente.
  Não bastam para concluir crash, envio remoto de imagem ou falha de reconhecimento.

## Mudanças técnicas preservadas

1. **Abertura e estilos:** entrada diagnóstica com `View`/`Text` inline,
   `SafeAreaProvider` e `initialWindowMetrics`; configuração Tailwind no diretório
   da demo. O experimento do NativeWind 4.2.6 mostrou que `configPath` do wrapper
   não supria a descoberta da configuração pelo processo filho do CLI. Gerar CSS
   com `.flex-1` foi verificado no experimento; o aparelho confirmou a UI visível.
2. **Ciclo de vida:** uma sessão por setup de efeito; cleanup descarta a antiga;
   barreira de liberação impede reutilizar recursos ocupados, inclusive em vários
   reinícios de efeito. Início somente com app ativo e gesto explícito. Voltar do
   background não inicia captura automaticamente.
3. **Diagnóstico limitado:** últimos 18 eventos de controle em memória, sem logger
   clínico; estados/status são filtrados. Metadados de falha do frame incluem
   somente códigos, dimensões, formato, rotação e parâmetros dos planos validados,
   sem bytes, OCR bruto, candidatos ou exceção arbitrária do SDK.
4. **Permissão:** verificar o aceite atual sem diálogo; solicitar somente quando
   necessário. Não cachear consentimento nem ignorar revogação. Se o primeiro
   diálogo causar background, a tentativa pode ser cancelada; depois do aceite,
   um novo toque explícito inicia outra tentativa. Não enfraquecer esse guardrail.
5. **Quadro em memória:** `FrameBytes.acceptsDimensions` centraliza dimensões pares
   e teto de **1.920.000 pixels**; `ResolutionSelector` filtra por essa política,
   com preferência 1280×960. Não elevar o teto, gravar arquivo ou usar serviço
   remoto para contornar falhas. Cópia YUV→NV21 e processamento permanecem em RAM
   pelo caminho inspecionado, com fechamento do `ImageProxy`.
6. **Preview:** `PreviewView.ImplementationMode.COMPATIBLE` e
   `shouldUseAndroidLayout = true`; retirado layout manual que não garantia nova
   medição dos filhos. Observar `previewStreamState`: emitir `ready` após
   `STREAMING`. Captura nativa também exige preview pronto; observador é removido
   no fechamento. Checagens de geração/atividade preservam o descarte tardio.
7. **Versões visíveis:** diagnóstico de abertura → `captura-2` → `captura-3` →
   `captura-4`/`frame-1` → `captura-5`/`preview-1`. São marcadores de depuração, não
   tags Git, versões de release ou hashes de APK. Formato dos metadados de quadro
   continua `frame-1`, mesmo com módulo `preview-1`.
8. **Condição do ensaio:** Fast Refresh desativado no dispositivo pelo menu. Isso
   reduz interferência de atualizações do JS durante a avaliação; não substitui
   testes de lifecycle nem comprova o gatilho exato da faixa anterior.

APIs conferidas nos fontes das versões utilizadas: Expo Modules Core **57.0.7**
(`shouldUseAndroidLayout`/`requestLayout`) e CameraX View **1.5.1** (em COMPATIBLE,
`STREAMING` é o sinal documentado de preview visível). A revisão de APIs não
equivale a compilação nativa no ambiente do Codex.

## Evidências do aparelho

| Referência do chat | O que sustenta | Limite |
|---|---|---|
| `print.jpeg` | Tela cinza com controle de desenvolvimento visível | Sem stack trace; não identifica causa |
| `print_1.jpeg` | JS iniciou; medidas disponíveis; conteúdo da área segura montado | Montagem React não comprova dimensões/estilos corretos de toda a tela |
| `print_2.jpeg`–`print_5.jpeg` | UI passou a renderizar; diálogo de câmera; estados desligada/cancelada | Sequência descrita pelo autor; não prova liberação instrumental |
| `print_6.jpeg` / `print_7.jpeg` | `captura-2`, fase idle/cancelled; background durante permissão | Sustenta investigação de ciclo de permissão, não falha de OCR |
| `captura_3_1.jpeg`–`captura_3_3.jpeg` | Idle, ready com preview preto e `frame-failed` após captura | Nenhuma leitura de números comprovada nessa versão |
| `captura_4_1.jpeg`–`captura_4_5.jpeg` | `frame-1`; preview preto ainda ocorreu; preview visível e revisão com 120/80/72 após reload | Um percurso positivo; não resolve estabilidade por si só |
| `captura_5.jpeg` | `captura-5`, `preview-1`, reviewing e candidatos 120/80/72 | Não mostra confirmação nem prova de escrita/ausência de escrita |
| Relato após desativar Fast Refresh | “Atualizando” não apareceu | Não identifica arquivo que causava a atualização |
| Último relato do autor | Três tentativas orientadas pareceram funcionar | Relato agregado; sem capturas separadas, cronômetro ou matriz de condições |

Os JPEGs foram vistos no chat, mas seus arquivos binários não estavam disponíveis
no filesystem desta sessão. Seus caminhos Windows não são arquivos acessíveis ao
Codex. Por isso, o repositório preserva referências e transcrição dos achados,
sem fabricar cópias das telas. O texto de terminal anexado estava disponível e
teve seus trechos relevantes sanitizados. Não foram arquivados serial do aparelho,
QR Code, IP da LAN, nome da conta Windows ou logs completos.

## Verificações automatizadas e limites

| Etapa | Verificação executada | Resultado e alcance |
|---|---|---|
| Ciclo/permissão | Jest focado de sessão, hook e adaptador | 30 testes aprovados ao final dessa etapa; SDK/estado do app simulados |
| `frame-1` | Jest focado incluindo projeção de metadados | 43 testes em 4 suítes aprovados |
| `preview-1` | Mesmas frentes, com identificação do módulo atualizado | 44 testes em 4 suítes aprovados |
| Java independente | Buffers sintéticos + política de dimensões | 8 checks de buffer e 11 de dimensões aprovados; não executa câmera/ML Kit |
| Transformação Android | Babel/Expo/NativeWind sobre arquivos alterados | 5 fontes na etapa do frame; 3 na etapa do preview; não é typecheck ou build APK |
| Patches incrementais | Check/aplicação/conteúdo/reversão em cópias temporárias LF e CRLF | Etapas de frame/preview verificadas; sem alterar o checkout de produto |
| Arquivamento atual | Replay dos cinco patches sobre fontes imutáveis, após entrada/config diagnósticas; patch consolidado em LF/CRLF | Replay idêntico aos 15 arquivos finais preparados; consolidado aplica e reverte em cópias temporárias |

**Os totais 30/43/44 se sobrepõem; não somar.** Os testes Jest usaram um ambiente
temporário isolado, com preset React Native, aliases e dependências controladas;
portas de Firebase/writer não foram executadas. Cobrem cancelamento, resultados
tardios, liberação aguardada/falha, reinício de efeito, permissão e projeção segura
dos diagnósticos. Não comprovam layout Android ou tráfego/armazenamento do SO.

Na etapa inicial de depuração/arquivamento não foram repetidos suíte completa de
staging, lint/typecheck globais, regras, Functions ou regressão do legado. Os 691
testes citados no acompanhamento antigo pertencem àquela entrega; a nova rodada
para publicação documental está identificada separadamente na seção de entrega Git. O APK foi compilado no Windows do autor; o Codex não
dispunha de SDK/dispositivo para compilar/executar a parte nativa neste ambiente.

## Artefatos e reprodução

- [Índice e integridade dos artefatos](evidencias/task-07-android-2026-11-11/README.md).
- [Roteiro Windows/Android e solução dos erros conhecidos](task-07-roteiro-windows-android.md).
- [Trechos sanitizados de terminal](evidencias/task-07-android-2026-11-11/terminal-sanitizado.md).
- [Cartão sintético original](evidencias/task-07-android-2026-11-11/cartao-sintetico-sys120-dia80-pul72.png).

Foi preservado o histórico de cinco patches e dois arquivos iniciais. Também foi
gerado um **patch consolidado**, ancorado em `d94e5f3`, para futura integração pelo
Codex. Ele contém o estado final completo da correção, incluindo testes e
diagnóstico, e não deve ser somado aos patches já aplicados no Windows.

O cartão foi gerado para este ensaio; não foi capturado pela câmera de um usuário
nem contém amostra clínica. Guardá-lo como fixture acadêmica é diferente de
persistir imagens capturadas durante o uso do app. Não representa corpus de
displays reais ou amostras coletadas da TASK-16.

## Pendências antes de encerrar a validação

| Frente | Pendência / responsável | Critério de resolução |
|---|---|---|
| Integração Git | Codex: portar/revisar correções na frente correta, confrontar diff Windows e executar checks do repositório; envio só sob autorização | Fonte final identificada por commit e checks pertinentes; testes/diagnóstico temporário revisados, sem habilitação clínica implícita |
| Rastreabilidade | Autor com apoio do Codex: modelo/Android/API, versões Windows/JDK/Node/npm, branch/HEAD/diff e identidade do APK | Registro sanitizado e reproduzível, sem credenciais ou serial |
| Cancelamento | Autor executa no dispositivo; Codex prepara protocolo e corrige falhas | Cancelar em permissão, abertura, preview e reconhecimento sem restaurar candidatos; nova tentativa só após liberação |
| Interrupções | Autor: Home, troca de app, bloqueio e rotação nas etapas; Codex analisa/corrige | Voltar não reinicia nem restaura tentativa antiga; câmera/liberação verificadas |
| Concorrência | Autor: toques repetidos, recaptura e saída/entrada rápida; Codex corrige | Uma tentativa/reconhecimento; resultado antigo descartado; cleanup falho bloqueia |
| Revisão | Autor: editar, validar, cancelar e confirmar apenas em memória | Valores e validações corretos; confirmação explícita; nenhuma escrita/fila clínica no cliente isolado |
| Permissões negativas | Autor: negar/revogar e tentar novamente por gesto | Sem acesso indevido, loop de solicitação ou fallback remoto; saída segura |
| Privacidade/localidade | Codex prepara inspeção; autor executa no dispositivo | Inventários seguros antes/depois, inferência sem rede após carregar assets, observação de reconexão e rede por UID; alcance e limitações documentados |
| Amostras/ambiguidade | Codex prepara fixtures; autor testa cartões adicionais e depois displays próprios rotulados | Ausências/ambiguidade explícitas; sem inventar valores. Dispositivos/corpus reais separados da fixture |
| Integração clínica | Codex: contexto/autenticação/consentimento/epoch, tipos/schemas/rules e writer em homologação; autor fornece acessos/dispositivos quando necessário | Aceite em Firebase de homologação identificado, confirmação anterior a qualquer escrita/fila e troca de conta segura |
| Legado/acessibilidade | Codex executa verificações de software; autor complementa no aparelho | Manual/auth/edição/histórico preservados, TalkBack/fonte/tema e referência de desempenho observados |

Próximo ensaio funcional recomendado: **cancelamento e interrupções**, com a
versão atual e Fast Refresh desativado. A coleta de nova evidência deve continuar
em registro datado, sem marcar os cenários ainda não executados como aprovados.

## Planejamento, governança e guardrails preservados

- Os marcos do TAP continuam: comparação 10/11, PDF/redação 24/11, avaliação 08/12
  e conclusão 15/12/2026. Ao registrar em 11/11, o marco de comparação já passou;
  este ensaio não comprova comparação entregue em 10/11 nem autoriza prorrogação.
- Não houve comparação ML Kit × Tesseract, medição de acurácia, p50/p95,
  memória/bateria, esforço real ou custos. Três repetições do mesmo cartão não
  substituem corpus comum rotulado nem comparação acadêmica.
- Horas realizadas e despesas/saldos permanecem **não informados**. Cabo obtido
  não informa preço/forma de aquisição. Não se convertem durações de build em
  horas de trabalho nem se presume saldo integral ou custo total zero.
- Mantidos teto global de R$300, reconhecimento local escolhido, processamento
  em memória, ausência de logs clínicos, confirmação explícita e legado disponível.
  O diagnóstico documenta a intenção/caminho inspecionado; a conformidade efetiva
  de SDK/SO ainda depende de inspeção.
- Não foram usados Firebase/serviços de produção, implantadas regras, acessados
  dados clínicos ou contratados serviços pagos. Vercel/staging de código não
  comprovam Firebase de homologação. Nenhuma nova aprovação de orientadora,
  coleta consentida de terceiros ou mudança de stack foi presumida.

## Como retomar em outra sessão

1. Ler este registro, o roteiro e o manifesto; usar as referências imutáveis para
   recuperar a base se o checkout ainda for antigo.
2. Conferir Git/diff real antes de aplicar qualquer correção. A cópia do autor já
   exibe `preview-1`; não reaplicar o consolidado sobre ela.
3. Preservar o sucesso sintético como evidência parcial e a desativação de Fast
   Refresh como condição do ensaio. Não remover cancelamentos para evitar recargas.
4. Preparar/executar os cenários pendentes, registrar resultado e evidência segura.
   Programação e integração cabem ao Codex; o autor fornece observação física e
   configurações/acessos que dependem do seu equipamento.
5. Só atualizar aceite, branches remotas e implantação quando houver evidência e
   autorização correspondentes. O arquivamento inicial foi local; a autorização
   posterior de publicação documental está registrada na seção de entrega Git.
