# TASK-07 / TASK-10 / TASK-18 — ciclo de vida Android no Samsung

Preparação em 24/11/2026. Documento de condução e resultados incrementais;
não conclui nenhuma das três tarefas. Aplicam-se a [constituição](../constitution.md),
a [spec fotografia](../specs/spec-fotografia.md) (FOT-02/07/08/10/16), o
[roteiro S01–S09](task-07-integracao-android.md) e os
[resultados históricos](task-07-resultados-samsung.md). Somente cartão sintético
SYS 120 / DIA 80 / PUL 72, Fast Refresh desligado e demo sem writer/Firebase.
Não há confirmação clínica, fila ou inspeção de produção nesta rodada.

## Versão e presença das correções

| Camada | Identidade / alcance |
|---|---|
| Staging remoto consultado | a3b996a67173ed2ca5311f0b10bd82eb232ab35c, PR #71 mesclado |
| Branch desta matriz e testes | test/task-07-ciclo-vida-samsung, baseada nessa staging; só testes/documentação |
| Fonte física escolhida | Cópia TalkBack f057283876ea2126b485abd762e2886012b4c7ca; estado limpo no terminal enviado pelo autor |
| Momento do retorno | Autor informou Metro desligado e transcreveu terminal de mais cedo em 24/11; não é nova execução dos cenários |
| APK base instalado consultado nesse terminal | SHA-256 69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c |
| Arquivo bundle no sandbox consultado nesse terminal | SHA-256 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 |
| Marcadores a conferir ao carregar | captura-5 / preview-1, explicação acessível da confirmação; não identificam sozinhos o JS inteiro |
| Pacote / aparelho | com.ramonmenz.afericapturetest; modelo SM-S731B reconfirmado por getprop no retorno G1; Samsung S25 FE informado historicamente |
| PR #72 | Aberto, fonte efca9b0ae24aacaac37d24be043434468954a377; associacao-1 não integra staging nem a cópia f057283 escolhida |

Comparação de fontes executada: f057283 → a3b996a não apresenta diferenças em
native-modules/aferi-photo-capture, android-photo-session.ts, capture-attempt.ts,
photo-android.native.ts, useAndroidPhotoReview.ts, useCandidateReview.ts,
AndroidPhotoCaptureScreen.tsx e CandidateReadingReview.tsx. São fontes executáveis,
não os patches em docs/evidencias. A correção de sessão por efeito/barreira,
consulta de permissão por tentativa, preview STREAMING e lease nativo já estão
nessa versão. Os novos testes desta branch exercitam esse mesmo código.

A proposta inicial de carregar efca9b0 foi substituída pela manutenção da cópia
funcional f057283 após o retorno do autor e a comparação acima. O diagnóstico
do #72 não é necessário para observar ciclo de vida. Não mesclar esse PR,
reaplicar patches, reinstalar APK ou trocar SDK por rotina.

Hashes coincidentes identificam os arquivos consultados. Não provam todo o
build, código efetivamente em execução ou ausência de persistência. Antes de
capturar, fechar G0: confirmar se houve mudança/reinstalação depois do terminal,
HEAD/status atual, Metro da pasta certa, marcadores e Fast Refresh desligado.
Um novo bundle/novo APK exige nova identificação; não atribuir hash esperado.

## Regras de execução e aprovação

- **Parar imediatamente** se câmera permanecer ativa após cancelamento/saída,
  surgir concorrência, resource-busy inesperado, blocked ou cleanup-failed.
  Não iniciar/capturar/recapturar, recarregar JS, forçar ACK ou reinstalar para
  contornar. Registrar fase/código e preview/indicador; sair da demo. Se o
  indicador continuar, encerrar somente o cliente de teste pelas configurações
  do Android e não reiniciar testes até análise. Não limpar dados.
- Cada caso termina cancelado, câmera desligada e sem revisão antiga. Não
  confirmar valores. Um único novo gesto de início é permitido apenas quando
  não há closing/blocked/falha e preview/indicador já encerraram.
- Permanência do indicador verde sozinha é ambígua: o Android pode mostrar uso
  recente. Registrar se a indicação é de uso atual ou recente e conferir o
  preview; na dúvida, interromper. Não inferir liberação de RAM/recognizer pela UI.
- Esperar sem toque por uma janela proposta de aproximadamente 5 s após cada
  retorno/cancelamento para observar retomada indevida; informar intervalo
  efetivamente observado ou aproximado. Não é timeout de aceite medido do SDK.
- Máximo de uma tentativa dirigida por caso rápido. Se a fase não foi alcançada
  ou não se sabe se a ação a atingiu, **não executado**, com motivo. Um registro
  de recognizing no histórico não prova que o cancelamento ocorreu durante OCR.
- Aprovação física exige identidade G0, precondição observada, ação na fase
  pretendida e todo resultado esperado, sem falha de segurança. Se faltar
  evidência, manter não executado/inconclusivo, com alcance observado descrito.
  A UI sem erro não comprova exclusão nativa, nem dupla Promise comprova
  concorrência física. Relato histórico e rodada atual permanecem separados.

## Matriz de cenários físicos

P0 = G0 fechado, demo ativa, câmera desligada, nenhum candidato, permissão já
concedida, sem outra câmera aberta. P1 = P0, mas câmera negada nas configurações
**somente do cliente de teste**, sem limpar dados; isso pode reiniciar o processo,
exigindo reconferir G0. Cada aprovação também exige as regras comuns acima.
Os grupos são preparados aqui, mas liberados um por vez após análise do anterior.

| ID / grupo | Preparação | Passos no Samsung | Resultado esperado | Evidência segura / critério de aprovação específico |
|---|---|---|---|---|
| L01 / G3 — cancelar permissão | P1; diálogo acessível | Iniciar; observar permission; cancelar na UI se alcançável ou usar Home com diálogo pendente; voltar | Não abre câmera nem revisão; retorno não retoma | Fase antes da ação, ação efetiva, app:background se observado, fase final, câmera. Aprovar cancelamento por background só se esse evento ocorrer; cancelamento por botão é variante distinta |
| L02 / G3 — cancelar abertura | P0; Cancelar visível | Iniciar; tocar Cancelar enquanto opening | Encerra sem ready/revisão tardios; novo início só após liberação | Opening realmente visível durante o toque, fase final, câmera, eventual ready tardio. Ready antes do toque = não executado para opening |
| L03 / G1 — cancelar preview | P0 | Iniciar; esperar ready/preview; Cancelar; observar sem novo toque | Preview encerra, indicador deixa de indicar uso ativo, sem revisão/retomada | Ready → ação → fase final e câmera. Aprovar somente esse percurso, sem extrapolar para OCR |
| L04 / G3 — cancelar reconhecimento | P0, cartão enquadrado | Iniciar; Capturar; Cancelar durante recognizing, uma tentativa | Resultado descartado, fechamento respeitado, nenhuma revisão tardia | Fase efetiva do toque, final e câmera. Reviewing já presente = não executado para OCR; não tentar induzir lentidão com mídia diferente |
| L05 / G3 — concessão tardia | P1; mesma solicitação de permissão pendente de L01 | Após cancelamento comprovado, conceder **aquela mesma solicitação**, se o SO ainda a permitir; retornar sem Iniciar | Concessão não reabre câmera; só gesto futuro depois de liberação pode iniciar | Cancelamento antes da concessão, mesmo diálogo/solicitação, nenhuma retomada. Autorizar depois em Configurações é outro caso, não prova concessão tardia da Promise |
| L06a/b / G2 — Home | P0; (a) ready, (b) revisão sintética, se caso liberado | Home; voltar por Recentes; observar sem toque | Background abandona tentativa/revisão; nada reabre; edição anterior não retorna | Fase e ação, final, campos antigos ausentes, câmera e reinício percebido. Julgar a/b separadamente |
| L07a/b / G2 — troca de app | P0; (a) ready, (b) revisão sintética | Abrir app neutro via Recentes, sem câmera/dados; retornar | Descarte e ausência de retomada automática | Mesmos itens de L06, sem nomes/conteúdo do outro app. Não comprova dupla câmera ou pausa durante OCR |
| L08a/b / G2 — bloqueio | P0; (a) ready, (b) revisão sintética | Botão de bloquear; desbloquear normalmente; voltar | Captura encerrada/revisão descartada, sem retomar | Fase, indicação de uso atual, final e descarte; não compartilhar código/PIN ou tela de bloqueio |
| L09a/b / G2 — rotação | P0; rotação habilitada; (a) ready, (b) revisão sintética | Girar uma vez e voltar | Se apenas relayout: preview/campos utilizáveis, sem captura/confirmação automáticas. Se houver interrupção/recriação: abandona e não retoma | Distinguir relayout, evento de app e reinício observado; não inferir Activity recriada por girar. Aprovar somente a variante observada, recriação fica não executada se não ocorreu |
| L10 / G4 — sair e voltar rápido | P0 em ready; retorno conhecido ao cliente | Voltar Android uma vez; reabrir rapidamente por Recentes/ícone, sem recarga manual | Nenhuma revisão/câmera antiga; reabertura só por gesto após recursos liberados | Destino do Voltar, fase/preview no retorno, se houve reinício. Se só abriu menu/launcher ou houve apenas background, não declarar desmontagem da tela; demo não tem rota interna de saída |
| L11 / G1 — Iniciar repetido | P0 | Três toques rápidos em Iniciar; não capturar; Cancelar após ready | Uma abertura observável, botão bloqueado enquanto ocupado, nenhum OCR | Fases, eventos de início disponíveis e preview único. Botão disabled pode impedir callback; não exigir três eventos. Sem instrumentação, não comprova contagem interna de câmeras |
| L12 / G4 — Capturar repetido | P0 em ready com cartão | Três toques rápidos em Capturar; não confirmar; Cancelar revisão | Uma captura/revisão observável; não há revisões sucessivas ou restauração após cancelar | Quantidade de revisões percebida, fases e descarte; sem contagem interna comprovada, registrar esse limite |
| L13 / G4 — Recapturar repetido | P0 com revisão sintética | Editar SYS para o sintético 130; três toques em Tirar outra fotografia; não tocar Capturar até ready; cancelar | Revisão/edição antiga descartadas; uma nova abertura observável, sem OCR automático | Edição antiga ausente, fase, preview e início. Não alegar duplicidade interna apenas porque não houve erro |
| L14 / G5 — resultado antigo | P0; L04 atingiu recognizing e liberação foi observada sem falha | Cancelar A; aguardar liberação; iniciar B somente por novo gesto; observar eventual conclusão de A | A nunca cria/restaura revisão ou encerra B | Só aprovar resposta tardia real se a conclusão de A for distinguível sem logs clínicos. Sem observação dessa conclusão, não executado; não inferir pelo cartão idêntico nas duas tentativas |
| L15 / G4 — reabrir durante fechamento | P0; closing naturalmente observável | Cancelar; durante closing tentar Iniciar uma vez; após liberação, novo gesto | Primeiro gesto não abre; fim de closing não abre sozinho; segundo gesto pode abrir | Closing no instante do gesto, botão bloqueado/eventos, câmera/fase. Se closing não foi observável, parte da barreira fica não executada; ACK por si só não prova hardware liberado |
| L16 / G5 — cleanup falho | Somente se falha surgir espontaneamente; não provocar câmera presa | Ao ver blocked/cleanup-failed, parar capturas e registrar; não forçar nova tentativa | Reutilização impedida e controles de início/captura/recaptura bloqueados | Código/fase e estado visual dos botões, câmera ativa? Não pressionar bypass. Sem falha espontânea, não executado em hardware; falha é reprovação do fluxo normal, bloqueio correto é resultado separado |

## Testes controlados e instrumentação

| Camada | O que foi/será observado | O que não comprova |
|---|---|---|
| Inspeção de código | Tentativas/AbortController, IDs, BUSY/closing/blocked, descarte após await; nativo generation/PhotoLease/close no completion | Execução do SDK/SO, exclusão física ou tempo real de liberação |
| Jest com portas e Promises controladas | Permissão/abertura/preview/OCR cancelados, status/saída tardios, rajadas, ACK pendente/false/rejeitado/timeout; reinício de efeitos | Permissão Android, CameraX/ML Kit real, ACK físico, recriação real da Activity |
| Painel em memória | Até 18 códigos de controle existentes; fases/app/status conhecidos, sem texto/valores OCR | Traço completo, número interno de operações, eventos já removidos do ring buffer |
| Samsung | Preview/indicador, ações reais, retorno da UI e códigos disponíveis | Ausência universal de temporários/telemetria, RAM sobrescrita, persistência clínica ou isolamento de contas conectado |

Sem atraso artificial, falha de cleanup injetada ou API de debug nova no APK.
Fast Refresh continua desligado: o harness Jest de cleanup/setup não autoriza
usá-lo como teste físico de navegação. ACK true de double é exclusivamente
resultado de lógica JS. A chamada close do nativo, por inspeção, espera completion
quando processing; ainda assim seu ACK não substitui inspeção física/SDK.

## Resultados desta rodada

V0 = fonte f057283 e hashes da tabela, **reconfirmados no retorno G0 abaixo**.
Modelo atual SM-S731B reconfirmado por getprop no retorno G1 abaixo.
NE = não executado nesta rodada. Não copiar aprovações de A–K/R1/R2 para V0.
Retornos devem ganhar fonte/hash/condições por grupo; data de registro não será
tratada como data/hora de execução quando esta não for informada.

| Caso | Estado físico atual | Evidência / limitação | Versão |
|---|---|---|---|
| G0 — versão/carregamento | Passou no alcance relatado | HEAD limpo, APK e bundle reconfirmados; Metro/demo/idle/Fast Refresh verificados. Modelo complementado em G1 | V0 |
| L01 | NE | Diálogo pode impedir acesso ao Cancelar; background é variante distinta | V0 |
| L02 | Passou no alcance relatado | Autor identificou opening no instante de Cancelar; final cancelled, câmera/preview encerrados, sem revisão/retomada por aproximadamente 5 s | V0 |
| L03 | Passou no alcance relatado | preview-1/ready, cancelamento → cancelled; preview/uso ativo encerrados, sem revisão/retomada por aproximadamente 5 s | V0 |
| L04 | Passou no alcance relatado | Autor identificou recognizing no instante de Cancelar; final cancelled, câmera/preview encerrados, sem revisão/retomada por aproximadamente 5 s. Não identifica completion interno do SDK | V0 |
| L05 | NE | Exige concessão da mesma solicitação depois do cancelamento | V0 |
| L06a / L06b | Passou / Passou no alcance relatado | Preview: resultado anterior preservado. Revisão: cartão 120/80/72, câmera já encerrada, edição 130 sem confirmar; retorno cancelled e campos ausentes, sem retomada por aproximadamente 5 s | V0 |
| L07a / L07b | Ambos passaram no alcance relatado | Preview: resultado anterior preservado. Revisão: edição 130 sem confirmar, retorno cancelled com mensagem de cancelamento, sem retomada por aproximadamente 5 s | V0 |
| L08a / L08b | Passou / Passou no alcance relatado | Preview: resultado anterior preservado. Revisão: cartão 120/80/72, câmera já encerrada, edição 130 sem confirmar; retorno cancelled e campos ausentes, sem retomada por aproximadamente 5 s | V0 |
| L09a / L09b | Ambos passaram para relayout | Preview: resultado anterior preservado. Revisão: reviewing/edição 130 preservados, câmera desligada, sem captura/confirmação automáticas; campos descartados ao cancelar. Recriação real continua NE | V0 |
| L10 | Passou no alcance relatado | Voltar levou à tela inicial; retorno por Recentes em idle/nao-carregado, câmera/preview desligados e sem campos/retomada por aproximadamente 5 s. Destruição da Activity/processo não demonstrada | V0 |
| L11 | Passou no alcance relatado | Uma abertura percebida, Iniciar desabilitado enquanto ocupado; cancelamento → cancelled e câmera encerrada; sem revisão/retomada por aproximadamente 5 s. Contagem nativa não demonstrada | V0 |
| L12 | Passou no alcance relatado | Uma revisão correta; botão desabilitou após primeiro toque; câmera encerrada e cancelled, sem reaparecimento por aproximadamente 5 s. Cliques adicionais não foram aceitos | V0 |
| L13 | Passou no alcance relatado, após esclarecimento | Edição sumiu ao recapturar, uma abertura sem OCR automático e cancelled com câmera encerrada; autor corrigiu o sim inicial: leu desapareceu e confirmou que revisão/edição NÃO reapareceram | V0 |
| L14 | NE | Tardio precisa ser distinguível, senão só teste controlado | V0 |
| L15 | Passou para bloqueio observável na UI | closing no gesto, Iniciar desabilitado, nenhuma abertura; final cancelled/câmera encerrada, sem novo toque por aproximadamente 5 s. ACK/exclusão/liberação física não comprovados | V0 |
| L16 | NE | Não induzir falha no Samsung; parada obrigatória se ocorrer | V0 |

### Retorno G0 — versão e carregamento confirmados

Fonte: relato e comandos transcritos pelo autor nesta rodada. Data/hora da
execução não informadas; não atribuir horário do terminal/registro ao ensaio.
HEAD f057283876ea2126b485abd762e2886012b4c7ca e git status sem saída. Metro
iniciado na cópia TalkBack/demos/android-capture, --dev-client --localhost,
porta 8097, preservando NODE_OPTIONS e acrescentando a opção IPv4 orientada.

| Verificação | Retorno / análise |
|---|---|
| SDK/ADB | Test-Path True; reverse tcp:8097 sem erro transcrito |
| Status no computador | Content enumerou bytes decimais que decodificam exatamente packager-status:running |
| Status no Samsung / demo | Ambos funcionaram segundo o autor |
| UI inicial | captura-5, idle, Nativo nao-carregado; sem preview/câmera ativos ou revisão/valores antigos |
| Fast Refresh | Autor confirmou desligado |
| Bundle após carregar | 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388, igual ao hash anterior |
| APK base, complemento solicitado | 69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c, igual ao anterior |
| Alterações/reinstalação/outro bundle desde o terminal anterior | Autor respondeu acredito que não; não converter em certeza sobre histórico |
| Modelo atual | Campo inicial em branco; complemento trouxe somente hash do APK. getprop solicitado junto à próxima devolução |
| Erro percebido | Nenhum relatado |

As 23 linhas numéricas recebidas (112, 97, 99, 107, 97, 103, 101, 114, 45,
115, 116, 97, 116, 117, 115, 58, 114, 117, 110, 110, 105, 110, 103) são a
codificação do texto de status, não 23 erros do Metro. O roteiro abaixo passa
a converter byte[] em UTF-8 explicitamente, preservando Content já textual.
Não é necessário repetir a consulta que já funcionou.

G0 passou para identidade de versão/carregamento no alcance dos comandos e
relato. Nativo nao-carregado é esperado antes do gesto de início; preview-1
será conferido em L03. Hash igual identifica bytes iguais naqueles momentos,
não comprova que nunca houve reinstalação do mesmo APK ou troca de bundle
seguida de restauração. Essa reconstrução do histórico não é condição para
identificar a versão atual. Também não prova todo código em execução, limpeza
física de recursos ou privacidade de SDK/SO.

Na análise de G0, foi liberado G1: apenas L03 e, se encerrasse normalmente,
L11; nenhum Capturar/OCR. O retorno recebido posteriormente está abaixo.
O modelo atual foi complementado por getprop em G1, sem inferi-lo pelo hash.

### Retorno G1 — cancelamento no preview e Iniciar repetido

Fonte: relato do autor e saída selecionada de getprop. Data/hora da execução
não informadas. Baseline V0 do G0 mantida como referência; não houve nova coleta
de HEAD/APK/bundle por cenário nem informação de mudança. Nativo preview-1 foi
explicitamente informado em L03; não foi transcrito separadamente em L11.

| Caso | Evidência recebida | Resultado e alcance |
|---|---|---|
| L03 | preview-1; ready com preview; cancelled após cancelar; preview/uso ativo encerrados; sem revisão ou retomada automática; aproximadamente 5 s sem toque; nenhum erro observado | Passou para cancelamento durante preview e ausência de retomada na janela relatada |
| L11 | Executado; uma abertura percebida; Iniciar desabilitado enquanto ocupado; cancelled após cancelar; preview/uso ativo encerrados; sem revisão ou retomada; aproximadamente 5 s sem toque; nenhum erro observado | Passou para resposta observável aos toques repetidos em Iniciar e encerramento subsequente |
| Modelo | adb shell getprop ro.product.model retornou SM-S731B | Modelo atual reconfirmado; não é serial, versão do Android/API ou prova de composição do APK |

Nenhum defeito identificado nesses dois relatos; não há correção funcional ou
novo teste de regressão justificado por esse retorno. A janela de 5 s é
aproximada e não mede latência de cleanup. Não observar retomada nessa janela
não é garantia universal sobre respostas futuras.

Uma abertura percebida e botão bloqueado não comprovam contagem interna de
instâncias, ausência universal de concorrência, encerramento do reconhecedor
ou descarte físico de RAM. Tampouco houve captura/OCR, confirmação/escrita,
ensaio de permissão/abertura lenta, cleanup falho ou resultado tardio. Aprovação
de L03/L11 não é aprovação de L01/L02/L04/L14/L15/L16 nem de privacidade SDK/SO.
ACK simulado dos testes continua separado desta observação física de UI.

Na análise de G1 foi liberado G2a: somente L06a (Home no preview) e, se
encerrasse normalmente, L07a (troca de app no preview), sem Capturar/OCR.
Nenhuma repetição de G0/G1 ou nova coleta de hashes é solicitada por rotina;
se houve alteração/reinstalação/recarga inesperada, reavaliar a identidade antes.

### Retorno G2a — Home e troca de app no preview

O autor informou que executou L06a e L07a com resultados iguais. Registros
separados abaixo usam essa declaração, não duas transcrições independentes.
Baseline V0 herdada de G0/G1; nenhum hash/HEAD foi recolhido por caso. Data/hora
da execução não informadas. Não foram fornecidos códigos AppState do painel.

| Caso | Retorno recebido | Resultado |
|---|---|---|
| L06a — Home | ready antes de sair; preview-1; uso ativo encerrou ao sair; cancelled ao voltar; preview encerrado; nenhuma revisão/retomada; aproximadamente 5 s sem novos toques; nenhuma recarga/reinício ou erro percebido | Passou no alcance relatado |
| L07a — troca de app | Autor atribui os mesmos resultados acima a este caso | Passou no alcance relatado |

O retorno sustenta encerramento observável e ausência de retomada nas duas
ações/janelas. Não demonstra recriação da Activity, descarte de RAM/SDK,
contagem de câmeras, cancelamento durante OCR, resultado tardio, ausência de
persistência/telemetria ou comportamento na revisão (L06b/L07b permanecem NE).
Nenhum defeito encontrado nesses relatos; sem correção funcional ou nova
regressão justificada. ACK simulado continua separado da observação física.

Na análise de G2a foi liberado G2b: apenas L08a (bloqueio no preview) e, se
normal, L09a (rotação no preview), sem Capturar/OCR. Retorno posterior abaixo. Não
repetir G0/G1/G2a ou hashes por rotina; identidade deve ser revista se mudar.

### Retorno G2b — bloqueio e rotação com relayout

Fonte: relato separado de L08a e L09a pelo autor. Data/hora da execução não
informadas. V0 herdada de G0/G1, sem novos hashes/HEAD por caso ou códigos
AppState transcritos. Modelo SM-S731B reconfirmado anteriormente em G1.

| Caso | Evidência recebida | Resultado |
|---|---|---|
| L08a | ready/preview-1 antes de bloquear; cancelled ao retornar; preview/uso ativo encerrados; nenhuma revisão/retomada; aproximadamente 5 s sem toque; nenhum comportamento ou erro percebido | Passou no alcance relatado para bloqueio no preview |
| L09a | ready/preview-1 inicial; orientação/layout mudaram efetivamente; somente relayout, sem interrupção/reinício; ready/preview-1 após girar; nenhuma captura/revisão/retomada automática; cancelamento final encerrou câmera; nenhum erro percebido | Passou para rotação com relayout e cancelamento final. Recriação/interrupção por rotação não executadas |

Em L08a, a resposta sobre recarga/reinício foi nenhum comportamento ou erro
percebido: não transformar isso em rastreamento do processo/Activity. Em L09a,
o autor explicitamente distinguiu relayout de interrupção/reinício. Não atribuir
à rotação o abandono esperado para uma recriação que não ocorreu.

Nenhum defeito identificado nos relatos; sem correção funcional ou nova
regressão justificada. Não comprova cleanup interno de SDK/RAM, ausência de
persistência/telemetria, OCR interrompido, resultados tardios, variantes de
revisão L08b/L09b ou aprovação integral de TASK-07/10/18.

Na análise de G2b foi liberado G4a: somente L12 (Capturar repetido) e, se
normal, L13 (Tirar outra fotografia repetido). São casos observáveis de
captura/revisão com cartão sintético; fases rápidas de G3 e falha de cleanup
não são presumidas testadas. Nenhuma confirmação/escrita solicitada.

### Retorno G4a — captura bloqueada durante processamento e dúvida de descarte

Fonte: relato do autor, baseline V0 herdada, sem nova coleta de hashes/HEAD
por cenário; data/hora de execução não informadas.

- L12: uma revisão, campos conferem com o cartão; OCR ainda não havia terminado,
  mas botão ficou desabilitado, impedindo clicar mais de uma vez. Câmera/preview
  encerraram; cancelled após cancelar; sem revisão/valores antigos reaparecendo
  por aproximadamente 5 s sem novos toques; nenhum comportamento/erro percebido.
  Passou para bloqueio observável do botão e descarte; não demonstra callbacks
  concorrentes aceitos, exclusão interna nativa ou liberação física do SDK.
- L13: edição sintética 130 desapareceu ao recapturar; uma nova abertura
  percebida, sem captura automática; cancelled e câmera/preview encerrados após
  cancelar. Porém respondeu sim à pergunta sobre revisão/edição antiga
  reaparecer, durante aproximadamente 5 s, embora sem erro percebido.
  O reaparecimento relatado contradiz o critério de descarte: não aprovar L13.

**Pausa inicialmente aplicada.** Solicitado esclarecimento sem repetir o
ensaio: quais elementos reapareceram (campos com 130, valores originais, somente
mensagem/painel ou erro de preenchimento do relato), antes/depois de Cancelar e
se continuam visíveis. Não interpretar silêncio como correção do relato; não
pedir screenshot, reload, reinstalação ou nova captura para reproduzir.

Inspeção do caminho próprio: cancel limpa draft/candidates/confirmed e invalida
tentativa; receive só aceita revisão waiting da tentativa atual. Acrescentado
teste dirigido ao hook: uma captura sintética, edição 130, três recapturas,
novo ready, cancelamento e eventos/handler antigos. Estado final cancelled sem
draft/candidates/confirmed; apenas um recognize. Os 14 testes do hook passaram,
incluindo esse novo caso. Resultado com portas simuladas não reproduziu a
restauração no hook e não refuta a observação de aparelho/UI/SDK. Não foi feita
correção funcional nem presumida causa. ACK simulado não comprova recursos
físicos liberados.

**Esclarecimento posterior recebido:** autor informou ter lido desapareceu na
pergunta sobre reaparecimento. Corrigiu explicitamente: revisão/edição antiga
NÃO reapareceu. A resposta inicial permanece documentada como erro de leitura
do relato, não defeito constatado do app. L13 passou no alcance relatado após
essa correção, sem repetição de captura. Pausa encerrada; nenhum defeito/correção
funcional presumido. O teste dirigido fica como cobertura adicional do descarte.

Verificação após o retorno: lint, TypeScript e 731 testes/66 suítes aprovados
(um novo teste do hook); hook com 14 testes aprovados, portas simuladas. Links
e whitespace conferidos. Nenhum teste simulado comprova cleanup físico.

Na análise de G4a foi liberado G2c: somente L06b (Home na revisão) e, se normal,
L08b (bloqueio na revisão), com cartão sintético e edição 130, sem confirmar.
Retorno recebido abaixo; não repetir L12/L13 ou hashes por rotina.

### Retorno G2c — Home e bloqueio durante a revisão

O autor atribuiu resultados iguais a L06b/L08b. Registros separados refletem
essa declaração, não duas transcrições independentes. Baseline V0 herdada;
sem novos hashes/HEAD por cenário, data/hora de execução ou códigos AppState.

| Caso | Evidência recebida | Resultado |
|---|---|---|
| L06b — Home na revisão | Cartão 120/80/72; câmera/preview encerrados antes de sair; SYS editada para 130 sem confirmar; retorno cancelled; campos/edição antiga ausentes; nenhuma retomada; aproximadamente 5 s sem toque; nenhum comportamento/erro percebido | Passou no alcance relatado |
| L08b — bloqueio na revisão | Autor atribui os mesmos resultados acima ao caso | Passou no alcance relatado |

Sustenta descarte observável da revisão/edição após as duas ações. Como câmera
já estava encerrada antes da saída, não confundir com cancelamento de câmera
ativa ou OCR interrompido. Não há confirmação/escrita, fila offline ou troca
de conta testadas; ausência de erro percebido não rastreia processo/Activity
nem homologa SDK/SO. Nenhum defeito relatado que justifique correção funcional
ou nova regressão. TASK-07/10/18 continuam parciais.

Na análise de G2c foi liberado G2d: somente L07b (troca de app na revisão) e,
se normal, L09b (rotação na revisão); distinguir relayout de interrupção
real e não presumir recriação. Sem confirmar; preservar cópia/Metro e Fast
Refresh desligado, sem repetir hashes ou casos já recebidos por rotina.

### Retorno G2d — troca de app e rotação durante a revisão

Fonte: dois relatos separados do autor. Baseline V0 herdada, sem nova coleta
de HEAD/APK/bundle por caso ou códigos AppState transcritos. Data/hora de
execução não informadas.

| Caso | Retorno recebido | Resultado |
|---|---|---|
| L07b | Revisão obtida/câmera encerrada; SYS editada para 130 sem confirmar; cancelled ao retornar; mensagem de cancelamento em vez de campos; nenhuma retomada por aproximadamente 5 s sem toque; nenhum comportamento/erro percebido | Passou no alcance relatado |
| L09b | Orientação/layout mudaram efetivamente; somente relayout; reviewing após girar, edição 130 preservada e câmera desligada; nenhuma captura/confirmação automática; campos desapareceram após cancelar; nenhum erro percebido | Passou para relayout e descarte final. Recriação/interrupção por rotação não executadas |

Preservar a edição em relayout e descartá-la em background são comportamentos
distintos e esperados. Os relatos não comprovam recriação da Activity, fila/
escrita clínica, cleanup físico de RAM/SDK ou privacidade integral. Não houve
defeito relatado que justifique correção funcional ou nova regressão.

Na análise de G2d foi liberado G3a: uma tentativa dirigida de L02 (cancelar abertura) e, se tudo
encerrar normalmente, uma de L04 (cancelar OCR), somente cartão sintético.
São os primeiros ensaios dirigidos desses casos nesta rodada; histórico D já
registrava OCR rápido. Não repetir indefinidamente ou alterar resolução/mídia/
SDK para alongar fases. Se a fase não for observável no instante da ação,
registrar NE para o alvo, mesmo que cancelamento posterior funcione.

### Retorno G3a — cancelamento em abertura e reconhecimento

Autor informou resultados iguais para L02/L04, distinguindo a fase no instante
do toque: opening em L02 e recognizing em L04. Baseline V0 herdada, sem novos
hashes/HEAD por cenário. Data/hora de execução não informadas.

| Caso | Evidência recebida | Resultado |
|---|---|---|
| L02 | Fase-alvo atingida segundo o autor; opening no toque; cancelled ao final; câmera/preview encerrados; sem revisão/retomada por aproximadamente 5 s sem toque; nenhum comportamento/erro percebido | Passou no alcance relatado |
| L04 | Mesmos resultados atribuídos ao caso, com recognizing no toque | Passou no alcance relatado |

O retorno contém identificação explícita da fase, não somente presença de um
código no histórico. Não há instrumentação temporal independente, rastreio
de completion/lease do SDK, medição de latência ou prova de descarte físico.
O histórico D de OCR rápido descreve outro ensaio e não é reescrito. Nenhum
defeito relatado justifica correção funcional ou nova regressão.

L04 não comprova uma conclusão antiga chegando durante nova tentativa (L14),
e esses cancelamentos não comprovam toda a barreira de reabertura L15 nem
cleanup falho L16. L01/L05 de permissão continuam NE nesta rodada. Testes
controlados desses casos não são promovidos a execução física.

Na análise de G3a foi liberado G4b: L15 (uma tentativa de observar bloqueio durante closing) e,
se o encerramento for normal, L10 (uma saída/retorno por Voltar Android).
Sem Capturar/OCR neste grupo. Closing rápido demais ou destino que não permita
retorno à demo ficam documentados como limite, sem repetir até acertar.

### Retorno G4b — bloqueio em closing e saída por Voltar

Fonte: dois relatos separados do autor. Baseline V0 herdada; sem nova coleta
de hashes/HEAD por cenário. Data/hora de execução não informadas.

| Caso | Retorno recebido | Resultado |
|---|---|---|
| L15 | closing observável e no instante do gesto; Iniciar desabilitado; nenhuma nova abertura; final cancelled com câmera/preview fechados; aproximadamente 5 s sem toque; nenhum erro percebido | Passou para bloqueio observável na UI durante closing |
| L10 | Voltar levou à tela inicial do celular; retorno por Recentes em idle/nao-carregado; câmera/preview desligados; sem campos antigos/retomada por aproximadamente 5 s; nenhum comportamento/erro percebido | Passou no alcance relatado para saída/retorno |

Em L15, o botão bloqueou a interação, não foram demonstrados callbacks de
início concorrentes aceitos. Não tratar esse resultado como ACK físico ou prova
de liberação de todos os recursos do reconhecedor. Em L10, idle/nao-carregado
é compatível com nova inicialização, mas não prova morte do processo ou
destruição da Activity; não contradiz a ausência de reinício percebido pelo autor.
Nenhum defeito relatado justifica alteração funcional ou nova regressão.

L01/L05 (cancelamento/permissão tardia) continuam NE nesta rodada. L14 precisa
de conclusão antiga distinguível; L16 não será provocado no hardware. L04
positivo e ACKs simulados não concluem essas pendências. Recriação real por
rotação e privacidade SDK/SO também permanecem sem homologação.

**Próxima etapa: preparar permissão negada para G3b, sem Iniciar câmera.**
Isso pode reiniciar a demo; conferir carregamento/versão antes de solicitar
novo diálogo. Não limpar dados, reinstalar ou reabrir múltiplas solicitações.

### Execução controlada desta preparação

Quatro casos novos no coordenador, todos aprovados: concessão da tentativa A
cancelada enquanto B ainda aguarda permissão; resposta OCR de A durante OCR de
B sem substituir o candidato de B; close rejeitado mantendo blocked; close
que só retorna ACK true após timeout mantendo blocked. Tentativas adicionais
de iniciar/capturar e status ready antigo não retiram esse bloqueio.

Os testes usam portas simuladas. O teste de resposta tardia deliberadamente
permite uma Promise antiga pendente depois de ACK simulado, para verificar o
consumidor JS; isso não afirma sobreposição física nem liberação de ML Kit.
As regressões existentes de permissão, abertura, preview, cancelamento no
fechamento, captura repetida, recaptura e reinício de efeitos também passaram.

| Check nesta branch, sobre staging a3b996a | Resultado |
|---|---|
| npm ci --ignore-scripts | Aprovado pelo lock, sem alterar dependências |
| Lint, TypeScript raiz e demo Android | Aprovados |
| Coordenador + hook Android | 33 testes / 2 suítes aprovados |
| Jest global | 730 testes / 66 suítes aprovados, quatro novos |
| test:rules local | Bloqueado no download do JAR Firestore 1.21.0 em storage.googleapis.com; regras não executaram/compilaram localmente |
| Comparação de fontes e diff --check | Sem diferenças nos controles listados; whitespace aprovado |

O total parte dos 726 testes de staging, sem incluir os 11 do PR #72 ainda
aberto. Não é perda de testes da outra branch, que foi preservada. Não houve
mudança em código funcional, Kotlin, schema/rules ou writer; não foi necessário
gerar novo bundle/APK. CI do PR desta preparação será conferido à parte.

Nenhum defeito físico foi relatado nesta nova rodada até este ponto.
TASK-07/10/18, privacidade, legado conectado e persistência permanecem parciais.

## Condução por grupos

**Procedimento G0, já executado no retorno acima:** com Metro parado/câmera
desligada. Preservado para rastreabilidade; não repetir por rotina. O estado
atual de condução é preparação de G3b, sem Iniciar câmera.
Na cópia TalkBack existente, sem instalar dependências ou alterar Git:

```powershell
cd C:\dev\aferi-task07-talkback
git rev-parse HEAD
git status --short
```

Esperado: f057283876ea2126b485abd762e2886012b4c7ca e status sem saída. Confirmar
se houve edição, reinstalação ou outro bundle depois do terminal enviado.
Se mudou algo, parar e informar nomes/códigos sanitizados; preservar tudo.

Somente com HEAD/status esperados, iniciar Metro dessa cópia:

```powershell
cd demos\android-capture
$aferiCicloNodeOptionsAnteriores = $env:NODE_OPTIONS
$env:NODE_OPTIONS = ($env:NODE_OPTIONS + " --dns-result-order=ipv4first").Trim()
npx --no-install expo start --dev-client --localhost --port 8097
```

No segundo PowerShell, usar SDK/ADB existentes:

```powershell
$aferiSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$aferiAdb = Join-Path $aferiSdk 'platform-tools\adb.exe'
& $aferiAdb reverse tcp:8097 tcp:8097
$aferiRespostaStatus = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8097/status'
if ($aferiRespostaStatus.Content -is [byte[]]) {
    [System.Text.Encoding]::UTF8.GetString($aferiRespostaStatus.Content)
} else {
    [string]$aferiRespostaStatus.Content
}
```

Esperado: reverse sem erro e packager-status:running. Conferir /status também
no navegador do telefone; pressionar `a` no Metro para abrir o cliente existente.
Não usar Expo Go. No menu de desenvolvimento, conferir Fast Refresh desativado;
se aparece Disable Fast Refresh, desativá-lo; Enable Fast Refresh indica desligado.
Voltar à demo sem Iniciar câmera; conferir estado inicial e cabeçalho captura-5.
preview-1 pode aparecer só depois do módulo carregar por gesto: não iniciar só
para obtê-lo em G0. Se indisponível, registrar pendente até L03.

Após carregar, consultar somente o hash do arquivo JS:

```powershell
& $aferiAdb shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

Hash diferente não é falha automática: precisa identificar a fonte carregada,
sem atribuir identidade por suposição. Não recarregar repetidamente até coincidir.
Se houver reinstalação/mudança de pacote, reconferir base.apk pelo procedimento
já enviado, sem copiar APK ou outros arquivos do aparelho.

Devolver G0: HEAD/status atual; alterações posteriores/reinstalação sim/não;
modelo confirmado; Metro carregou?; captura-5 visível?; câmera desligada?;
Fast Refresh desligado?; hash do bundle após carregar ou erro sanitizado.
Não enviar QR, serial, tela inteira, logs completos, imagens ou dados de conta.

**Procedimento G1, já executado no retorno acima: L03 + L11**, sem capturar/OCR.
Manter Metro aberto e Fast Refresh desligado. Primeiro, um início explícito:
conferir preview-1, ready e preview visível, cancelar uma vez e observar sem
toque por aproximadamente 5 s. Esperado: cancelled, preview/uso ativo de câmera
encerrados, sem revisão ou retomada. Diálogo de permissão ou marcador Nativo
diferente de preview-1 encerra o caso para análise, sem avançar por tentativa.

Somente se L03 encerrar normalmente, três toques rápidos em Iniciar. Esperado:
uma abertura observável, Iniciar desabilitado enquanto ocupado e nenhuma
revisão. Ao chegar a ready, cancelar uma vez e observar novamente. Quantidade
de previews percebidos não é contagem comprovada de instâncias nativas.

Devolver L03/L11 separadamente: fase antes/depois, Nativo, encerramento de
preview/indicador, revisão/retomada indevidas, erro/código e intervalo observado
(aproximado ou medido). Em L11, aberturas percebidas e estado do botão Iniciar.
O modelo solicitado junto ao grupo foi fornecido no retorno G1.
Não fazer o segundo caso se o primeiro falhar; regras de parada continuam
obrigatórias. Não executar os demais grupos da tabela por conta desta listagem.
Os grupos seguintes são subdivididos para no máximo dois casos por devolução,
distinguindo sempre variante/fase observada.

**Procedimento G2a, já executado: L06a + L07a, somente preview.** Manter a mesma demo/Metro,
Fast Refresh desligado e cartão sintético como alvo; não tocar em Capturar.

1. L06a: iniciar por um único gesto e conferir ready/preview-1/preview visível.
   Ir à tela inicial do Android por Home; observar se o uso ativo da câmera
   encerrou. Voltar por Recentes, sem Iniciar, e observar por aproximadamente
   5 s. Esperado: cancelled, sem preview/revisão ou retomada automática.
2. L07a, somente se o anterior encerrou normalmente e a câmera está desligada:
   iniciar uma vez e esperar ready. Por Recentes, abrir um app neutro como
   Relógio, sem outra câmera; observar a tela desse app efetivamente aberta.
   Retornar à demo por Recentes, sem Iniciar, e observar aproximadamente 5 s.
   Esperado: câmera/preview encerrados, cancelled, sem revisão/retomada.

Devolver cada caso: ready antes da saída, Nativo, uso ativo encerrado ao sair,
fase/preview no retorno, revisão/retomada, intervalo aproximado ou medido,
erro/código e recarga/reinício percebidos. Se app:background estiver visível
no painel, transcrever apenas esse código; a ausência no ring buffer não prova
que o evento não ocorreu. Não pedir conteúdo do outro app ou logs completos.

Não fazer L07a se L06a falhar. Parar diante de câmera presa, concorrência,
blocked/cleanup-failed/resource-busy inesperado; sem reload/reinstalação/bypass.
Não executar variantes de revisão (L06b/L07b) nem os demais grupos ainda.

**Procedimento G2b, já executado: L08a + L09a, somente preview.** Mesma demo/Metro, Fast Refresh
desligado e cartão sintético; não tocar em Capturar. Não alterar opções de
desenvolvedor do Android para forçar destruição/recriação da Activity.

1. L08a: iniciar uma vez, conferir ready/preview-1/preview visível. Bloquear
   a tela pelo botão lateral; desbloquear normalmente e retornar à demo, sem
   Iniciar. Observar aproximadamente 5 s. Esperado: uso ativo/preview encerrados,
   cancelled e nenhuma revisão/retomada. Não enviar PIN, biometria ou tela.
2. L09a, somente se L08a terminou normalmente: iniciar uma vez e esperar ready.
   Com rotação automática habilitada pela configuração usual, girar uma vez
   para paisagem e retornar a retrato, sem Capturar. Se só houver relayout,
   preview continua utilizável/ready, sem captura/revisão automáticas; cancelar
   ao final e conferir encerramento. Se ocorrer interrupção/background/reinício,
   esperado é abandono/cancelamento e câmera desligada, sem retomada automática.
   Se não houver mudança efetiva de orientação/layout, registrar não executado
   para rotação efetiva. Não atribuir recriação apenas ao giro ou relayout.

Devolver L08a/L09a separados: ready/Nativo inicial, ações efetivas, fase/preview
no retorno, uso ativo encerrado quando aplicável, revisão/retomada, intervalo,
erro e recarga/reinício percebidos. Em L09a, distinguir relayout de interrupção
observada e informar cancelamento final. Códigos AppState visíveis são opcionais;
sem evidência específica, recriação real permanece não executada/inconclusiva.
Parar diante de câmera presa, concorrência ou cleanup falho; não fazer o segundo
caso se o primeiro falhar nem usar reload/reinstalação/bypass.

**Procedimento G4a, já executado; L13 esclarecido sem reteste.**
Manter Metro, cópia TalkBack e Fast Refresh desligado. Não trocar código/APK,
não recarregar, não usar imagem de medidor real nem confirmar valores.

1. L12: iniciar uma vez, esperar ready/preview-1 e enquadrar o cartão sintético
   SYS 120 / DIA 80 / PUL 72. Dar três toques rápidos em Capturar e reconhecer.
   Observar se surge uma única revisão, sem revisões sucessivas; câmera/preview
   devem encerrar. Se o primeiro toque concluir antes dos seguintes, registrar
   essa limitação, sem afirmar toques durante OCR ou repetir até acertar.
   Conferir apenas correspondência com o cartão, sem editar/confirmar. Cancelar
   revisão e observar aproximadamente 5 s: sem campos/revisão/retomada antiga.
2. L13, somente se o caso anterior terminou sem falha e câmera desligada:
   iniciar e capturar uma vez o mesmo cartão para obter nova revisão. Editar
   apenas SYS para o valor sintético 130, sem confirmar. Dar três toques rápidos
   em Tirar outra fotografia. Esperado: revisão/edição antigas somem e há uma
   única nova abertura observável, sem OCR automático. Não tocar em Capturar
   nessa nova abertura. Ao chegar a ready, cancelar captura e observar cerca
   de 5 s; câmera encerra e nenhuma revisão/edição antiga reaparece.

Devolver L12/L13 separados: sequência observada, quantidade de revisões/aberturas
percebidas, fase final, campos conferem com cartão (L12), descarte da edição
sintética (L13), câmera/preview encerrados, retomada/edição antigas, intervalo,
erro/código e recarga/reinício percebidos. Se não foi possível atingir os toques
enquanto ocupado, declarar; observação sem erro não comprova exclusão nativa.
Se não houver revisão em L12 ou na preparação de L13, parar e descrever, sem
inventar campos ou preencher manualmente para contornar. As regras de parada
por câmera presa, concorrência ou cleanup falho continuam obrigatórias.

**Procedimento G2c, já executado: L06b + L08b, sem confirmar.**
Manter cópia/Metro e Fast Refresh desligado. O alerta L13 foi esclarecido pelo
autor; não houve alteração de código/APK para continuar.

1. L06b: iniciar e capturar uma vez o cartão 120/80/72. Conferir revisão e
   câmera/preview encerrados; editar somente SYS para 130, sem confirmar. Ir
   por Home e retornar por Recentes, sem Iniciar. Observar aproximadamente 5 s.
   Esperado: cancelled, campos/revisão/edição antiga ausentes, câmera desligada
   e nenhuma retomada automática.
2. L08b, apenas se o anterior terminou normalmente: iniciar por novo gesto e
   capturar uma vez o mesmo cartão; na revisão, com câmera encerrada, editar
   SYS para 130 sem confirmar. Bloquear pelo botão lateral, desbloquear e voltar
   à demo sem Iniciar. Observar aproximadamente 5 s. Mesmo descarte esperado.

Devolver cada caso: revisão obtida, câmera desligada antes de sair, edição
sintética feita, fase no retorno, campos/edição antigos presentes ou ausentes,
retomada automática, intervalo aproximado/medido e recarga/reinício/erro percebido.
Se revisão/câmera não estiverem como esperado na preparação, parar; não preencher
campos para contornar falha do OCR. Sem imagens/PIN/áudio/logs clínicos.
Parar por câmera presa, concorrência, blocked/cleanup-failed/resource-busy
inesperado, sem reload/reinstalação/bypass. Não confirmar ou salvar valores.

**Procedimento G2d, já executado: L07b + L09b, revisão sem confirmar.**
Mesma cópia/Metro, Fast Refresh desligado. Não instalar APK, trocar código ou
alterar opções de desenvolvedor para forçar recriação.

1. L07b: iniciar e capturar uma vez o cartão 120/80/72. Conferir revisão e
   câmera/preview encerrados; editar SYS para 130 sem confirmar. Por Recentes,
   abrir um app neutro como Relógio, sem outra câmera, e observar sua tela.
   Voltar à demo por Recentes, sem Iniciar, e observar aproximadamente 5 s.
   Esperado: cancelled, câmera desligada, campos/edição antigos ausentes e
   nenhuma retomada automática.
2. L09b, somente se L07b terminou normalmente: iniciar por novo gesto e capturar
   uma vez o mesmo cartão. Na revisão com câmera encerrada, editar SYS para
   130, sem confirmar. Com rotação automática usual, girar para paisagem e
   voltar a retrato. Se apenas relayout: revisão/edição 130 permanecem legíveis,
   sem captura/confirmação ou câmera automáticas; cancelar ao final, conferindo
   descarte. Se houver interrupção/background/reinício: esperado cancelled e
   campos descartados, sem retomada. Se não houver rotação/layout efetivos,
   registrar limitação. Recriação real não é inferida do giro/relayout.

Devolver cada caso: revisão obtida, câmera encerrada antes da ação, edição
130, fase/campos/edição no retorno, retomada/câmera/confirmação automáticas,
intervalo e recarga/reinício/erro percebidos. Em L09b, mudança efetiva de
orientação/layout, relayout ou interrupção observada e descarte ao cancelar
no final. Sem confirmação, mídia, dados do outro app ou logs completos.
Parar por câmera presa, concorrência, blocked/cleanup-failed/resource-busy
inesperado; não fazer o segundo caso se o primeiro falhar nem usar bypass.

**Procedimento G3a, já executado: L02 + L04, cancelamento de fases rápidas.** Mesma cópia/Metro,
Fast Refresh desligado e cartão sintético. Uma tentativa por caso; sem atraso
artificial, troca de mídia/resolução ou injeção de falha no APK.

1. L02: partir de câmera desligada/cancelled e Cancelar captura visível. Iniciar
   uma vez e tentar Cancelar captura enquanto aparecer opening/Preparando
   câmera. Se ready surgir antes, ou se não for possível identificar a fase
   no instante do toque, marcar NE para abertura. Cancelar o preview apenas
   para encerrar com segurança, sem transformar esse cancelamento em aprovação
   de L02. Não capturar nesse caso. Após encerramento, observar cerca de 5 s
   sem toque; esperado: cancelled, câmera/preview encerrados, sem revisão/
   retomada ou ready tardio reabrindo o fluxo.
2. L04, somente se o caso anterior encerrou normalmente: iniciar por novo gesto,
   aguardar ready/preview-1, enquadrar o cartão e tocar Capturar uma vez.
   Tentar Cancelar captura durante recognizing/Lendo o quadro em memória.
   Se reviewing já estiver presente, ou a fase do toque for incerta, registrar
   NE para OCR interrompido e cancelar a revisão apenas para descarte. Não
   repetir até acertar. Esperado, se o alvo foi atingido: cancelled após
   liberação, câmera encerrada e nenhum candidato/revisão tardios, observando
   aproximadamente 5 s sem toque.

Devolver L02/L04 separados: alvo observável ou rápido demais, fase no instante
de Cancelar (ou incerta), fase final, preview/uso ativo encerrados, revisão/
retomada tardias, intervalo e erro/recarga/reinício percebidos. Código recognizing
no histórico, sozinho, não comprova que o toque ocorreu durante OCR. ACK ou
UI cancelada não comprovam cleanup físico. Não confirmar/salvar valores.
Parar por câmera presa, concorrência, blocked/cleanup-failed/resource-busy
inesperado; não executar o segundo caso se o primeiro falhar nem usar bypass.

**Procedimento G4b, já executado: L15 + L10, sem Capturar/OCR.** Mesma cópia/Metro, Fast Refresh
desligado e cartão sintético como alvo do preview. Uma tentativa por caso.

1. L15: iniciar uma vez e esperar ready/preview-1. Cancelar captura e observar
   closing. Se visível, tentar Iniciar uma única vez enquanto closing, sem
   insistir se desabilitado. Esperado: nenhuma nova abertura enquanto ocupado,
   fim de closing não abre automaticamente; câmera/preview encerrados e fase
   cancelled. Observar aproximadamente 5 s sem toque. Se closing não foi
   observável no gesto, marcar NE para essa barreira; cancelamento normal não
   aprova L15. Não atrasar cleanup nem forçar ACK. Não é preciso reabrir só
   para testar um novo gesto; o caso seguinte já terá início explícito.
2. L10, apenas se não houve falha e a câmera está desligada: iniciar uma vez,
   esperar ready e usar Voltar Android uma única vez. Registrar se saiu para
   launcher, tela inicial, menu ou outra tela. Voltar à demo por Recentes; se
   ela não estiver disponível, usar o ícone do cliente de teste uma vez, sem
   reload/seleção repetida de bundles. Se ficar no launcher/menu sem retorno
   identificável à demo, parar e informar, sem abrir câmera por outro caminho.
   Esperado no retorno: câmera/preview desligados, nenhum candidato antigo ou
   retomada automática, observando aproximadamente 5 s sem Iniciar. Se processo
   reiniciou, idle/nao-carregado podem aparecer; registrar isso em vez de exigir
   cancelled. Menu sem saída ou somente background não comprovam desmontagem.

Devolver L15: closing observado ou rápido demais, fase no gesto, Iniciar
desabilitado, nova abertura automática ou não, fase final, câmera e erro.
L10: destino do Voltar, forma de retorno, fase/preview/campos, retomada,
recarga/reinício percebidos, intervalo e erro. Não presumir Activity destruída
por sair da tela. Se uso ativo da câmera não encerrar ao sair, interromper
o ensaio sem iniciar novamente. Valem todas as regras de parada/bloqueio,
sem bypass/reload/reinstalação, e nenhuma confirmação de valores.

**Etapa atual: preparação G3b, sem executar L01/L05 ainda.** Com câmera desligada,
Metro aberto e cópia preservada, abrir Informações do app somente do cliente
Aferi — captura em avaliação (com.ramonmenz.afericapturetest). Em Permissões →
Câmera, selecionar Não permitir. Não alterar permissões do produto principal,
limpar dados/cache ou reinstalar. Se não identificar o cliente com segurança,
parar e relatar. Voltar à demo pela forma usual; se não voltar diretamente,
usar `a` no Metro uma vez para abrir o cliente existente, sem Iniciar câmera.

Conferir captura-5, estado inicial/câmera desligada e Fast Refresh desligado.
Se surgir diálogo de câmera sem gesto Iniciar, não conceder por tentativa;
parar e informar. Recolher HEAD/status e hash do bundle após esse carregamento
pelos comandos G0 já documentados, usando Terminal 2 para não parar o Metro.
Esperado: fonte f057283 limpa e bundle 86017456…; hash diferente não é falha
automática, exige identificar a fonte, sem recarregar até coincidir. A revogação
não instala outro APK; novo hash de APK só se houver reinstalação/mudança.

Devolver: cliente identificado, permissão Não permitir aplicada, HEAD/status,
hash JS ou erro, estado/Nativo/câmera, Fast Refresh e reinício/diálogo inesperado.
Não tocar em Iniciar/Capturar. L01/L05 serão conduzidos após esse retorno,
sem confundir autorização nas Configurações com concessão da mesma solicitação
pendente depois de cancelar; se o SO não preservar esse diálogo, registrar NE.

Ao encerrar a sessão, quando desejar parar,
cancelar, conferir câmera desligada, Ctrl+C no Metro e restaurar
`$env:NODE_OPTIONS = $aferiCicloNodeOptionsAnteriores`. Não apagar pastas/dados.
