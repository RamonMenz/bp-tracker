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
| Tocar em Confirmar revisão em memória e observar mensagem/valores finais | Ainda não explicitado no retorno; solicitado esclarecimento, sem presumir que botão habilitado equivale a confirmação executada |

Validação e habilitação do botão têm evidência relatada; S06 permanece parcial.
Não há prova de escrita clínica; a demo continua somente em memória. Esta rodada
não encerra FOT-05/FOT-06/FOT-07 ou os cenários de cancelamento em outras fases.

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

## Próximas evidências

1. Esclarecer se houve o gesto de confirmar a revisão em memória e quais mensagem
   e valores foram exibidos depois; registrar separadamente de botão habilitado.
2. Preservar os pares antes/depois e continuar inventários por cenário, sem
   reconstruir retrospectivamente a inspeção das três rodadas iniciais.
3. Exercitar cancelamento/interrupções/concorrência/permissões S01/S03–S05/S07,
   verificando explicitamente descarte e ausência de restauração; depois S08/S09.
4. Auditar dependências/telemetria e rede por UID, incluindo reconexão, sem coletar
   mídia ou payload clínico. Não confundir tráfego Metro com reconhecimento.

O [protocolo completo](task-07-integracao-android.md) permanece aplicável. TASK-07,
privacidade integral, amostras de medidores reais, legado conectado, contexto de
conta e persistência clínica continuam pendentes. Horas/despesas/saldos não
informados. Nenhuma mudança funcional, acesso a produção ou habilitação clínica.
