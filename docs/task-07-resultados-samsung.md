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
| Identidade do APK instalado | Pendente: consulta `pm path` falhou por ausência de dispositivo ADB. Sucesso posterior do `run-as` confirma presença/acesso ao pacote de avaliação nesse momento, mas não vincula seu binário ao hash do arquivo APK |

Cartão sintético esperado: SYS 120 / DIA 80 / PUL 72. Não é display de medidor real.

| Rodada | Sistólica | Diastólica | Pulso | Preview fechou | Indicador apagou | Erro ou recarga percebidos |
|---|---:|---:|---:|---|---|---|
| 1 | 120 | 80 | 72 | Sim | Sim | Não |
| 2 | 120 | 80 | 72 | Sim | Sim | Não |
| 3 | 120 | 80 | 72 | Sim | Sim | Não |

**S02 positivo no alcance relatado**: três percursos até a revisão, fechamento
visual do preview e indicador apagado. Sem tempos, profiler ou captura instrumental
de liberação. Não converter as três rodadas em acurácia estatística, cobertura
de displays reais ou garantia de descarte físico da memória. Não há resultado
recebido para S01/S03–S09, confirmação em memória ou inspeção de rede/offline.

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

## Próximas evidências

1. Com USB funcional, repetir `pm path` e, se permitido pelo Android, comparar
   SHA-256 do APK base instalado com o arquivo informado. Presença do pacote,
   marcadores e hash local isoladamente não identificam o binário em execução.
2. Usar o inventário atual como referência para novas rodadas controladas;
   identificar cenário e momentos antes/depois sem reconstruir o passado.
3. Executar S06: correção, validação e confirmação somente em memória; depois
   cancelamento/interrupções/concorrência/permissões S01/S03–S05/S07 e S08/S09.
4. Auditar dependências/telemetria e rede por UID, incluindo reconexão, sem coletar
   mídia ou payload clínico. Não confundir tráfego Metro com reconhecimento.

O [protocolo completo](task-07-integracao-android.md) permanece aplicável. TASK-07,
privacidade integral, amostras de medidores reais, legado conectado, contexto de
conta e persistência clínica continuam pendentes. Horas/despesas/saldos não
informados. Nenhuma mudança funcional, acesso a produção ou habilitação clínica.
