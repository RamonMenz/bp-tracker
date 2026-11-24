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
| Pacote / aparelho | com.ramonmenz.afericapturetest; Samsung S25 FE SM-S731B histórico, a reconfirmar nesta rodada |
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
Modelo atual não transcrito; SM-S731B continua identificação histórica.
NE = não executado nesta rodada. Não copiar aprovações de A–K/R1/R2 para V0.
Retornos devem ganhar fonte/hash/condições por grupo; data de registro não será
tratada como data/hora de execução quando esta não for informada.

| Caso | Estado físico atual | Evidência / limitação | Versão |
|---|---|---|---|
| G0 — versão/carregamento | Passou no alcance relatado | HEAD limpo, APK e bundle reconfirmados; Metro/demo/idle/Fast Refresh verificados. Modelo atual ainda não transcrito | V0 |
| L01 | NE | Diálogo pode impedir acesso ao Cancelar; background é variante distinta | V0 |
| L02 | NE | Abertura pode ser rápida demais | V0 |
| L03 | NE | Histórico A positivo não é nova execução | V0 |
| L04 | NE | Histórico D não executado por OCR rápido; não repetir indefinidamente | V0 |
| L05 | NE | Exige concessão da mesma solicitação depois do cancelamento | V0 |
| L06a / L06b | NE / NE | Há relatos históricos Home, sem promoção para esta rodada | V0 |
| L07a / L07b | NE / NE | Há relatos históricos de troca rápida; contagem nativa não demonstrada | V0 |
| L08a / L08b | NE / NE | Há relatos históricos de bloqueio, sem promoção para esta rodada | V0 |
| L09a / L09b | NE / NE | Histórico H só relayout, sem recriação demonstrada | V0 |
| L10 | NE | Demo sem rota interna de saída; destino de Voltar a observar | V0 |
| L11 | NE | Observação de UI não basta para contagem nativa | V0 |
| L12 | NE | Observação de UI não basta para contagem nativa | V0 |
| L13 | NE | Descarte da edição é observável, concorrência interna pode não ser | V0 |
| L14 | NE | Tardio precisa ser distinguível, senão só teste controlado | V0 |
| L15 | NE | Closing pode ser rápido demais para interação | V0 |
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

**G1 liberado:** apenas L03 e, se encerrar normalmente, L11; nenhum Capturar/OCR.
Os dois continuam NE até retorno do autor. Sem novo ensaio de permissão ou
autorizações por suposição: se surgir diálogo em L03, parar e analisar o caso.
Modelo atual será registrado se fornecido; não presumido pelo hash do APK.

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
atual de condução é G1 (L03/L11), descrito ao final desta seção.
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

**Grupo atual, após análise de G0: G1 = L03 + L11**, sem capturar/OCR.
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
Se possível, incluir apenas a saída getprop ro.product.model ainda pendente.
Não fazer o segundo caso se o primeiro falhar; regras de parada continuam
obrigatórias. Não executar os demais grupos da tabela por conta desta listagem.
G2/G3/G4/G5 serão subdivididos para no máximo dois
casos por devolução, distinguindo sempre variante/fase observada. Ao terminar,
cancelar, conferir câmera desligada, Ctrl+C no Metro e restaurar
`$env:NODE_OPTIONS = $aferiCicloNodeOptionsAnteriores`. Não apagar pastas/dados.
