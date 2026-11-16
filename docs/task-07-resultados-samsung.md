# TASK-07 — resultados relatados no Samsung

Registro recebido em **12/11/2026** nesta conversa. Fonte: relatório textual do
autor e saída de comandos por ele fornecida. A data/hora exata das capturas e o
fuso dos horários do inventário não foram informados; não são inferidos deste
registro. Sem acesso do Codex ao Windows, APK ou dispositivo.

## Identificação e resultado S02

| Item | Informação recebida / alcance |
|---|---|
| Fonte declarada | `4dc010599747bcb6de2b5e2f939f030e9cbe4ea8`, status Git limpo |
| Telefone | `SM-S731B` |
| Android / API declarados | `17 / 37`; distintos do compile/target SDK do projeto |
| Node / npm / JDK declarados no Windows | `v24.22.0 / 11.19.1 / 17.0.21` |
| Build | `BUILD SUCCESSFUL: sim`, informado pelo autor |
| SHA-256 do arquivo APK informado | `69D5A0B31023A9B3647B0036CC2EB3AF0683BE19A02782A2B8E834635849E09C` |
| Fast Refresh | Desativado, informado pelo autor |
| Marcadores | `captura-5 / preview-1` |
| Identidade do APK instalado | Inicialmente pendente por falha ADB; a coleta complementar abaixo trouxe SHA-256 do `base.apk` instalado igual ao do arquivo APK informado. Igualdade estabelecida no momento da nova consulta; não identifica por si só o JS servido pelo Metro |

Cartão sintético esperado: SYS 120 / DIA 80 / PUL 72. Não é display de medidor real.

| Rodada | Sistólica | Diastólica | Pulso | Preview fechou | Indicador apagou | Erro ou recarga percebidos |
|---|---:|---:|---:|---|---|---|
| 1 | 120 | 80 | 72 | Sim | Sim | Não |
| 2 | 120 | 80 | 72 | Sim | Sim | Não |
| 3 | 120 | 80 | 72 | Sim | Sim | Não |

**S02 positivo no alcance relatado**: três percursos até a revisão, fechamento
visual do preview e indicador apagado. Sem tempos, profiler ou captura instrumental
de liberação. Não converter as três rodadas em acurácia estatística, cobertura
de displays reais ou garantia de descarte físico da memória. Na primeira entrega
não havia resultado para S01/S03–S09, confirmação ou rede/offline; a coleta
complementar abaixo acrescenta evidência parcial de S06.

## Inventário posterior sanitizado

Primeira tentativa dos dois comandos: `adb.exe: no devices/emulators found`.
Os comandos não executaram no telefone nessa tentativa. O autor informou conexão
USB restabelecida e coleta posterior bem-sucedida. Inventário anterior às capturas
não foi fornecido; não se presume que tenha sido coletado.

Saída recebida de `run-as com.ramonmenz.afericapturetest find . -type f`, sem
conteúdo dos arquivos, prompt Windows ou identificadores do aparelho:

```text
./shared_prefs/expo.modules.devlauncher.recentyopenedapps.xml
./shared_prefs/android.app.ActivityThread.IDS.xml
./shared_prefs/com.google.mlkit.internal.xml
./shared_prefs/expo.modules.devmenu.sharedpreferences.xml
./shared_prefs/expo.modules.kotlin.PersistentDataManager.xml
./shared_prefs/WebViewChromiumPrefs.xml
./shared_prefs/expo.modules.permissions.asked.xml
./shared_prefs/expo.modules.devlauncher.errorregistry.xml
./shared_prefs/com.ramonmenz.afericapturetest_preferences.xml
./files/profileInstalled
./files/DevLauncherApp-BridgelessReactNativeDevBundle.js
./databases/com.google.android.datatransport.events
./databases/com.google.android.datatransport.events-journal
./no_backup/expo-dev-launcher-installation-id.txt
./app_webview/Default/Cookies
./app_webview/Default/Cookies-journal
```

Metadados selecionados de `ls -la files cache no_backup`; UID/GID omitidos.
Horários abaixo transcritos sem conversão de fuso ou uso como hora de captura:

| Caminho relativo | Tipo | Bytes informados | Modificação exibida |
|---|---|---:|---|
| `cache/.expo-dev-launcher` | Diretório | 3452 | 2026-11-10 21:05 |
| `cache/WebView` | Diretório | 3452 | 2026-11-10 21:12 |
| `files/DevLauncherApp-BridgelessReactNativeDevBundle.js` | Arquivo | 7340789 | 2026-11-12 12:09 |
| `files/profileInstalled` | Arquivo | 24 | 2026-11-12 11:47 |
| `no_backup/expo-dev-launcher-installation-id.txt` | Arquivo | 36 | 2026-11-10 21:08 |

O nome do bundle aponta a código JS do Dev Client, distinto de uma foto capturada.
Os nomes de preferências, cookies e identificador não revelam seus conteúdos.
Não foi lido ou copiado nenhum arquivo interno nesta etapa.

Não há arquivo de imagem evidente pelos nomes fornecidos. Isso **não comprova
ausência de persistência**: extensões não determinam conteúdo, o inventário é
posterior e não cobre arquivos criados/apagados entre observações nem todo SDK/SO.
Os bancos `com.google.android.datatransport.events` e `events-journal` são pontos
de auditoria de persistência/telemetria: origem efetiva, conteúdo, fila e destinos
não foram determinados. Sua presença não prova vazamento clínico, e não é
evidência suficiente para declarar conformidade. Não exportar bancos, payloads,
cookies, preferências ou identificadores para o Git/chat, nem apagá-los para fazer
o inventário parecer limpo. Prosseguir apenas com entradas sintéticas no cliente
isolado; habilitação clínica permanece bloqueada pelos critérios pendentes.

## Coleta complementar — identidade, S06 e comparação de inventários

Recebida em **12/11/2026**, após o primeiro relatório. PR #66 confirmado como
mesclado em staging `72c1ebdef7be3d27c409666802c22d7aff561703`; esta atualização
documental parte dessa base. Horário exato dos testes e fuso não informados.

O autor executou `pm path` para o pacote de avaliação, selecionou `base.apk` e
executou `sha256sum` no dispositivo. Saída sanitizada, omitindo caminho aleatório
de instalação, prompt Windows e UID/GID:

```text
69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c  [base.apk instalado]
```

Esse SHA-256 é igual ao do arquivo APK informado anteriormente; diferença de caixa
das letras não altera o hash. Isso vincula o APK base instalado naquele momento
ao arquivo compilado. Não foi informado se houve reinstalação entre as rodadas;
não se retroage a verificação para comprovar a instalação de cada ensaio anterior.
O hash de APK não identifica sozinho o bundle JS carregado pelo Metro.

| Ação de S06 relatada | Resultado / alcance |
|---|---|
| Capturar novamente o cartão | Reconhecimento bem-sucedido relatado |
| Editar sistólica para 70, mantendo diastólica 80 | Confirmação impedida, relatado |
| Corrigir sistólica para 130 | Confirmação permitida, relatado |
| Em outra captura, editar um campo e cancelar | Autor relata comportamento conforme esperado, sem erro percebido; não descreveu individualmente os estados de descarte e de recaptura |
| Tocar em Confirmar revisão em memória e observar mensagem/valores finais | Esclarecimento recebido: autor transcreveu a tela final com confirmação somente em memória, 130 por 80 mmHg e pulso 72 |

O esclarecimento posterior do autor trouxe a seguinte transcrição da tela:

```text
Revisar fotografia
Captura real em avaliação. Confirmação apenas em memória; sem gravação clínica.
Confirmação demonstrada somente em memória.
130 por 80 mmHg
Pulso: 72
12/11. 12:39
```

Validação, correção e confirmação final em memória têm evidência positiva no
alcance relatado de S06, além do relato de cancelamento após edição. O texto
`12/11. 12:39` é a data/hora exibida na revisão, sem fuso informado; não é tratado
como horário comprovado do clique ou duração do teste. Não há prova de escrita
clínica; a demo continua somente em memória. Esta rodada não encerra FOT-05–07,
TASK-07 ou os cenários de cancelamento em outras fases.

O autor apresentou dois pares `find`/`ls`, identificados como antes e depois da
nova rodada. Os dois `find` trazem a mesma lista de 16 arquivos já transcrita
neste documento. Os dois `ls` são iguais nos metadados exibidos:

| Caminho relativo | Tipo | Bytes informados em ambos | Modificação exibida em ambos |
|---|---|---:|---|
| `cache/.expo-dev-launcher` | Diretório | 3452 | 2026-11-10 21:05 |
| `cache/WebView` | Diretório | 3452 | 2026-11-10 21:12 |
| `files/DevLauncherApp-BridgelessReactNativeDevBundle.js` | Arquivo | 7340789 | 2026-11-12 12:44 |
| `files/profileInstalled` | Arquivo | 24 | 2026-11-12 12:39 |
| `no_backup/expo-dev-launcher-installation-id.txt` | Arquivo | 36 | 2026-11-10 21:08 |

Os horários do bundle e de profileInstalled diferem do inventário da entrega
anterior, mas são iguais entre os dois inventários desta coleta. Não foi fornecido
controle do intervalo entre entregas para atribuir causa a essa diferença.

**Conclusão limitada:** não houve diferença observável nos nomes listados nem
nos metadados exibidos pelo `ls` desse par antes/depois. `find` não lista tamanho
ou modificação de bancos/preferências/cookies, e o `ls` recebido não cobre esses
diretórios. Nem mesmo metadados iguais provariam igualdade de conteúdo; não foram
fornecidos hashes dos arquivos internos, nem solicitada sua exportação. Arquivos
transitórios e alterações internas continuam fora do alcance da comparação.
Auditoria de DataTransport/telemetria, rede/reconexão e privacidade permanece
pendente. Ausência de mudança nessa listagem não é aceite integral de FOT-10–12.

## Cancelamento e Home durante preview — retorno de 16/11/2026

Fonte: relato do autor e quatro pares de saídas identificadas por cenário e
momento. Fonte declarada `4dc0105` limpa; Fast Refresh desativado;
`captura-5`/`preview-1`, com `nao-carregado` antes do início. Conexão USB com
`adb reverse` na porta 8097. **Houve reinstalação desde os testes anteriores**;
o novo hash foi fornecido posteriormente, conforme a coleta C/D abaixo. A
verificação inicial de 12/11 não é retroativamente atribuída à reinstalação.

Na retomada, `curl` no PC falhava em `127.0.0.1:8097/status`, mas respondia
`packager-status:running` em `localhost`; ADB detectava o telefone e a regra
reverse existia. Expo desta versão escuta em `localhost` com `--localhost`, mas
gera endereço 127.0.0.1 para o cliente. Hipótese compatível: preferência IPv6 no
bind. O autor confirmou que o curl IPv4 passou a responder após reiniciar Metro
com `--dns-result-order=ipv4first` em NODE_OPTIONS. Não foi fornecida inspeção
do socket original para provar sua família; não é falha comprovada da câmera.

| Observação relatada | A: Cancelar captura no preview (parte de S03) | B: Home no preview (parte de S04) |
|---|---|---|
| Preview interrompido | Sim | Sim |
| Indicador de câmera apagou | Sim | Sim |
| Fase informada | cancelled | Não especificada |
| Candidato/revisão antiga apareceu | Não | Não |
| Reinício automático da câmera | Não | Não |
| Novo início explícito abriu preview | Sim | Sim |
| Encerramento da nova tentativa | Cancelado; sem blocked/cleanup-failed relatados | Cancelado |

**A e B positivos no alcance relatado.** Não equivalem a todo S03/S04: permissão,
abertura, OCR, revisão, bloqueio, rotação e demais interrupções têm cenários
próprios. Não foi especificado se o retorno de Home preservou a instância React
ou recriou o app. Indicador e UI não substituem inspeção instrumental de recursos.

### Inventários dessa sessão

No `find` ANTES de A consta literalmente:

```text
./databases/com.google.android.datatransport.events-journala
```

DEPOIS de A e nos dois inventários de B consta:

```text
./databases/com.google.android.datatransport.events-journal
```

Os demais nomes correspondem à lista já transcrita; são 16 entradas em cada
listagem. A diferença do sufixo `a` foi destacada pelo próprio autor. Após pedido
de esclarecimento, ele conferiu o terminal e informou não encontrar esse `a`,
atribuindo-o a erro ao copiar/editar o relatório. A transcrição inicial fica
preservada acima e a correção é atribuída ao autor, sem alteração silenciosa.
**Conclusão corrigida de A: sem diferença relatada nos nomes nem nos metadados
exibidos antes/depois, assim como B.** Não se trata de evidência de criação ou
remoção real do banco.

Os quatro `ls` têm metadados exibidos iguais. Tabela sanitizada (sem prompt,
UID/GID ou caminho aleatório de instalação), horários sem fuso informado:

| Caminho relativo | Tipo | Bytes informados | Modificação exibida |
|---|---|---:|---|
| `cache/.expo-dev-launcher` | Diretório | 3452 | 2026-11-10 21:05 |
| `cache/WebView` | Diretório | 3452 | 2026-11-10 21:12 |
| `files/DevLauncherApp-BridgelessReactNativeDevBundle.js` | Arquivo | 7340781 | 2026-11-16 10:00 |
| `files/profileInstalled` | Arquivo | 24 | 2026-11-16 10:00 |
| `no_backup/expo-dev-launcher-installation-id.txt` | Arquivo | 36 | 2026-11-10 21:08 |

O bundle tem tamanho diferente do relatório de 12/11 (7340789 bytes), mas tamanho
igual nos quatro inventários novos. Não há comparação controlada entre sessões
para atribuir a causa. Horários de modificação não são convertidos em hora dos
testes. Em B, nomes e metadados exibidos são iguais entre antes e depois. Em A,
a mesma conclusão é relatada após o esclarecimento de transcrição acima.

Não há inspeção do conteúdo ou metadados dos bancos/preferências/cookies pelo
`ls` fornecido; nada permite excluir alterações internas, filas de telemetria
ou arquivos transitórios. Auditoria DataTransport, rede/reconexão e privacidade
continua pendente; nenhuma tarefa ou critério integral de privacidade foi aceito.

### Rastreio preliminar das dependências, sem acesso ao aparelho

Em 16/11/2026, foram consultados os POMs oficiais de
[text-recognition 16.0.1](https://dl.google.com/dl/android/maven2/com/google/mlkit/text-recognition/16.0.1/text-recognition-16.0.1.pom)
e [ML Kit common 18.11.0](https://dl.google.com/dl/android/maven2/com/google/mlkit/common/18.11.0/common-18.11.0.pom).
O primeiro declara common 18.11.0; este declara DataTransport transport-api 2.2.1,
transport-backend-cct 2.3.3 e transport-runtime 2.2.6. É uma rota transitiva
documentada para a presença de DataTransport, sem depender de o cliente importar
o Firebase clínico do produto. Não é prova de que esses sejam os componentes ou
versões efetivamente resolvidos no APK instalado: Gradle pode selecionar outras
versões entre dependências. Não identifica quem criou o banco observado, o que
ele contém, se houve envio ou quais destinos foram usados. Falta conferir a
árvore resolvida e o comportamento em runtime; nenhuma dependência foi trocada
ou telemetria declarada segura com base apenas nesses metadados públicos.

## Coleta C/D e hash após reinstalação — recebida em 16/11/2026

O autor forneceu nova saída de `sha256sum` do base.apk instalado e de Get-FileHash
do APK local, ambas com o mesmo SHA-256, desconsiderando caixa:

```text
69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c
```

Caminho aleatório de instalação e prompt pessoal omitidos. Esse retorno renova
a correspondência entre APK base instalado e arquivo local no momento da consulta
após a reinstalação; não identifica sozinho o JS servido pelo Metro nem prova
qual binário estava instalado em cada instante anterior.

**Teste C — Home durante revisão: positivo no alcance relatado (parte de S04).**
O autor relata descarte da revisão, ausência da correção 130 ao retornar,
impossibilidade de confirmar aquela revisão, câmera desligada e ausência de
reinício automático. Uma nova captura por gesto explícito trouxe candidatos do
cartão sem recuperar a edição anterior. Não especificou se o app foi recriado
ou preservou a instância ao retornar.

O par de inventários C contém os mesmos 16 nomes já registrados e `ls` iguais.
O bundle tem 7340781 bytes, modificação exibida 2026-11-16 10:45; profileInstalled
tem 24 bytes, modificação 2026-11-16 10:46. Nos dois inventários, os diretórios
cache/.expo-dev-launcher e cache/WebView mantêm os metadados previamente
transcritos, e o arquivo no_backup/expo-dev-launcher-installation-id.txt mantém
36 bytes e modificação 2026-11-10 21:08. Horários sem fuso informado, não tratados
como instantes dos testes. Os horários diferem da coleta A/B, mas são iguais
no par C; não se atribui causa à diferença entre sessões.

**Teste D — cancelar durante OCR: não executado.** Segundo o autor, a fase foi
rápida demais para efetuar o cancelamento. Não registrar como aprovado, falha,
latência medida ou descarte tardio comprovado. Não foram fornecidos inventários
de D. Testes isolados anteriores não substituem a evidência física ausente.

Os inventários C, como A/B, não inspecionam conteúdo de bancos/preferências,
arquivos transitórios ou tráfego. DataTransport e privacidade permanecem em
auditoria; não houve habilitação clínica nem conclusão integral de tarefa.

## Teste E — tentativa de toques repetidos, recebida em 16/11/2026

O autor tentou tocar várias vezes nos botões e não percebeu erros. Relatou que
as ações foram rápidas e acredita que alguns controles ficaram bloqueados após
o primeiro toque; não conseguiu determinar se o segundo toque foi aceito.
Não foram fornecidos contadores de eventos, capturas concorrentes ou trace nativo.

**Resultado: sem erro percebido nas tentativas relatadas, com cobertura parcial
de S05.** Não afirmar que todos os controles receberam dois toques, que houve
disputa concorrente efetiva ou que foi comprovado um único processamento nativo.
Não repetir indefinidamente para tentar vencer o bloqueio da interface.

Os dois inventários E contêm os mesmos 16 nomes já transcritos e `ls` iguais:
bundle 7340781 bytes/modificação 2026-11-16 10:45; profileInstalled 24 bytes/
modificação 2026-11-16 10:46; diretórios de cache e arquivo no_backup mantêm os
metadados listados em C. Saídas sanitizadas por referência à lista/tabela anterior,
sem prompt pessoal, UID/GID ou conteúdo de arquivos. Horários sem fuso informado.
Não há diferença nos nomes e metadados exibidos; o limite sobre conteúdo interno,
arquivos transitórios e rede continua aplicável.

## Teste F — permissões, recebido em 16/11/2026

O autor relata: nenhuma abertura/pedido antes de Iniciar; fase cancelled após
negar; nenhum preview/revisão indevido ou repetição automática de pedidos;
nenhuma abertura automática ao autorizar nas configurações; novo início explícito
abriu preview e cancelamento final funcionou. **S01/S07 positivos no alcance da
rodada combinada relatada.** cancelled é o estado observado; não substituir por
permission-denied ou inferir a sequência interna de callbacks do Android.

Os dois `find` contêm os mesmos 16 nomes. No `ls`, as diferenças apresentadas são:

| Entrada | Antes | Depois | Tamanho exibido |
|---|---|---|---:|
| Diretório `files/.` | 2026-11-16 11:21 | 2026-11-16 11:23 | 3452 em ambos |
| `files/DevLauncherApp-BridgelessReactNativeDevBundle.js` | 2026-11-16 11:21 | 2026-11-16 11:23 | 7340781 em ambos |

Os demais metadados exibidos são iguais: profileInstalled 24 bytes/modificação
2026-11-16 11:21; arquivo no_backup 36 bytes/modificação 2026-11-10 21:08;
diretórios cache/.expo-dev-launcher e cache/WebView mantêm a tabela anterior.
UID/GID e prompt pessoal omitidos; horários sem fuso informado, sem inferir
duração da rodada. Não classificar esse inventário como integralmente igual.

O nome identifica o bundle JS do Dev Client; recarregamento do bundle ao retomar
o aplicativo é uma hipótese compatível com os horários alterados, mas não foi
instrumentado. Não há hash antes/depois desse arquivo para afirmar igualdade de
conteúdo ou causa da regravação. Tamanho igual não prova conteúdo igual. A mudança
não é evidência, por si só, de persistência de imagem; também não comprova sua
ausência. Diretório pode mudar de horário mesmo com nomes finais iguais.

Não foi fornecido conteúdo de mídia nem solicitado conteúdo de bancos. Inventários e
teste funcional não encerram FOT-10–12. Para futuras rodadas, hash somente do
bundle JS pode complementar os metadados, sem exportar arquivo ou payload:

```powershell
& $aferiAdb shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

Esse hash se refere ao arquivo JS no sandbox, distinto do hash do APK e sem
garantia de identificar o JS efetivamente executado em cada instante. Não estender
a coleta para hashes de identificadores, cookies, bancos ou dados clínicos.

## Teste G — bloqueio do telefone, recebido em 16/11/2026

| Observação relatada | G1: bloquear no preview | G2: bloquear na revisão |
|---|---|---|
| Estado ao voltar | cancelled | Revisão/edição 130 descartadas |
| Preview/indicador encerrados | Sim | Câmera permaneceu desligada |
| Candidato/revisão antiga disponível | Não | Confirmação antiga indisponível |
| Retomada automática | Não | Não relatou nova tentativa automática; demais observações limitadas aos campos fornecidos |
| Novo início explícito | Funcionou, assim como cancelamento | Nova captura não recuperou edição anterior |
| Reinício percebido do app | Não, segundo o autor | Não, segundo o autor |

**G1/G2 positivos no alcance relatado de bloqueio no preview e na revisão,
complementando S04.** Ausência de reinício percebido é observação visual; não
comprova continuidade do processo/instância React por instrumentação. Nenhuma
nova captura, log ou dump foi produzido pelo Codex no dispositivo.

O autor informou que os textos dos inventários antes/depois foram idênticos em
cada subteste, sem fornecer novamente as saídas. Registrar como comparação
relatada, sem atribuir a ela tamanhos/horários de rodadas anteriores. O primeiro
retorno não continha valores SHA-256; após esclarecimento, o autor forneceu as
quatro saídas de sha256sum do arquivo
`files/DevLauncherApp-BridgelessReactNativeDevBundle.js`, todas com:

```text
a7b2efd2c07366d300b0e04180157c6e8d44e6ce5e5b4cbc40d7963e18bdf9c2
```

| Coleta | SHA-256 informado |
|---|---|
| Antes de G1 | Igual ao valor acima |
| Depois de G1 | Igual ao valor acima |
| Antes de G2 | Igual ao valor acima |
| Depois de G2 | Igual ao valor acima |

Isso sustenta igualdade do conteúdo desse arquivo nos quatro momentos medidos,
com base nas saídas fornecidas. Não exclui alteração transitória entre coletas
nem identifica sozinho o código em execução. Hash do bundle é distinto de hash
do APK e não comprova igualdade de conteúdo de bancos, preferências ou cookies.

Inventários iguais nesse alcance não excluem mudanças internas em bancos ou
preferências, arquivos transitórios ou tráfego. G não encerra S04 por completo,
privacidade ou TASK-07; rotação e troca de app continuam cenários separados.

## Cobertura atual do roteiro Samsung

Os nove IDs S01–S09 são grupos de cenários, não nove cliques nem nove critérios
integrais de aceite. Situação no alcance recebido, sem marcar tarefas concluídas:

| Grupo | Evidência recebida | Complemento pendente |
|---|---|---|
| S01 | F positivo no alcance relatado | Não ampliar para todas as condições/versões de permissão |
| S02 | Três leituras positivas do cartão sintético | Sem ampliar para displays reais ou acurácia universal |
| S03 | A positivo no preview; D não executado no OCR | Cancelamento em permissão/abertura; OCR permanece não executado enquanto inalcançável |
| S04 | B/C positivos em Home; G1/G2 positivos no bloqueio, no alcance relatado | Troca de app e rotação nas fases aplicáveis; distinguir relayout/recriação |
| S05 | E sem erro percebido, toques aceitos indeterminados | Saída/entrada rápida e liberação; não afirmar concorrência nativa comprovada |
| S06 | Validação/correção/confirmação em memória e cancelamento relatados | Não comprova persistência clínica |
| S07 | F positivo no alcance relatado | Sem retomada automática; não comprova privacidade integral |
| S08 | Sem rodada dedicada relatada | Cartões sintéticos sem pulso, com acessórios e conflitos |
| S09 | Sem rodada dedicada relatada | TalkBack, fonte ampliada e temas disponíveis |

Após G, há **dois grupos sem rodada dedicada recebida** (S08/S09) e **três
parciais com complementos** (S03/S04/S05). S01/S02/S06/S07 têm resultados positivos no
alcance da demo. Isso não é percentual de conclusão da TASK-07. Fora desses nove
grupos, permanecem auditorias de armazenamento/logs/telemetria/rede/reconexão,
displays reais, legado e integração clínica; não há número fixo de execuções
restantes para aceite integral. O próximo bloco cobre rotação no preview e na
revisão, distinguindo relayout de interrupção/recriação; saída/entrada rápida,
S08/S09 e auditoria seguem na sequência.

## Próximas evidências

1. Preservar os pares antes/depois e continuar inventários por cenário, sem
   reconstruir retrospectivamente a inspeção das três rodadas iniciais.
2. Preservar o hash renovado e registrar futuras reinstalações separadamente.
3. Exercitar rotação/troca de app, saída/entrada rápida
   de S05 e S08/S09, conforme a matriz de cobertura.
   Manter D não executado até ser alcançável, sem repetir tentativas indefinidamente
   ou introduzir atraso no produto para simular evidência física.
4. Auditar dependências/telemetria e rede por UID, incluindo reconexão, sem coletar
   mídia ou payload clínico. Não confundir tráfego Metro com reconhecimento.

O [protocolo completo](task-07-integracao-android.md) permanece aplicável. TASK-07,
privacidade integral, amostras de medidores reais, legado conectado, contexto de
conta e persistência clínica continuam pendentes. Horas/despesas/saldos não
informados. Nenhuma mudança funcional, acesso a produção ou habilitação clínica.
