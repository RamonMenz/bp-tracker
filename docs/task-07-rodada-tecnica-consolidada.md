# TASK-07 — continuidade, rodada técnica e resultados consolidados

> **Retomada após #72/#73 em 24/11/2026:** ambos confirmados mesclados;
> staging consultada `81af92f4d3763e1e89f910e01c296decf83b5778`. #64 também
> confirmado mesclado, com fonte documental e5ba822 e merge 6f7a249. Nenhum PR
> aberto retornado na consulta inicial desta retomada. Retratos anteriores abaixo
> são históricos. Checkout work/3f8220f limpo preservado; nova worktree isolada,
> branch docs/task-07-auditoria-produtores, baseada na staging consultada.
> CI do head #73/66cfbf4 concluído com sucesso na
> [execução 45424685209](https://github.com/RamonMenz/bp-tracker/actions/runs/45424685209).
> Novo avanço: [produtores e rota adicional de telemetria](task-07-auditoria-dependencias.md#produtores-de-eventos-e-limites-da-inspeção).
> A rodada associacao-1 permanece sem retorno físico registrado; usar a
> [fonte fixa e protocolo atualizados](task-07-diagnostico-associacao.md).
> Sem novo ensaio físico ou conclusão de tarefa. Não repetir A–K/R1/R2.

## Verificações da retomada após #73

Entrega documental; revisão do coordenador/hook/adaptador não motivou mudança
funcional nesta etapa. Sem novos testes artificiais para espelhar documentação.
Código, locks, regras, fontes nativas e artefatos históricos preservados.

| Verificação executada | Resultado / limite |
|---|---|
| Instalação pelos locks, raiz e Functions | Aprovada com --ignore-scripts; nenhuma dependência atualizada |
| npm run lint | Aprovado |
| npm run typecheck + tsc --noEmit -p demos/android-capture/tsconfig.json | Aprovados |
| npm test -- --ci --runInBand | 742 testes / 67 suítes aprovados; avisos preexistentes de act em edição/tema, sem falha |
| Functions: build e Jest --runInBand | 16 testes / 1 suíte e compilação aprovados; Node local 24.19.0 diverge do 20 declarado, aviso EBADENGINE preservado |
| npm run test:rules | Bloqueado no download do JAR Firestore 1.21.0 de storage.googleapis.com, antes da execução das regras; projeto fictício demo-aferi-task11 |
| Manifesto histórico | Tamanho e SHA-256 dos 11 artefatos conferidos; nenhum patch reaplicado |
| Links e whitespace | 36 links/âncoras locais dos três documentos conferidos; git diff --check aprovado |
| AARs públicos | Três hashes conferidos, javap/JDK 21; sem execução do SDK |

CI desta entrega deve ser consultado no novo PR. A aprovação remota da #73
citada acima pertence ao head 66cfbf4 e não substitui checks do novo head.
Sem build Kotlin/APK, dispositivo, produção, merge, deploy ou habilitação clínica.
TASK-07/10/18 continuam parciais. Pendências: auditoria completa do SDK/SO,
retorno associacao-1, displays reais/corpus/comparação e integração clínica com
confirmação/fila/contas/legado em homologação. Horas/despesas/saldos não informados.

> **Integração posterior ao merge #72:** staging avançou para `f901bbb`;
> a branch do PR #73 incorporou essa base em `f038d6f`. Uma expectativa do
> teste de OCR tardio ainda exigia dois argumentos; foi ajustada para conferir
> também os quatro códigos fixos do diagnóstico introduzido pela #72, mantendo
> identidade da tentativa, candidato de B e entrega única. A falha foi reproduzida
> antes do ajuste. Lint, TypeScript raiz/demo e 742 testes/67 suítes combinados
> passaram. Nenhum código funcional foi alterado por essa correção. Os ensaios
> físicos continuam vinculados a f057283; não homologam retroativamente o novo JS.

> **Retomada posterior em 24/11/2026:** PR #71 confirmado mesclado, fonte
> `e7256ad`, merge/staging `a3b996a`. O retrato Git abaixo preserva a consulta
> anterior ao merge. Continuidade em [diagnóstico de associação](task-07-diagnostico-associacao.md)
> (novo JS `associacao-1`, sem alterar APK/parser) e na
> [auditoria de serialização/transporte](task-07-auditoria-dependencias.md#serialização-e-transporte-do-identificador).
> Sem nova execução física ou aceite de privacidade; não repetir A–K/R1/R2.

Rodada técnica registrada em 24/11/2026, baseada na staging 8e2d132 (PRs #69/#70
mesclados) e no trabalho documental do PR #71. Sem acesso ao Windows/Samsung.
Não conclui TASK-07, privacidade ou habilitação clínica.

## Ponto de retomada — consolidação do aprendizado deste chat

Atualizado em 24/11/2026 a pedido do autor, para permitir retomada sem depender
de memória da conversa ou acesso a outros chats. Este é o índice de continuidade;
os documentos vinculados preservam detalhes e correções históricas. Datas de
registro não são datas presumidas de execução dos testes.

### Estado verificado do Git nesta consolidação

- Repositório RamonMenz/bp-tracker; destino autorizado dos PRs: staging.
- PR #69 mesclado em 64aa395aa0794bd9861dc6a7cfd877ecd5f86d18; PR #70 mesclado
  em 8e2d132f5fa7c0f53eb57cf4bb3a8efc6b518207, que é a staging consultada.
- PR #71 aberto, não mesclado; branch docs/task-07-sdk-dependency-insight.
  Checkpoint anterior a esta consolidação: 554469e0de485bb2ad3ba8c45fb9d77bdc4a7a7e.
  Novos commits documentais não exigem trocar APK/JS. Reconsultar head/checks/base
  antes de decisões futuras; estes dados são um retrato, não estado permanente.
- As cópias locais existentes foram preservadas. Não aplicar patches históricos
  sobre o código atual nem apagar worktrees para retomar.
- Se, após outro merge em staging, GitHub exigir atualização do PR: incorporar
  a base na branch do PR e aguardar checks do novo head. Checks antigos verdes
  não dispensam essa exigência; atualizar branch não faz merge do PR na staging.

### Onde encontrar cada evidência

| Documento | Conteúdo / uso |
|---|---|
| [Registro inicial](task-07-registro-validacao-android.md) e [artefatos históricos](evidencias/task-07-android-2026-11-11/README.md) | Depuração, patches e manifesto; preservar bytes/hashes e não executar automaticamente |
| [Roteiro Windows](task-07-roteiro-windows-android.md) | SDK/ADB, build, Metro e diagnóstico inicial |
| [Integração Android](task-07-integracao-android.md) | Correções integradas, contratos e protocolo original S01–S09 |
| [Resultados Samsung](task-07-resultados-samsung.md) | Rodadas originais e A–K, inventários, hashes e esclarecimentos de transcrição |
| [Reteste TalkBack](task-07-reteste-talkback.md) | Correção do PR #70, carregamento do JS e retorno K1 |
| [Auditoria de dependências](task-07-auditoria-dependencias.md) | Falha/recuperação SDK, Gradle resolvido, AARs, UID/netstats e limites de rede |
| Este documento, seções abaixo | Testes técnicos, R1/R2, descrição BSPII e rastreio de identidade do SDK |
| [tasks.md](../tasks.md) e [spec fotografia](../specs/spec-fotografia.md) | Tarefas ainda abertas, critérios aplicáveis e decisões técnicas preservadas |

### Baseline que não deve ser confundida

- Samsung S25 FE, SM-S731B; Android/API 17/37 declarados. Compile/target SDK 36
  são configuração de build, não versão do Android do telefone.
- Windows: Node/npm/JDK v24.22.0/11.19.1/17.0.21 informados na primeira coleta;
  não presumir que continuem instalados em outra máquina/sessão.
- Cópia C:\dev\aferi-task07-integracao em 4dc010599747bcb6de2b5e2f939f030e9cbe4ea8,
  limpa na consulta recebida: projeto Android gerado usado no build/Gradle.
- Cópia C:\dev\aferi-task07-talkback em f057283876ea2126b485abd762e2886012b4c7ca,
  limpa na preparação R1/R2: JS com correção acessível. Pasta da demo para Metro:
  demos/android-capture. Não misturar essa fonte com a cópia 4dc0105.
- Hashes completos do APK instalado e bundle estão na tabela do retorno R1/R2
  abaixo. APK 69d5a0b3… e bundle TalkBack 86017456… coincidem com os anteriores.
  O bundle antigo a7b2efd2… pertencia às rodadas anteriores à correção JS.
  Marcadores captura-5/preview-1 não identificam a correção acessível sozinhos.
- Confirmação na demo é exclusivamente em memória. Leitura positiva do cartão
  120/80/72 não comprova medidor real, corpus, acurácia geral ou escrita clínica.

### Lições operacionais e de interpretação

- Manter Metro no terminal da demo e usar outro PowerShell para Git/ADB. USB
  reverse usa porta 8097. Se localhost responder e 127.0.0.1 não, investigar
  binding IPv4; o reinício orientado com dns-result-order=ipv4first resolveu o
  caso relatado. Conferir /status antes de abrir a demo, sem prometer causa única.
- ANDROID_HOME precisa existir no mesmo PowerShell do Gradle; adb.exe localizado
  não basta. Apontar SDK já instalado, sem atualizar SDK/Gradle por tentativa.
  Manter --offline nas consultas; dependencyInsight bem-sucedido não é novo build.
- adb sem dispositivo significa comando não executado no telefone. Não registrar
  erro de conexão como falha de instalação/OCR ou inventário vazio aprovado.
- Fast Refresh desativado eliminou a faixa Atualizando no ensaio relatado; isso
  não prova a causa de todas as recargas. Preservar opções NODE_OPTIONS anteriores.
- journala no inventário A e DIA 90 em J1 foram esclarecidos pelo autor como
  erros de transcrição: journal e DIA 80. Preservar a correção rastreável, sem
  tratar as versões iniciais como falhas do SDK/OCR.
- Nomes/metadados iguais não comprovam conteúdo igual nem ausência de temporários.
  Hash igual prova igualdade daquele arquivo nos momentos consultados, não de
  todo sandbox, memória, banco ou tráfego. mtime diferente com hash igual também
  não identifica causa ou vazamento. Não calcular percentuais a partir disso.
- Sem permissão/abertura/OCR suficientemente lentos, não pedir tentativas humanas
  indefinidas: usar testes controlados e registrar limites de hardware.

### Pendências e limite desta etapa

Rodada posterior de ciclo de vida solicitada em 24/11/2026:
[matriz TASK-07/10/18, fonte/APK, grupos e estados separados](task-07-ciclo-vida-samsung.md).
O retorno inicial informa Metro desligado e terminal de mais cedo com f057283
limpa, APK 69d5a0b3… e bundle 86017456…; G0 atual ainda pendente. Não é novo
ensaio físico nem validação automática das etapas históricas abaixo.

Retorno posterior G0: fonte limpa e hashes atuais de APK/bundle coincidentes,
Metro/demo funcionais, idle/nao-carregado, Fast Refresh desligado e câmera sem
uso ativo/revisão antiga. G0 passou para versão/carregamento; modelo atual não
foi transcrito. [Análise e G1 liberado, sem Capturar/OCR](task-07-ciclo-vida-samsung.md#retorno-g0--versão-e-carregamento-confirmados):
somente L03 e, se encerrar normalmente, L11; ambos sem resultado novo recebido.

Retorno posterior G1: L03 e L11 passaram no alcance relatado, com cancelled,
preview/uso ativo encerrados e sem revisão/retomada por aproximadamente 5 s.
L03 informou preview-1/ready; L11, uma abertura percebida e Iniciar desabilitado.
getprop confirmou modelo SM-S731B. [Evidência, limites e G2a](task-07-ciclo-vida-samsung.md#retorno-g1--cancelamento-no-preview-e-iniciar-repetido):
próximos casos L06a/L07a (Home/troca de app no preview), ainda sem Capturar/OCR.
Não comprova contagem nativa, liberação física de RAM/SDK ou demais fases.

Retorno posterior G2a: autor atribuiu resultados iguais a L06a/L07a, ambos em
ready/preview-1; uso ativo encerrou ao sair, retorno cancelled sem preview,
revisão/retomada, recarga/reinício ou erro percebido, por aproximadamente 5 s.
[Registro separado dos casos e limites](task-07-ciclo-vida-samsung.md#retorno-g2a--home-e-troca-de-app-no-preview).
Passaram no alcance relatado, sem executar variantes de revisão ou OCR.
Próximo grupo G2b: L08a/L09a, bloqueio/rotação no preview, ainda não executados.

Retorno posterior G2b: L08a passou no alcance relatado (cancelled após bloqueio,
câmera/preview encerrados, sem revisão/retomada por aproximadamente 5 s).
L09a passou exclusivamente para rotação efetiva com relayout: ready/preview-1
preservados, sem interrupção/reinício, sem captura automática, cancelamento
final funcional. [Evidência e limites](task-07-ciclo-vida-samsung.md#retorno-g2b--bloqueio-e-rotação-com-relayout).
Recriação real continua não executada. Próximo grupo G4a: L12/L13 com cartão
sintético, sem confirmar; resultados ainda não recebidos.

Retorno posterior G4a: L12 passou no alcance relatado — botão desabilitado ainda
durante OCR, uma revisão correta e descarte após cancelar. L13 teve edição
descartada ao recapturar, uma abertura sem OCR automático, cancelled/câmera
encerrada, mas revisão/edição antiga teria reaparecido após cancelar.
[Falha relatada sob esclarecimento e teste controlado](task-07-ciclo-vida-samsung.md#retorno-g4a--captura-bloqueada-durante-processamento-e-dúvida-de-descarte).
Novas capturas pausadas; não aprovar L13 ou liberar próximo grupo até análise.

Esclarecimento posterior do autor: leu desapareceu e respondeu sim por engano;
revisão/edição antiga NÃO reapareceu. L13 passou no alcance corrigido, sem nova
captura, sem defeito constatado ou alteração funcional. Pausa encerrada; teste
dirigido do hook passou e fica como cobertura adicional, sem homologar hardware.
Próximo grupo G2c: L06b/L08b, Home/bloqueio na revisão, ainda não executados.

Retorno posterior G2c: autor atribuiu resultados iguais a L06b/L08b — revisão
120/80/72, câmera já encerrada, edição 130 sem confirmar; retorno cancelled,
campos ausentes e nenhuma retomada por aproximadamente 5 s, sem comportamento
ou erro percebido. [Casos separados e limites](task-07-ciclo-vida-samsung.md#retorno-g2c--home-e-bloqueio-durante-a-revisão).
Passaram no alcance relatado, sem testar escrita ou OCR interrompido. Próximo
grupo G2d: L07b/L09b, troca de app/rotação na revisão, ainda não executados.

Retorno posterior G2d: L07b passou no alcance relatado — revisão/edição 130
descartadas, cancelled com mensagem de cancelamento e nenhuma retomada por
aproximadamente 5 s. L09b passou para relayout efetivo: reviewing/130 preservados,
câmera desligada, sem captura/confirmação automáticas, campos descartados ao
cancelar. [Evidências e limites](task-07-ciclo-vida-samsung.md#retorno-g2d--troca-de-app-e-rotação-durante-a-revisão).
Recriação real continua NE. Próximo grupo G3a: uma tentativa L02/L04; fase
rápida/incerta fica NE, sem repetir até acertar ou presumir OCR interrompido.

Retorno posterior G3a: autor identificou opening em L02 e recognizing em L04
no toque de Cancelar; ambos terminaram cancelled, câmera/preview encerrados,
sem revisão/retomada por aproximadamente 5 s, sem comportamento/erro percebido.
[Passaram no alcance relatado](task-07-ciclo-vida-samsung.md#retorno-g3a--cancelamento-em-abertura-e-reconhecimento),
sem instrumentação temporal do SDK, liberação física comprovada ou conclusão
de L14/L15/L16. Próximo grupo G4b: L15/L10, closing e saída/retorno, sem OCR.

Retorno posterior G4b: L15 passou para bloqueio de UI em closing (Iniciar
desabilitado, nenhuma abertura, cancelled/câmera fechada). L10 passou no alcance
relatado: Voltar → tela inicial → Recentes → idle/nao-carregado, câmera desligada
e sem campos/retomada por aproximadamente 5 s, sem comportamento/erro percebido.
[Evidências e limites](task-07-ciclo-vida-samsung.md#retorno-g4b--bloqueio-em-closing-e-saída-por-voltar).
Sem prova de ACK físico, morte de processo ou destruição de Activity. Próxima
etapa é só preparar permissão negada para G3b; L01/L05 ainda não executados.

Retorno posterior da preparação G3b: cliente identificado, Câmera Não permitir,
fonte f057283 limpa, bundle 86017456… reconfirmado, idle/nao-carregado, sem
câmera/campos antigos, Fast Refresh desligado, nenhum diálogo inesperado/erro.
[Preparação aprovada no alcance relatado](task-07-ciclo-vida-samsung.md#retorno-da-preparação-g3b--permissão-negada-e-fonte-reconferida).
Próximo passo: uma solicitação, Home antes de responder; L05 só se o mesmo
diálogo permanecer pendente sem novo Iniciar/reload. L01/L05 ainda sem retorno.

Retorno posterior G3b: pedido único mantido após Home, sem novo Iniciar/reload/
reinício; conceder Durante o uso do app terminou cancelled, sem câmera/preview
ou retomada por aproximadamente 5 s. L01 positivo na variante Home; L05 parcial
porque fase anterior à concessão estava coberta pelo modal, sem confirmação
temporal de cancelled antes de conceder. [Análise e consolidação da rodada](task-07-ciclo-vida-samsung.md#retorno-g3b--pedido-mantido-após-home-e-concessão-sem-retomada).
Sem novo grupo físico liberado: L14/L16 cobertos com doubles, não executados
em hardware; não induzir falha/sobreposição. Recriação real e auditoria SDK/SO
permanecem abertas, TASK-07/10/18 parciais. Autor pode encerrar Metro/demo sem
apagar cópias/dados; não presumir que já o fez.

| Frente | Estado / próximo trabalho |
|---|---|
| Rede ativa | Nenhuma medição conclusiva; cmd netstats sem implementação; T0/T1/T2 opcional por baixa força de evidência |
| Offline/reconexão | R1 positivo para captura offline; sem anormalidade percebida ao reconectar, sem prova de ausência de envio |
| Disco/telemetria | Dependências e rotas estáticas identificadas; falta verificar dados efetivos, anonimização e comportamento em runtime |
| Logs/falhas | Caminho próprio revisado; coletores e internos SDK/SO não homologados |
| Cancelamento/concorrência | Testes automatizados cobrem mais fases; S03/S04/S05 continuam parciais em hardware, sem recriação real demonstrada |
| Acessibilidade | K/reteste/R2 positivos no alcance descrito; não presumir anúncio integral automático ou todos os estados renderizados |
| Medidor real | BSPII G-Tech descrito; vocabulário/layout sintético aceitos pelo parser; causa da ausência de candidatos reais não determinada |
| Consolidação/regressão | Última suíte de código: 726 testes/66 suítes; atualizar evidências por mudança, sem repetir toda A–K por rotina |

Os oito blocos não são oito testes simples nem percentual de TASK-07. Cada
conclusão deve indicar alcance, falha ou bloqueio; não inventar quantidade fixa
de execuções restantes. Corpus de dois medidores, avaliação quantitativa,
comparação Android/Web, persistência clínica/filas/isolamento de contas e
validação integral do legado são trabalhos posteriores, não aceites desta demo.

### Ponto em que o autor pode parar / sequência para retomar

R1/R2 encerrados no alcance relatado. Autor foi orientado a cancelar fluxo ativo,
conferir câmera desligada, fechar demo/TalkBack, encerrar Metro com Ctrl+C e
desconectar USB. São instruções, não confirmação de que as executou. Preservar
pastas, APK instalado e resultados; nenhuma nova captura ou foto foi solicitada.

Próximo trabalho independente: aprofundar produtores/serializadores de telemetria
e compatibilidade com a constituição; preparar diagnóstico dirigido que distinga
OCR de associação de campos do BSPII, sem expor imagem/texto/valores clínicos.
Qualquer nova rodada física deve ter versão, objetivo, passos, resultado esperado
e uma única devolução sanitizada. Não pedir de novo resultados já registrados
sem uma mudança/falha que justifique a repetição.

Manter ML Kit embarcado/Tesseract e caminho legado definidos nas specs. Capturas
em memória, sem arquivo intermediário, logger clínico ou fallback remoto; nenhuma
escrita/fila antes de confirmar. Preservar cancelamento, exclusão de recursos,
descarte tardio e isolamento de contas. Não acessar produção, mudar SDK por
tentativa, fazer merge/deploy ou habilitar uso clínico automaticamente. Autorização
existente abrange commits/push/PRs para staging após verificações. Revalidar Git
ao retomar e continuar trabalho independente enquanto depender do aparelho.

## O que foi executado pelo Codex

- Revisão do coordenador Android, binding, hook, revisão compartilhada e módulo
  CameraX/ML Kit próprio. O caminho próprio copia NV21 em RAM, fecha ImageProxy,
  mantém buffer/lease até completion e projeta somente códigos de falha. Não
  foram encontradas APIs de arquivo de mídia ou logger clínico nesses trechos.
  Isso não inspeciona execução interna de SDK/SO nem comprova limpeza física.
- Os testes existentes cobrem permissão tardia, cancelamento durante OCR,
  descarte tardio, falha/timeout de liberação, bloqueio de recaptura e reinício
  de efeitos. Foram acrescentados quatro casos: abertura cancelada com status
  antigos durante nova tentativa; cancelamento no fechamento com candidatos já
  calculados; timeout em permissão; timeout em abertura. Coordenador: 16 testes
  aprovados com portas simuladas. Não são quatro novos ensaios de hardware.
- Verificação final: lint, TypeScript raiz/demo Android e 724 testes/66 suítes
  aprovados; Jest emite avisos act() nas suítes existentes. Sem compilação
  Kotlin/APK ou execução de SDK/SO no ambiente desta rodada.
- FrameBytes: 8 checks de buffers e 11 de dimensões aprovados em Java, sintéticos.
- Descarte da explicação acessível ao cancelar já é coberto por teste de revisão;
  o retorno físico R2 posterior está registrado abaixo.
- Contraste calculado a partir dos tokens, sem screenshot: texto/superfície,
  muted/superfície, erro/superfície, primária e desabilitado deram, respectivamente,
  14,63 / 4,76 / 6,29 / 5,17 / 6,15 no claro e 13,20 / 6,34 / 6,04 / 7,36 / 4,59
  no escuro. São razões de luminância dos pares nominais, não medição de todos
  os estados renderizados. Button declara mínimo 48×48; corpo usa 16 e scaling
  não foi desativado nos trechos revisados. Não homologa toda acessibilidade.

## Telemetria: avanço e limite da inspeção

O AAR público common 18.11.0 foi novamente obtido do Google Maven. Por
`java -m jdk.jdeps/com.sun.tools.javap.Main -c -p`, em classes.jar:

- `com.google.android.gms.internal.mlkit_common.zzsp` inicializa TransportRuntime,
  usa CCTDestination.INSTANCE, cria Event.ofTelemetry e chama Transport.send.
- zzsm/zzsn obtêm transportes via TransportFactory; zzsm contém o nome de fonte
  FIREBASE_ML_SDK. Esse nome não demonstra inicialização do Firebase clínico.

É evidência estática de uma rota de envio implementada, além das referências
encontradas anteriormente. Não prova sua execução no Samsung, conteúdo dos
eventos, anonimização, frequência ou destinos efetivamente acessados. Não houve
inspeção de bancos, captura de payload nem alteração/desativação de SDK.
Auditoria de produtores/serializadores, logs, temporários e rede/reconexão
continua aberta; leitura offline não a substitui.

## Preparação única no Windows

Preservar a cópia de integração 4dc0105 usada nas consultas Gradle. Para os dois
ensaios abaixo, usar a cópia TalkBack já criada e testada, cuja última fonte
informada foi f057283876ea2126b485abd762e2886012b4c7ca. As alterações desta rodada
são testes/documentação: não exigem reinstalar APK ou carregar novo JS.

No PowerShell, sem trocar branch, instalar dependências ou limpar dados:

```powershell
cd C:\dev\aferi-task07-talkback
git rev-parse HEAD
git status --short
$aferiSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$aferiAdb = Join-Path $aferiSdk 'platform-tools\adb.exe'
$aferiLinhaBase = & $aferiAdb shell pm path com.ramonmenz.afericapturetest |
    Where-Object { $_.Trim().EndsWith('/base.apk') } | Select-Object -First 1
if ($aferiLinhaBase) {
    $aferiApkBase = ($aferiLinhaBase -replace '^package:', '').Trim()
    & $aferiAdb shell sha256sum $aferiApkBase |
        ForEach-Object { ($_ -split '\s+')[0] }
} else {
    Write-Output 'APK base não localizado; identidade pendente.'
}
& $aferiAdb shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

Se a pasta não existir, houver mudanças locais ou erro de identidade, retornar
o impedimento preservando tudo. Não presumir que hashes identifiquem sozinhos
o código executado. Se Metro estiver parado, usar a cópia TalkBack existente
com o procedimento de localhost/IPv4/reverse do [reteste](task-07-reteste-talkback.md),
sem repetir criação de worktree/npm ci/fetch. Conferir Fast Refresh desativado,
captura-5/preview-1 e texto novo da confirmação. Um Metro por vez.

## R1 — captura sem internet externa

1. Com demo carregada e câmera desligada, registrar conexão inicial. Manter
   USB, reverse e Metro no computador; desligar Wi-Fi e dados móveis no Samsung.
   Não fazer recarga deliberada. USB localhost continua sendo comunicação local,
   portanto não descrever como ausência absoluta de rede.
2. Iniciar, capturar uma vez o cartão sintético 120/80/72 e conferir os campos.
   Esperado: revisão com esses candidatos, preview fechado e indicador apagado,
   sem dependência de internet externa. Se houver falha de carregamento/bundle,
   distingui-la de falha do OCR e registrar sem repetir até obter sucesso.
3. Cancelar a revisão. Esperado: descarte, sem retomada automática. Não solicitar
   confirmação clínica, inventários repetidos ou logs completos.
4. Restaurar as conexões anteriores ao terminar. Registrar somente eventual erro
   ou comportamento automático percebido; isso não observa nem exclui envio de
   eventos na reconexão, que permanece pendente de instrumentação adequada.

## R2 — mensagem acessível após cancelar

1. Habilitar TalkBack com forma conhecida de desativá-lo; usar o mesmo cartão.
2. Capturar e editar sistólica para 70, mantendo diastólica 80. Esperado: motivo
   compreensível e confirmação impedida. Navegar até a explicação é válido;
   anotar anúncio automático separadamente, sem tratá-lo como obrigatório por si só.
3. Cancelar a revisão. Esperado: mensagem de revisão cancelada, sem campos,
   disponibilidade ou motivo pertencente à revisão anterior.
4. Iniciar nova captura explicitamente. Esperado: novos candidatos do cartão,
   sem edição 70 ou motivo antigo. Cancelar ao final e desativar TalkBack.

## Uma única devolução

```text
Preparação: HEAD/status; houve reinstalação?; hashes APK/bundle; marcadores;
Fast Refresh desativado?; houve recarga/reinício durante os casos?
R1: Wi-Fi/dados móveis desligados?; USB/reverse mantidos?; valores reconhecidos;
preview/indicador encerrados?; cancelamento descartou?; erro de bundle/OCR?;
ao restaurar conexões houve comportamento automático percebido?
R2: bloqueio/motivo identificáveis?; anúncio por navegação ou automático?;
ao cancelar sumiram campos/motivo antigo?; nova captura recuperou edição 70?;
cancelamento final funcionou?
Medidor: marca G-Tech, modelo BSPII informado pelo autor; rótulos/organização
do visor ainda não informados. Descrever apenas rótulos/posições, sem valores reais.
```

Cada caso é executado uma vez nesta rodada. Divergências geram análise/correção
direcionada, sem repetir A–K. Não solicitar fotos/áudios do produto, bancos,
credenciais, serial, dumps globais ou instalação de monitor de rede.

T0/T1/T2 fica **opcional e de baixa força de evidência**, sem ser condição para
R1/R2 ou para avançar a auditoria técnica. Os blocos S03/S04/S05 permanecem
parciais em hardware: testes simulados não cobrem a implementação interna do
SDK nem recriação real da Activity. Medidor real exige investigação própria;
não presumir rótulos, causa ou acurácia com base na marca/modelo.

## Retorno recebido de R1/R2

Fonte: relato do autor e comandos transcritos; sem acesso ao Windows/aparelho.
Data/hora da execução não informadas. Preparação recebida:

| Identificador | Resultado |
|---|---|
| HEAD da cópia TalkBack | f057283876ea2126b485abd762e2886012b4c7ca |
| git status --short | Sem saída, limpo |
| SHA-256 do base.apk instalado | 69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c |
| SHA-256 do bundle no sandbox | 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 |

APK coincide com o hash instalado/local anteriormente recebido; bundle coincide
com o reteste TalkBack. São identidades dos arquivos consultados, sem par
antes/depois desta rodada nem prova isolada de qual código estava em execução.
Não foram repetidos marcadores, Fast Refresh ou informação de reinstalação;
não preencher essas lacunas por suposição nem exigir nova rodada sem motivo.

**R1 — positivo no alcance relatado:** autor informa captura/reconhecimento
funcionais com Wi-Fi e dados móveis desligados, sem erro percebido. Após
religá-los, não percebeu comportamento estranho. Não transcreveu valores por
campo, indicador/preview/cancelamento separadamente nem forneceu medição de
rede. O relato sustenta funcionamento nessa condição, não ausência absoluta
de rede (USB/localhost permanecia no roteiro) ou de tráfego na reconexão.

**R2 — positivo para descarte e orientação:** após editar SYS para 70, autor
ouviu logo em seguida a regra de que a sistólica deve ser maior que a diastólica.
Cancelou; campos/explicação antigos desapareceram; nova captura não recuperou
a edição 70. Sem erro percebido. Não detalhou se houve navegação/foco adicional,
qual elemento anunciou a regra ou a fala completa de disponibilidade; portanto
não descrever como anúncio automático integral do status comprovado. O novo
relato complementa o reteste anterior, sem apagá-lo ou presumir contraste/
acessibilidade integral. Não acrescentar confirmação/cancelamento final não
detalhados nessa resposta.

Não repetir R1/R2 nem A–K com base apenas nessas lacunas de relato. Próximo
trabalho é técnico: rastrear produtores/serializadores e compatibilidade da
telemetria, mantendo a investigação do layout G-Tech BSPII separada. Não há
aprovação de privacidade, medidor real, persistência clínica ou TASK-07.

### Layout do G-Tech BSPII — esclarecimento do autor

Autor descreveu `SIS\nmmHg`, `DIA\nmmHg` e `PULSO\nmin`, cada conjunto à direita
do valor, com quebra de linha entre rótulo/unidade. Não forneceu foto ou medidas
de caixas; não inferir posições verticais exatas ou a saída real do OCR.
Não é necessário enviar fotografia com valores reais para esta reprodução.

O interpretador já aceita SIS/DIA/PULSO, ignora mmHg/min e admite número à
esquerda do rótulo. Dois testes adicionais usam valores/coordenadas sintéticos
inspirados nessa descrição: unidade agrupada com rótulo ou em linha separada,
com permutação da ordem dos tokens. Não alteram as regras para fazer o ensaio
passar; tampouco comprovam a detecção ML Kit de letras/dígitos/sete segmentos.
Ausência de candidatos no medidor continua sem causa determinada: texto omitido
ou confundido pelo OCR e geometria real fora das associações permanecem hipóteses.
Após esse complemento: lint, TypeScript raiz e 726 testes/66 suítes aprovados,
incluindo 43 testes de interpretação. Sem alterações no código de produção.

## Auditoria estática complementar — identificador de instância do SDK

Por javap -c -p nos AARs públicos common 18.11.0 e
[play-services-mlkit-text-recognition-common 19.1.0](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-mlkit-text-recognition-common/19.1.0/play-services-mlkit-text-recognition-common-19.1.0.aar),
versões presentes na árvore Gradle recebida. SHA-256 desse segundo AAR:
`3be02b3c3c829476100f01d0ab79f0b4a923da23909d3ac63e486d1a63381c58`.

- SharedPrefManager.getMlSdkInstanceId consulta a chave ml_sdk_instance_id;
  se ausente, gera UUID e usa SharedPreferences.Editor.putString/apply.
- O produtor OCR interno zzuc consulta esse método e passa a string ao builder
  zzsr.zzi antes de entregar o evento à interface zzts. O getter zzst.zzi é
  lido pelo encoder zzmg no campo mlSdkInstanceId; o encoder common zzkh também
  declara esse campo. Há rota estática para identidade de instância em eventos.

Isso não é só um nome de campo no esquema: há rotina de persistência e produtor
que solicita o identificador. Porém, não foi lido identificador do aparelho,
não houve captura de eventos nem confirmação da execução/envio dessa rota no
Samsung. UUID de instância não é automaticamente identidade civil, mas sua
presença impede presumir telemetria exclusivamente anônima/agregada; requer
avaliação frente à constituição. Não afirmar que valores clínicos são enviados
nem que os eventos contêm apenas métricas. Nenhuma API de SDK foi alterada ou
desabilitada por tentativa; auditoria de dados, destinos e runtime segue aberta.


## Inspeção dirigida de privacidade e localidade — continuidade

Em 24/11/2026, sobre staging 81af92f, foi preparado o
[diagnóstico e protocolo TASK-04/06/07/18](task-07-inspecao-privacidade-localidade.md).
PR #74 permanece aberto no início dessa etapa e foi consultado como evidência,
sem presumir merge; nova branch docs/task-07-inspecao-privacidade independente.
Coletor PowerShell inventario-1 compara metadados em memória, sem ler conteúdo
ou expor caminhos nos relatórios. P0 solicitado, sem retorno físico registrado;
rede por UID/destino ainda sem ferramenta qualificada. Não executar toda a matriz
sem condução nem repetir A–K/R1/R2. Habilitação clínica continua bloqueada.


Retorno posterior P0 recebido: fonte f057283 limpa, ADB 1.0.41/pacote 37.0.1,
Samsung SM-S731B/Android 17/API 37, demo UID 10033 e bundle 86017456… reconfirmados.
Metro aberto; demo aberta para conferir captura-5/nao-carregado/idle, câmera
sem uso/revisão antiga e Fast Refresh desligado. associacao-1 ausente é compatível
com a fonte antiga. Reinstalação desconhecida e APK atual sem hash reconfirmado;
rede por UID/destinos sem ferramenta identificada. [Análise e próximo controle I](task-07-inspecao-privacidade-localidade.md#retorno-p0--identidade-e-estado-inicial-recebidos),
sem câmera/OCR ou troca de JS/APK; não presume conformidade ou conclusão de tarefa.


Retorno posterior I recebido: coletor inventario-1 em 583f61f limpa executado no
Windows PowerShell 5.1.26100.9818. I0/I1 com 16 arquivos (1 bundle, 2 nomes de
DataTransport, 12 não classificados, 1 preferência com nome ML Kit); zero
mudanças de entrada/tamanho/mtime detectadas. Autor confirmou espera programada
30 s sem pausa adicional, idle/câmera desligada, sem revisão/retomada/recarga/
reinício/erro. [Evidência, alcance e próximo S/B](task-07-inspecao-privacidade-localidade.md#retorno-i--coletor-no-windows-e-controle-idle).
Positivo para controle/capacidade, sem prova de conteúdo/temporários/rede/SDK/SO;
S/B e demais grupos desta rodada ainda pendentes, habilitação clínica bloqueada.


Retorno posterior S/B: leitura sintética correta em ready/preview-1, revisão e
câmera encerrada; 16 entradas nos três snapshots. S0→S1 mudou tamanho e/ou mtime
de uma entrada com nome DataTransport; conteúdo/causa/envio não determinados.
S1→B1 sem mudanças detectadas; cancelled, campos ausentes e câmera desligada por
aproximadamente 5 s. O sim inicial para retomada foi corrigido pelo autor como
erro de marcação: **não houve retomada**. Pausa encerrada sem reteste/defeito
constatado. [Registro, limites e próximo C/R](task-07-inspecao-privacidade-localidade.md#retorno-sb--captura-mudança-de-metadados-e-descarte).
Não ler bancos ou repetir captura por delta zero. Habilitação permanece bloqueada.


Retorno posterior C/R: cancelamento em ready/preview-1 terminou cancelled, câmera
encerrada e sem revisão/retomada; force-stop sem erro percebido, retorno pelo ícone
à demo idle/Nativo não carregado, sem campos/câmera/retomada. Janelas relatadas de
aproximadamente 5 s; 16 entradas nos snapshots IDs 1/2/3 após reimportação do
módulo. C0→C1 mudou size-or-mtime de uma entrada DataTransport; C1→R1 mudou uma
entrada bundle e uma não classificada. [Evidência, limites e hash dirigido pós-R](task-07-inspecao-privacidade-localidade.md#retorno-cr--cancelamento-reinício-e-metadados-alterados).
Sem causa/conteúdo/envio determinados ou aceite de privacidade. Antes de E,
conferir só fonte/bundle, sem repetir cenário, abrir câmera ou mudar permissões.


Conferência pós-R recebida: TalkBack f057283 limpa, bundle 86017456… igual ao P0,
Metro na cópia TalkBack, sem mudança de rede, idle/nao-carregado e câmera desligada.
Autor informou abertura manual por a antes desta fase; momento em relação aos
snapshots não especificado, sem classificar como retomada automática ou explicar
por suposição os metadados alterados. [Evidência e próximo E](task-07-inspecao-privacidade-localidade.md#retorno-da-identidade-pós-r--fonte-limpa-e-hash-coincidente).
Hash igual limita-se aos momentos consultados; não prova C1/R1 com mesmos bytes,
APK ou privacidade SDK/SO. Próximo erro seguro de permissão sem Capturar/OCR,
preparação fora de E0/E1, ainda não executado. Sem repetição de C/R.


Retorno posterior E: Durante o uso do app → Não permitir; retorno por Recentes,
tela branca breve na preparação (sem causa/reinício comprovados), hash 86017456…
reconfirmado antes de E0. Um Iniciar/diálogo/Não permitir terminou cancelled, sem
câmera/revisão/retry ou erro/recarga/reinício percebidos após E0, por cerca de 5 s.
E0/E1 IDs 4/5 com 16 entradas; mudou size-or-mtime de uma entrada não classificada,
sem causa/conteúdo/envio determinados. [Evidência e preparação O/Q](task-07-inspecao-privacidade-localidade.md#retorno-e--negativa-de-permissão-e-mudança-não-classificada).
Próximo: restaurar permissão da demo e consultar hash/contagens reverse/conexões,
sem iniciar câmera ou alterar rede ainda. Privacidade/habilitação não aprovadas.


Preparação offline recebida: permissão restaurada, Recentes sem a, cancelled/
preview-1 com câmera desligada e sem campos/retomada, Fast Refresh desligado,
hash 86017456… coincidente. Reverse8097Conhecido=1/OutrasLinhas=0; Wi-Fi/dados
ligados e VPN não. USB/Bluetooth/Ethernet do telefone desconhecidos; Ethernet do
PC não identifica rota do telefone. [Registro e esclarecimento dirigido](task-07-inspecao-privacidade-localidade.md#retorno-da-preparação-offline--permissão-e-reverse-conhecidos).
Solicitado só estado de ancoragem e ligação física, sem alteração de rede/câmera.
O/Q e monitoramento por UID/destino ainda não executados; habilitação bloqueada.


Esclarecimento posterior: Ancoragem USB/Bluetooth desligadas, cabo USB direto
PC→telefone, sem hub/adaptador Ethernet no telefone. [Condução O/Q](task-07-inspecao-privacidade-localidade.md#esclarecimento-das-conexões-e-condução-oq)
preparada com consulta reverse 1/0→0/0→1/0, retirada/restauração só de 8097,
Wi-Fi/dados originais e uma captura sintética com cancelamento; O1 também é Q0.
Sem resultados físicos novos de O/Q ou observação por UID/destino presumidos;
não equivale a isolamento universal/privacidade homologada.


Retorno posterior O/Q: rádios Wi-Fi/dados/Bluetooth desligados, reverse 8097
1/0→0/0→1/0, hash 86017456… conhecido. Reconhecimento sintético e cancelamento
funcionaram; reconexão/estados originais restaurados, cancelled/sem campos/câmera/
retomada/erro, espera programada 30 s sem pausa extra. O0/O1/Q1 IDs 6/7/8, 16
entradas; uma mudança size-or-mtime DataTransport em cada par, sem conteúdo/
causa/envio determinados ou prova de que seja a mesma entrada. [Rodada e diagnóstico consolidados](task-07-inspecao-privacidade-localidade.md#retorno-oq--leitura-desconectada-e-reconexão).
Sem novas capturas pedidas: próximo M0 se artefato/Studio existirem e auditoria
independente de SDK. Encoders OCR públicos examinados sem pixels/texto nessa
subárvore, sem resolver ID do envelope ou SDK/SO integral. Habilitação bloqueada.


Preparação M0 posterior: telefone reiniciado por atualização de SO, USB reconectado
e a no Metro, idle/nao-carregado e câmera desligada. Studio padrão, aapt2 SDK36 e
APK local de integração localizados por Test-Path, sem validar bytes/versões.
[Próximo M0a e separação de ambientes](task-07-inspecao-privacidade-localidade.md#preparação-m0-após-atualização-do-so--arquivos-localizados):
metadados do SO atualizado e hashes base.apk/local/JS, sem captura ou novo build.
Rodada anterior preservada no ambiente anterior, sem homologação retroativa.


M0a recebido pós-update: Android17/API37, patch2026-10-05 e build
CP2A.260605.016.S731BXXUACZJC; device, bundle86017456…; única entrada APK,
base instalado/APK local com SHA-25669d5a0b3… iguais. [Identidade e próximo M0b](task-07-inspecao-privacidade-localidade.md#retorno-m0a--apk-local-correspondente-e-referência-atual-do-so).
Extrator manifesto-1 seleciona permissões/atributos diretos de application sem
expor árvore/paths, com validação de hash e fixtures/aapt2 público, sem APK real.
Próximo só leitura local estática; nenhuma nova captura ou build. Gate mantido.


M0b recebido: manifesto-1/aapt2 2.20-13193326 e APK69d5a0b3… identificado.
min24/target36, CAMERA/INTERNET declaradas; áudio/storage/mídia selecionadas
não declaradas. allowBackup/usesCleartextTraffic/debuggable true, sem atributos
fullBackupContent/dataExtractionRules/networkSecurityConfig declarados.
[Diagnóstico e correção de fonte](task-07-inspecao-privacidade-localidade.md#retorno-m0b--manifesto-do-apk-identificado-e-configuração-de-backup):
android.allowBackup=false na demo para futuro build, conferido pelo transformador
real Expo. APK instalado permanece true, sem build/instalação ou mudança do ensaio.
Elegibilidade não prova backup ocorrido; cleartext/INTERNET não provam upload.
Ressalvas de transferência OEM, telemetria/ID e UID/destinos mantêm gate fechado.
Sem nova captura; preservar artefatos e qualificar observação só de metadados.


Pós-merge: #74/#75 merged confirmados, staging9612c64; worktree Windows pos-merge
no commit, limpa e allowBackup=false na fonte conforme autor. APK anterior intacto.
[Regras explícitas e preparação](task-07-backup-pos-merge.md): plugin só da demo
para exclusões legadas/cloud/D2D, sem alterar engine/fluxo clínico; requer futuro
build/manifesto/recursos efetivos. OEM/cross-platform/telemetria/UID/destinos
continuam pendentes. Próximo retorno só de versões Node/npm/Java; sem captura.


Preflight Windows recebido: Node24.22.0/npm11.19.1/Temurin17.0.21+9. Faixa Node
RN compatível e toolchain17 conferidos, sem comprovar seleção por JAVA_HOME.
Prebuild real Codex isolado do código062e9b1 passou, manifest/resource refs e
exclusões conferidos; sem Gradle/APK/telefone. [Roteiro de geração e assembleDebug
sem instalação](task-07-backup-pos-merge.md#retorno-de-versões-e-verificação-independente-de-prebuild)
preparado; novo hash e manifesto/recursos empacotados aguardam execução local.


Retorno do build Windows: prebuild/build concluídos, Gradle9.3.1 e Launcher
JVM17.0.21 Adoptium+9; fonte062e9b1, APK existente com
SHA-256edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed.
Status relatado limpo antes/depois; Refresh index é progresso do Git.
[Próximo manifesto selecionado](task-07-backup-pos-merge.md#retorno-do-build-windows--apk-gerado-ainda-não-inspecionado),
sem atualização da worktree, instalação ou nova captura. Recursos empacotados/
vinculação/assinatura e privacidade ainda não homologados.


Novo manifesto recebido: APKedf860b7…, manifesto-1/aapt2 2.20-13193326,
allowBackup=false e referências de backup presentes, min24/target36;
cleartext/debuggable true, CAMERA/INTERNET. [Conferência dos recursos empacotados](task-07-backup-pos-merge.md#retorno-do-manifesto-do-novo-apk-e-próximo-extrator)
prepara backup-1 para cruzar IDs→tabela→XML e excluir nove domínios nas três
seções. Checks negativos e integração aapt2 com APK sintético passaram; execução
Windows ainda pendente. APK/fonte062e9b1 preservados; sem instalação/captura/gate.


Backup-1 executado pelo autor no Windows/aapt2 2.20-13193326, ferramentas5e2ca59
limpas, APKedf860b7…: AllowBackup=false, ReferenciasConferidas=true; três seções
com nove domínios excluídos e SomenteExclusoesRaiz=true. [Evidência estática e
próxima comparação de assinaturas locais](task-07-backup-pos-merge.md#retorno-backup-1--referências-e-exclusões-empacotadas-conferidas).
Não homologa SO/OEM/runtime/telemetria/rede. Sem instalação ou captura adicional.


Assinatura-1 recebido: ferramentasfd65873 limpas, apksigner0.9, hashes69d5a0b3…/
edf860b7… esperados; assinaturas verificadas e certificados iguais. [Alcance e
reconferência instalada só de leitura](task-07-backup-pos-merge.md#retorno-assinatura-1--comparação-dos-apks-locais-aprovada).
Não houve instalação/abertura/captura solicitada; pacote atualmente instalado
continua dependente da nova consulta, privacidade/gate seguem pendentes.


Identidade instalada recebida: única base69d5a0b3… no SM-S731B, anterior=true/
novo=false. Autor informou demo fechada/sem aplicação no terminal; fase não
observada, sem inferir câmera/processos. [Atualização do pacote de avaliação](task-07-backup-pos-merge.md#identidade-instalada-reconfirmada-e-atualização-de-avaliação-preparada)
preparada com guarda de hash/alvo, install -r sem abertura e hash posterior.
Nenhuma instalação executada pelo Codex; retorno do autor pendente, gate fechado.


Atualização recebida: install sucesso, única base instaladaedf860b7… no Samsung,
anterior=false/novo=true, app fechado, indicador de câmera não percebido e sem
comportamento inesperado observado. [T0 de abertura com Metro da fonte062e9b1](task-07-backup-pos-merge.md#retorno-da-atualização--novo-apk-instalado-app-fechado)
preparado sem iniciar câmera, com associacao-1/Fast Refresh/bundle/estado inicial.
Nova evidência funcional ainda pendente; gate clínico permanece bloqueado.


T0 interrompido por EOF de HTTP127.0.0.1:8097 ao abrir Dev Client; autor confirmou
Metro ainda rodando. Sem evidência de JS/tela/hash novo ou tentativa de câmera.
[Diagnóstico somente de metadados e inspector de desenvolvimento](task-07-backup-pos-merge.md#t0-interrompido--eof-http-no-carregamento-do-dev-client):
metro-link-1 consulta saúde loopback v4/v6 e reverse; hipótese localhost/bind ainda
não confirmada. Fonte futura desativa EX_DEV_CLIENT_NETWORK_INSPECTOR no prebuild
só da demo; APKedf860b7… e Metro062e9b1 preservados, sem reinstalação nesta análise.
Gate clínico/telemetria/rede seguem pendentes.


Metro-link-1 recebido: IPv4ConnectFailure/sem resposta, IPv6HTTP200/fonte esperada/
pronto, reverse disponível sem nenhuma linha; Metro continuou rodando. [Ajuste
somente da sessão Node/reverse](task-07-backup-pos-merge.md#retorno-metro-link-1--ipv6-pronto-ipv4-indisponível-e-reverse-ausente)
prepara ipv4first por processo e mapeamento8097 sem conflito; teste de bind no
host passou, retorno Windows ainda pendente. Não afirma causa universal do EOF
nem muda APK/engine/redes globais ou habilitação.


T0 recebido positivo para abertura por a após ajuste: captura-5/associacao-1,
active/idle/nao-carregado, Fast Refresh desligado, sem preview/revisão/indicador
percebido ou erro. IPv4HTTP200/fonte/pronto, reverse1/0/sem conflito; IPv6 não
responde nessa sessão. [Controle de bundle/idle do novo APK](task-07-backup-pos-merge.md#t0-recebido--abertura-funcionou-após-ajuste-de-conectividade)
preparado sem câmera; r anterior não explicitamente confirmado. Não é inspeção
integral/zero tráfego ou conclusão; inspector false ainda requer futuro build.


Idle novo recebido: espera programada30s sem pausa, active/idle/nao-carregado,
sem preview/revisão/indicador percebido/interrupção. Bundle23e7dd6f…; inventario-1
IDs1/2 com16 entradas/categorias1/2/12/1 e delta0. r anterior confirmado, nenhum
r na janela. [Diagnóstico e build isolado sem inspector](task-07-backup-pos-merge.md#idle-pós-atualização-recebido--baseline-nova-estável-no-alcance-observado)
preparados: fonteca786ed em outra pasta, sem instalação/captura. Idle não homologa
conteúdo/temporários/rede; APK atualEDF ainda tem configuração anterior.


Candidato de inspector recebido: fonteca786ed limpa, APK25990bb4…; flags false
na geração/invocação, BytecodeInspecionado=false, manifesto/backup/assinaturas
aprovados no retorno do autor. [Evidência e atualização restrita preparada](task-07-backup-pos-merge.md#candidato-de-inspector-recebido--build-e-metadados-agregados-aprovados)
fixa EDF→25990bb4… e não abre app; candidato já instalado não é reinstalado.
Nenhuma instalação do novo candidato recebida ainda, sem nova captura/gate.


Nova sessão após PC desligado: autor recebeu inspector-update-adb-unavailable
sem JSON final. Estado instalado não foi inferido do erro. [Retomada somente
leitura e correção de stderr nativo](task-07-backup-pos-merge.md#retomada-após-desligar-o-pc--falha-de-adb-não-identifica-o-instalado)
preparadas: start-server idempotente no PC, Process sem shell/streams separados,
ReadOnly que não instala e não depende de variáveis/candidato local. Testes com
executável fictício passaram; validação Windows da retomada segue pendente.
