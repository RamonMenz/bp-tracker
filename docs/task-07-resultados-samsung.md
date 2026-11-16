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
não foi fornecido novo hash do APK instalado. O hash verificado em 12/11 não é
usado para identificar automaticamente o APK desta nova sessão.

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
listagem. A diferença do sufixo `a` foi destacada pelo próprio autor. Foi pedido
esclarecimento sobre saída original versus erro de transcrição. **Não foi
corrigida silenciosamente nem considerada prova de criação/remoção real.**
Nova listagem atual pode informar o nome presente, mas não reconstruir o anterior.

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
metadados exibidos são iguais, com a ressalva do nome divergente no `find`.

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

## Próximas evidências

1. Preservar os pares antes/depois e continuar inventários por cenário, sem
   reconstruir retrospectivamente a inspeção das três rodadas iniciais.
2. Renovar a identidade do APK após a reinstalação e esclarecer `journala`.
3. Exercitar Home durante revisão, cancelamento durante OCR quando alcançável,
   concorrência e permissões; depois demais interrupções, S08/S09. Não repetir
   A/B como substituto dos casos restantes de S03/S04.
4. Auditar dependências/telemetria e rede por UID, incluindo reconexão, sem coletar
   mídia ou payload clínico. Não confundir tráfego Metro com reconhecimento.

O [protocolo completo](task-07-integracao-android.md) permanece aplicável. TASK-07,
privacidade integral, amostras de medidores reais, legado conectado, contexto de
conta e persistência clínica continuam pendentes. Horas/despesas/saldos não
informados. Nenhuma mudança funcional, acesso a produção ou habilitação clínica.
