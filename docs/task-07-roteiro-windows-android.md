# TASK-07 — roteiro Windows/Android após a depuração

Atualizado em **11/11/2026 (UTC)** com o que foi aprendido no chat.
[Registro completo e limites das evidências](task-07-registro-validacao-android.md).

Este roteiro usa o cliente isolado de avaliação, não as rotas clínicas do produto.
Estado ensaiado: **`captura-5` / `preview-1`**, cartão sintético 120/80/72 e Fast
Refresh desativado. Os comandos abaixo são instruções de reprodução; listá-los
não significa que todos foram novamente executados nesta documentação.

## 1. Conferir a cópia antes de executar

Usar pasta curta e sem acentos, como `C:\dev\aferi-task07`. Não mover nem apagar
uma cópia com trabalho local sem antes preservá-la. Git não identifica alterações
não commitadas pelo hash do HEAD; registrar também o diff, de forma sanitizada.

```powershell
cd C:\dev\aferi-task07
git branch --show-current
git rev-parse HEAD
git status --short
```

Na cópia já testada pelo autor, os patches foram aplicados. **Não reaplicar** os
incrementais nem o consolidado sobre ela. O consolidado arquivado é para o Codex
integrar/revisar em uma base limpa compatível com `d94e5f3`, não uma instrução para
alterar a cópia que funciona.

O checkout inicial do arquivamento (`work`/`3f8220f`) não continha a demo.
Posteriormente, o PR #64 foi mesclado em staging (`6f7a249`), somente com documentos.
A [integração funcional](task-07-integracao-android.md) usa a branch
`fix/task-07-captura-android` baseada nessa staging e explica como preservar a
cópia Windows já testada. Consultar o PR da integração antes de presumir que as
correções estão em staging.

## 2. Pré-requisitos e dependências

- Android Studio/SDK instalado; JDK compatível com o projeto; registrar versões
  efetivas, sem supor que `targetSdk` seja a versão do telefone.
- Celular desbloqueado, opções do desenvolvedor/depuração USB habilitadas e cabo
  de **dados**. Aceitar no aparelho a autorização do computador.
- Instalar dependências pelo lock da raiz em uma cópia preparada, sem atualização
  de versões. Não reinstalar a cada tentativa nem criar lock separado na demo.
- Usar Dev Client com o módulo nativo próprio. Expo Go não contém esse módulo.

Se for necessária uma instalação nova das dependências, o procedimento de origem
usa `npm ci --ignore-scripts` **na raiz**. Avaliar o estado local antes: `npm ci`
recria `node_modules`. Esta documentação não afirma que esse comando foi o exato
utilizado inicialmente no computador do autor.

## 3. ADB e SDK

```powershell
$aferiSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$aferiAdb = Join-Path $aferiSdk "platform-tools\adb.exe"

Test-Path $aferiAdb
& $aferiAdb devices -l
```

Esperado: um dispositivo com estado `device`. Lista vazia requer verificar
cabo/porta/driver USB e depuração. `unauthorized` requer autorização no telefone.
Não compartilhar o serial exibido pelo ADB. Revalidação adicional, se necessária:

```powershell
& $aferiAdb shell getprop ro.product.model
& $aferiAdb shell getprop ro.build.version.release
& $aferiAdb shell getprop ro.build.version.sdk
```

Esses três comandos de inventário são propostos para preencher dados faltantes;
não foram fornecidos como resultado do ensaio. Havendo mais de um aparelho,
selecionar localmente o alvo correto antes de executar comandos.

Definir o SDK para o terminal atual:

```powershell
$env:ANDROID_HOME = $aferiSdk
Test-Path $env:ANDROID_HOME
```

Esse caminho funcionou no computador observado. Se `Test-Path` retornar falso,
consultar o SDK Location do Android Studio. Como alternativa, Gradle aceita
`demos/android-capture/android/local.properties` com `sdk.dir` local válido;
não versionar esse arquivo nem copiar um caminho de outra máquina.

## 4. Compilar, instalar e abrir

Na cópia que contém a implementação final:

```powershell
cd C:\dev\aferi-task07\demos\android-capture
npx --no-install expo run:android --device --port 8097
```

Selecionar o Samsung, manter USB autorizado e aguardar Gradle, instalação e
carregamento terminarem. Primeiro build pode baixar SDK/NDK e compilar centenas
de tarefas; duração não é medida de latência do reconhecimento.

Não executar esse comando em `C:\Users\<perfil>` nem na raiz do produto. A pasta
do perfil não resolve o Expo local; a raiz carrega `app.config.ts` e pode exigir
Firebase. A demo usa `app.json` próprio e não precisa de credenciais do produto.

Alterações em Kotlin/Java/Gradle exigem novo build/instalação. Alterações somente
em JS/TS/estilo podem ser carregadas pelo Metro; QR Code/reload não atualiza o
código nativo do APK.

Se APK já estiver instalado e não houver alteração nativa, iniciar somente Metro:

```powershell
cd C:\dev\aferi-task07\demos\android-capture
npx --no-install expo start --dev-client --port 8097
```

Usar uma sessão de Metro na porta. Abrir a sessão pelo aplicativo/QR Code quando
necessário; aguardar o carregamento antes de iniciar a câmera. Não pressionar
repetidamente atalhos de abertura/reload durante a captura.

`adb reverse tcp:8097 tcp:8097` é alternativa de encaminhamento da porta via USB,
não evidência de OCR offline nem de privacidade. A sessão relatada usou QR Code
com URL da LAN; não foi documentado uso efetivo do reverse.

## 5. Evitar interferência do Fast Refresh

1. Com app e Metro abertos, pressionar `m` no terminal do Metro para abrir o menu
   de desenvolvimento.
2. Desativar **Fast Refresh**. Se a ação exibida for **Enable/Ativar Fast Refresh**,
   ele já está desativado; não o ativar.
3. Fazer uma única recarga e aguardar o carregamento terminar.
4. Manter arquivos do projeto sem alterações durante os ensaios.
5. Conferir a opção novamente em nova instalação/perfil, sem presumir que foi
   preservada. Quando o código mudar, recarregar conscientemente entre ensaios.

No chat, o autor informou que “Atualizando” parou de aparecer após esse ajuste.
O gatilho específico do watcher não foi capturado; não atribuir a causa exata a
um arquivo, editor ou NativeWind sem nova evidência. Desativar Fast Refresh não
dispensa testes de cleanup/reinício nem deve enfraquecer cancelamento por background.

## 6. Ensaio positivo já observado

Usar o [cartão sintético arquivado](evidencias/task-07-android-2026-11-11/cartao-sintetico-sys120-dia80-pul72.png)
em outra tela ou impresso; enquadrar o cartão inteiro com iluminação suficiente,
sem reflexos e sem dados pessoais ao redor. Não é um display real de medidor.

1. Conferir cabeçalho **Aferi: diagnostico de captura 5**.
2. Tocar em **Iniciar câmera Android**. O módulo só é carregado sob demanda;
   `Nativo: nao-carregado` antes do primeiro toque é esperado.
3. Após o carregamento, conferir **Nativo: preview-1**, imagem ao vivo e fase ready.
   A versão atual deve habilitar Capturar depois do sinal STREAMING do preview.
4. Enquadrar o cartão e tocar uma vez em **Capturar e reconhecer**.
5. Conferir fase reviewing e candidatos **sistólica 120 mmHg, diastólica 80 mmHg,
   pulso 72 bpm**. São valores sintéticos esperados, não um dado do paciente.
6. Cancelar a revisão/iniciar outra captura para repetir. Confirmação, quando
   testada nessa demo, é apenas em memória; não alegar salvamento no histórico.

O autor relatou três repetições aparentemente corretas após desativar Fast
Refresh. Preservar a natureza de relato, sem inventar tempos/resultados por rodada.

## 7. Se houver falha

| Sintoma | Ação e informação útil |
|---|---|
| Sem dispositivo/ADB desconecta | Conferir `devices -l`, USB/depuração/autorização; ocultar serial ao compartilhar. Build pode ter concluído antes da desconexão |
| Exige Firebase | Confirmar a pasta da demo. Não preencher produção como atalho |
| Caminho com caracteres corrompidos | Preservar cópia e usar caminho curto sem acentos; não substituir versões de plugins por tentativa |
| SDK não localizado | Conferir SDK real e `ANDROID_HOME` no mesmo terminal; configuração local não deve ser versionada |
| Expo 58 sugerido por npx | Conferir diretório e dependências locais; não aceitar atualização incidental |
| Cabeçalho antigo ou `frame-1` no campo Nativo | Conferir sessão Metro e instalação do APK atualizado. Não confundir com formato `frame-1` dos metadados de falha |
| Preview preto | Não dar reload imediatamente: aguardar até 20 s e registrar fase/marcador e o erro fixo. Não capturar dados pessoais para demonstrar a falha |
| `frame-failed` | Registrar códigos e metadados técnicos projetados no painel. Não pressupor erro da imagem, de enquadramento ou do parser; pode falhar antes do OCR |
| “Atualizando” | Conferir Fast Refresh e ausência de alterações; se persistir, guardar trecho do Metro no momento e dizer se fechou câmera ou só exibiu faixa |
| `cleanup-failed`/blocked | Parar novas tentativas, cancelar/sair e registrar o estado para correção; não burlar a exclusão de recursos |

Não fornecer logcat completo, dump de memória, QR Code, credenciais ou conteúdo
clínico. Compartilhar apenas erros/estados/metadados necessários e sanitizados.

## 8. Próximo roteiro, ainda pendente

Executar os [casos S01–S09, inspeção de armazenamento/rede e modelo de devolução](task-07-integracao-android.md#protocolo-no-samsung--execução-pendente)
preparados na integração funcional. O protocolo identifica fonte/APK e resultado
por cenário. As três repetições do cartão não aprovam esses casos.

Antes de homologação clínica, faltam também integração Git, identidade final de
fonte/APK, contexto de conta/consentimento, schemas/rules, legado/acessibilidade
e Firebase de homologação identificado. Nenhum comando deste roteiro publica
serviços ou modifica produção.
