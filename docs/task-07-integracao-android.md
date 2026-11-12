# TASK-07 — integração das correções Android

> **Evidência posterior recebida em 12/11/2026:** [três rodadas S02 e inventário
> posterior relatados no Samsung](task-07-resultados-samsung.md). Resultado positivo
> limitado ao cartão sintético; identidade do APK instalado e privacidade pendentes.

Retomada em **11/11/2026**. Base remota: `staging`
`6f7a2494426cfa470cc9be40d60b1da72abc06af`. Branch:
`fix/task-07-captura-android`. **TASK-07 permanece parcial.**

## Estado recebido e mudanças

O checkout inicial estava limpo em `work`/`3f8220f`. O fetch configurado abrangia
apenas main; staging e a branch documental foram buscadas explicitamente, sem
reset, stash ou alteração de work. Não houve acesso ao Windows do autor.

O [PR #64](https://github.com/RamonMenz/bp-tracker/pull/64) está **mesclado**:
documentação `e5ba82278ede784c336c4f5a0eb9f44aa747d9c7`, merge `6f7a249`.
Seu [CI](https://github.com/RamonMenz/bp-tracker/actions/runs/42950544897) concluiu
com sucesso. A consulta inicial de PRs abertos não retornou outros PRs. Isso não
aplica as correções funcionais nem homologa o dispositivo.

Esta etapa porta o [consolidado arquivado](evidencias/task-07-android-2026-11-11/aferi-task07-consolidado.patch)
para código executável. Antes dos ajustes abaixo, as **15 fontes** corresponderam
aos hashes UTF-8/LF do manifesto; tamanho/hash dos **11 artefatos históricos**
também foram conferidos. Os artefatos e o manifesto foram preservados.

- Sessão por setup de efeito; cleanup invalida a antiga e uma barreira aguarda
  liberação, inclusive em reinícios consecutivos. Falha mantém bloqueio.
  Background e retorno não reiniciam a câmera automaticamente.
- Permissão consultada por tentativa antes de solicitar diálogo. Aceite tardio
  não reativa tentativa cancelada; revogação continua verificável.
- CameraX filtra resoluções pela política de FrameBytes: dimensões pares e teto
  de 1.920.000 pixels. Mantidos CameraX 1.5.1 e ML Kit embarcado 16.0.1.
- Preview com layout Android do Expo e modo COMPATIBLE; ready depende de
  STREAMING. Captura nativa também verifica readiness; observador removido no
  fechamento. Cópia YUV→NV21 e OCR mantidos no caminho de memória existente.
- Tailwind local e entrada diagnóstica reproduzem a demo. Mantidos marcadores
  `captura-5`/`preview-1`, no máximo 18 eventos de controle em memória e projeção
  de metadados técnicos validados, sem pixels, OCR ou exceções arbitrárias.

Diferenças frente às fontes reconstruídas: o hook usa `useRef` para o controle
mutável da sessão, compatibilizando React/ESLint, em vez de mutar um objeto de
`useState`. O harness documenta suas dependências dinâmicas e exercita duas
recargas antes da liberação. O teste do adaptador preserva o mock RN do preset
Jest/Expo e espiona apenas PermissionsAndroid.check; substituir RN inteiro
quebrava Platform.select no preset. Os demais **12 arquivos portados** mantêm os
hashes do manifesto; módulo nativo sem mudanças adicionais.

Diagnóstico temporário mantido para a avaliação isolada; sua redução antes da
integração clínica continua pendente. Dependências/locks, rotas clínicas, writer,
schema, rules, índices e manual não foram alterados. Confirmar na demo continua
**somente em memória**, sem Firebase ou fila clínica.

## Verificações desta etapa

Node 24.19.0, npm 11.9.0 e OpenJDK 21.0.12.1. Instalação pelo lock, sem scripts.
A primeira instalação falhou ao escrever no cache padrão; repetição com cache
em `/tmp` concluiu sem mudar o lock.

| Verificação | Resultado / alcance |
|---|---|
| Lint | Aprovado sem erros ou avisos |
| TypeScript raiz e demo Android | Aprovados |
| Jest completo | 66 suítes / 718 testes aprovados, incluindo 44 nas quatro suítes focadas Android; SDK, permissões e app state simulados |
| Regressão de reinício de efeito | Falha na staging anterior à correção e passa nesta integração, em cópia temporária separada |
| Java FrameBytesTest | 8 checks de buffers e 11 de dimensões aprovados, sintéticos |
| Prebuild e export Android/Hermes | Aprovados; não são compilação Kotlin/APK nem medição de RAM |
| Resolução Expo/autolinking | Foto presente na demo e ausente do produto; Firebase/Google Sign-In/voz excluídos da demo |
| Functions: build e Jest | Aprovados, 16 testes; código não alterado |
| test:rules, projeto demo-aferi-task11 | Testes não executaram: falhou download do JAR Firestore 1.21.0 em storage.googleapis.com |
| Gradle :app:assembleDebug | Não compilou Kotlin/APK: wrapper falhou com UnknownHostException: services.gradle.org. SDK/ADB/aparelho também ausentes |

Jest emitiu avisos de act na suíte de tema não alterada, sem falha de teste.
Prebuild avisou sobre expo-system-ui opcional; não foi acrescentada dependência
para silenciar o aviso. Checks remotos do novo PR devem ser conferidos
separadamente; CI do #64 não valida este código. Nenhuma operação de produção.

## Protocolo no Samsung — execução pendente

Preservar a cópia que funciona. Na cópia Git existente, buscar a branch e criar
worktree em pasta **nova e inexistente**, sem reaplicar patches históricos:

```powershell
cd C:\dev\aferi-task07
git status --short
git fetch origin fix/task-07-captura-android
git worktree add --detach C:\dev\aferi-task07-integracao FETCH_HEAD
cd C:\dev\aferi-task07-integracao
git rev-parse HEAD
git status --short
npm ci --ignore-scripts
cd demos\android-capture
npx --no-install expo prebuild --platform android --no-install
npx --no-install expo run:android --device --port 8097
```

Se a pasta nova existir, escolher outra sem apagá-la. Usar cliente isolado
com.ramonmenz.afericapturetest; não preencher Firebase nem usar Expo Go.
Recompilar é necessário: reload não instala Kotlin. A instalação atualiza o
cliente isolado do telefone; não apagar dados para limpar evidências.
Seguir [SDK/ADB e Fast Refresh](task-07-roteiro-windows-android.md), mantendo
uma sessão Metro, Fast Refresh desativado e arquivos sem edição no ensaio.

Registrar HEAD/status, modelo/Android/API pelos getprop do roteiro e versões
Node/npm/JDK. Na pasta da demo, identificar o APK recém-compilado/instalado:

```powershell
node --version
npm --version
java -version
Get-FileHash -Algorithm SHA256 .\android\app\build\outputs\apk\debug\app-debug.apk
```

Hash do arquivo não prova sozinho o APK instalado: registrar também sucesso da
instalação e marcadores da UI. Ocultar serial, caminhos pessoais e QR Code.
Se houver diff, devolver nomes/descrição sanitizada; não enviar diff com segredos.

| Caso | Ação | Esperado / evidência segura |
|---|---|---|
| S01 | Abrir sem iniciar; iniciar e negar; depois autorizar por nova ação | Sem câmera no início, recusa segura e sem loop. Se diálogo causar background, novo toque após conceder; não retomar sozinho |
| S02 | Cartão sintético 120/80/72 três vezes, sem reload | Preview visível antes de Capturar; uma revisão por rodada, valores conferidos, câmera liberada. Registrar rodadas separadas, sem inferir taxa de acurácia |
| S03 | Cancelar em permissão, abertura, preview e OCR | Sem revisão tardia; indicador de câmera apaga; nova tentativa só após liberação. Fase rápida demais: não executada |
| S04 | Home, trocar app, bloquear e girar durante captura e revisão | Background/destruição abandona fluxo; retorno não reativa. Anotar se rotação causou recriação/background ou só relayout; neste último, verificar preview e valores sem declarar interrupção testada |
| S05 | Toques rápidos e saída/entrada rápida | Uma tentativa/OCR; sem candidato antigo. Closing aguarda ACK; blocked/cleanup-failed exige parar e relatar |
| S06 | Corrigir SYS para 130, invalidar SYS≤DIA, cancelar, recapturar e confirmar | Inválidos bloqueados, cancelamento limpa; confirmação explícita só em memória, sem mensagem de gravação clínica |
| S07 | Revogar câmera nas configurações, voltar e tentar por gesto | Permissão reavaliada, recusa segura, sem acesso indevido nem retry automático |
| S08 | Cartões próprios sem PUL, com números acessórios e rótulos conflitantes | Ausências/incertezas, sem completar por histórico ou trocar campos; separar falhas do OCR e parser |
| S09 | TalkBack, fonte ampliada e temas disponíveis | Controles, erros e revisão operáveis, sem corte dos números ou dependência exclusiva de cor |

Usar UI/indicador e profiler ao vivo, sem heap dump ou buffers. Não prometer
cancelamento físico instantâneo do ML Kit: lease permanece ocupado enquanto usa
o buffer; falha de liberação bloqueia novas tentativas. Sem garantia de sobrescrita
física da RAM. As três repetições antigas são relato, não execução destes casos.

### Armazenamento e rede

Antes/depois de sucesso, cancelamento, erro, background e reinício, inspecionar
**somente** o sandbox isolado, sem ler/copiar conteúdos. A variável aferiAdb é
definida no roteiro Windows:

```powershell
& $aferiAdb shell run-as com.ramonmenz.afericapturetest find . -type f
& $aferiAdb shell run-as com.ramonmenz.afericapturetest ls -la files cache no_backup
```

Pastas podem não existir. Comparar metadados localmente e separar assets/modelo/
Dev Client de mídia/resultados. Qualquer persistência de captura/resultado clínico
reprova o caminho: parar e devolver só classe/local relativo sanitizado. Inventário
estável não exclui arquivos transitórios criados/apagados entre observações.

Após carregar o bundle, ensaiar em modo avião, mantendo JS em memória. Anotar
USB/reverse e eventual acesso ao Metro; isso não equivale a ausência total de
rede. Se não carregar, registrar impedimento, sem declarar falha de OCR nem
introduzir fallback. Observar tráfego por UID com rede ativa e na reconexão:
ferramenta, destinos e contadores, sem payload/pcap. Separar Metro/assets de
reconhecimento; inspector Java não cobre todo tráfego nativo. Offline positivo
não prova ausência de filas ou arquivos internos.

### Devolução sanitizada

```text
Fonte: branch/HEAD; status limpo ou nomes de arquivos alterados
APK: SHA-256 do arquivo; instalação concluída: sim/não/não verificado
UI: captura-5 / preview-1 (ou observado)
Ambiente: modelo; Android/API; Node/npm/JDK; Fast Refresh; rede/USB/reverse
Caso/fase: Sxx / permissão-abertura-preview-OCR-revisão
Resultado: passou/falhou/não executado; esperado versus observado
Câmera: indicador/liberação; ferramenta e alcance
Privacidade: cenário, inventário antes/depois, rede/reconexão, alcance/limite
Erro: somente código fixo/metadados projetados; sem logcat completo
```

Não enviar fotos capturadas, OCR bruto, pacientes, serial, credenciais, APK,
dumps ou corpus identificável. Cartões não substituem displays próprios de dois
modelos. Persistência clínica, contas/consentimento, Firebase de homologação e
legado conectado seguem pendentes e fora deste cliente. Nenhuma tarefa encerrada;
horas, despesas e saldos reais não informados. Sem merge, deploy ou habilitação
clínica automática nesta entrega.
