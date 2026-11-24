# TASK-07 — diagnóstico local de OCR e associação

Registro de 24/11/2026, sobre staging `a3b996a67173ed2ca5311f0b10bd82eb232ab35c`.
PR #64 mesclado em `6f7a249`; PR #71 mesclado em `a3b996a`, com fonte `e7256ad`.
Consulta de PRs abertos não retornou entradas no início desta etapa. Checkout
original `work`/`3f8220f` limpo e preservado; implementação em worktree separada,
branch `feat/task-07-diagnostico-associacao`. Reconsultar remoto antes de publicar.

## Mudança e limite

A demo Android acrescenta o marcador JS `associacao-1` e quatro linhas de
diagnóstico da revisão atual. CameraX, ML Kit, parser, dependências, APK e
marcadores `captura-5`/`preview-1` não mudam. É necessário carregar **novo JS**;
o APK já usado na avaliação pode ser mantido. Não reaplicar patches históricos.

O diagnóstico é uma projeção de literais fixos, sem números clínicos, texto OCR,
caixas, confiança, timestamp ou exceções. Não tem logger, envio, arquivo,
clipboard ou persistência. Não entra nas 18 linhas do histórico de controle.
Só aparece após validação do contrato e liberação dos recursos, se a revisão
aceitar a tentativa. Cancelamento, background, recaptura, confirmação e saída
da revisão retiram a projeção; respostas tardias e falha de limpeza não a publicam.
Não há writer/Firebase na demo nem alteração das rotas clínicas ou do manual.

| Código | Interpretação permitida |
|---|---|
| `ocr:sem-linhas-utilizaveis` | O contrato recebido não contém linha com texto não vazio. O nativo já filtra linhas sem boundingBox ou acima do limite de tamanho; não prova ausência de toda saída interna do motor |
| `ocr:linhas-presentes` | Há texto em pelo menos uma linha aceita, sem afirmar que dígitos/rótulos foram reconhecidos corretamente |
| `associacao:SYS/DIA/PUL=candidato` | O parser associou um candidato, sem atestar acerto, faixa clínica ou qualidade do OCR |
| `ausente` | O campo não foi identificado, sem número órfão que o tornasse incerto |
| `incerto-numero-sem-rotulo` | Existe fragmento numérico não associado; não determina qual número ou campo está correto |
| `incerto-ilegivel-ou-distante` | Não houve valor utilizável para o rótulo; pode envolver texto ou geometria conservadora |
| `incerto-rotulo-ambiguo` / `incerto-escala` | Associação ambígua ou escala explícita incompatível; não escolher/trocar números automaticamente |
| `indefinido` | Motivo não previsto na whitelist, sem reproduzir conteúdo recebido |

Os estados descrevem a interpretação **antes de qualquer edição**. Não são
telemetria de acurácia nem prova da causa da dificuldade com o G-Tech BSPII.
Texto não vazio pode conter dígitos incorretos; candidatos válidos também podem
estar errados. As regras conservadoras do parser foram preservadas.

## Uma rodada curta no Windows/Samsung — ainda não executada

Atualização após #72/#73: ambos mesclados; usar a fonte fixa de staging
`81af92f4d3763e1e89f910e01c296decf83b5778` abaixo. Ela contém associacao-1 e a
integração dos testes. Não buscar uma branch móvel para identificar o ensaio.
Isso não altera APK/Kotlin. Os ensaios antigos continuam vinculados a f057283,
sem homologar retroativamente esse JS. Não houve retorno novo nesta retomada.

Não repetir A–K/R1/R2. Usar apenas o cartão sintético já arquivado. A investigação
da telemetria está aberta: esta rodada não pede nova medição real, foto/áudio,
banco, logcat, dump global, limpeza de dados, atualização de SDK ou reinstalação.

Com câmera desligada, encerrar o Metro anterior com Ctrl+C. Em PowerShell,
preservando as cópias integração/TalkBack e escolhendo destino **inexistente**:

```powershell
cd C:\dev\aferi-task07-integracao
git status --short
git fetch origin staging
git cat-file -e '81af92f4d3763e1e89f910e01c296decf83b5778^{commit}'
git worktree add --detach C:\dev\aferi-task07-associacao 81af92f4d3763e1e89f910e01c296decf83b5778
cd C:\dev\aferi-task07-associacao
git rev-parse HEAD
git status --short
npm ci --ignore-scripts
cd demos\android-capture
$aferiAssociacaoNodeOptionsAnteriores = $env:NODE_OPTIONS
$env:NODE_OPTIONS = ($env:NODE_OPTIONS + " --dns-result-order=ipv4first").Trim()
npx --no-install expo start --dev-client --localhost --port 8097
```

Se houver alterações locais, pasta existente ou erro, parar nesse ponto e
retornar só nomes de arquivos/impedimento sanitizado, preservando tudo. Não
usar stash/reset para continuar. Não iniciar outro Metro na mesma porta.

No segundo terminal, usar SDK existente, USB autorizado e o mesmo cliente:

```powershell
$aferiSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$aferiAdb = Join-Path $aferiSdk 'platform-tools\adb.exe'
& $aferiAdb reverse tcp:8097 tcp:8097
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8097/status').Content
```

Esperado: reverse sem erro e `packager-status:running`. Conferir também /status
no navegador do telefone e pressionar `a` no Metro para abrir o cliente já
instalado. Não usar Expo Go. Se caminho SDK/pacote/bundle não corresponder,
relatar impedimento; não instalar por tentativa. Conferir Fast Refresh desligado
e `Associação: associacao-1`; os dois marcadores antigos não identificam o JS.

1. Iniciar e capturar **uma vez** o cartão sintético SYS 120 / DIA 80 / PUL 72.
   Esperado: revisão, preview/indicador encerrados, `ocr:linhas-presentes` e
   os três campos `candidato`, caso o reconhecimento corresponda ao cartão.
   Se divergir, registrar os códigos e se os campos correspondem ao cartão,
   sem repetir até acertar nem atribuir causa ao parser/motor por suposição.
2. Cancelar. Esperado: campos descartados e `Sem diagnóstico de revisão ativa.`;
   nenhuma retomada automática. Não é necessário confirmar ou salvar.
3. Com câmera desligada, obter somente identidade do bundle, no segundo terminal:

```powershell
& $aferiAdb shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

O hash identifica esse arquivo, não prova sozinho o código executado. Não há
hash esperado presumido; não reutilizar o hash do reteste TalkBack. Ao encerrar
Metro, restaurar `$env:NODE_OPTIONS = $aferiAssociacaoNodeOptionsAnteriores`.
Preservar pastas e APK. A ausência do aparelho não impede a auditoria técnica.

Uma única devolução, sem screenshots/texto OCR/valores reais:

```text
HEAD/status; houve reinstalação?; hash bundle ou impedimento;
associacao-1 visível?; Fast Refresh desligado?; recarga/reinício inesperado?;
quatro códigos do painel; campos conferem com o cartão sintético: sim/não;
preview/indicador encerrados?; cancelar retirou campos e diagnóstico?;
erro fixo/impedimento, se houver.
```

## Verificações e pendências

Testes automatizados verificam diferença entre linhas vazias e números não
associados, projeção por whitelist (inclusive motivo adulterado), invariância
ao trocar valores e descarte em cancelamento/background/recaptura/confirmação,
OCR tardio e falha de limpeza. SDK/câmera/estado do app são simulados.

| Verificação executada | Resultado / alcance |
|---|---|
| npm ci --ignore-scripts | Lock preservado; sem dependências novas |
| npm run lint | Aprovado após retirar atualização de estado síncrona de efeito apontada na primeira passagem |
| npm run typecheck e tsc da demo Android | Aprovados |
| Jest completo, --ci --runInBand | 737 testes / 67 suítes aprovados, 11 casos novos; inclui legado e guardrails com portas simuladas |
| Três suítes focadas de diagnóstico/coordenador/hook | 40 testes aprovados |
| Expo export Android/Hermes da demo | Aprovado; bundle não compila Kotlin/APK nem executa câmera/SDK/SO |
| npm run test:rules | Bloqueado ao baixar cloud-firestore-emulator-v1.21.0.jar de storage.googleapis.com; regras não executaram/compilaram no emulador local |
| AARs públicos / JDK 21 javap | Dois hashes conferidos; inspeção estática documentada, sem SDK executado |

Functions e rules não foram alteradas. Os checks de App, Functions e Security
Rules do novo PR devem ser consultados separadamente antes de qualquer merge;
autorização desta etapa não inclui merge/deploy.

Sem execução física nesta etapa, sem compilação Kotlin/APK ou homologação de
SDK/SO. TASK-07 permanece aberta, assim como privacidade, medidor real, corpus,
comparação e integração clínica. Horas/despesas/saldos não informados. A
[auditoria](task-07-auditoria-dependencias.md#serialização-e-transporte-do-identificador)
documenta o avanço independente nos artefatos públicos; o
[ponto de retomada](task-07-rodada-tecnica-consolidada.md) preserva os relatos anteriores.
