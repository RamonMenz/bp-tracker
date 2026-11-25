# TASK-09 — diagnóstico dirigido do visor real Android

## Base e evidência

Etapa baseada em staging `5d88c0bc709e3c114921fe8abac31655efbe11e3`, após
merge do PR#76 confirmado no GitHub. Trabalho anterior preservado. Autor
identifica aparelho G-Tech BSPII, linha Home, e relata tentativa na demo sem
identificação dos três campos. A tentativa terminou; não há diagnóstico de
associação correspondente recuperado. Não atribuir essa falha ao APK259 ou a
outro hash sem confirmação da identidade daquela execução.

Duas fotos foram fornecidas no chat, com LCD ligado/desligado. Inspeção visual
pelo assistente, sem executar ML Kit sobre elas. Fotos, valores e metadados
pessoais não foram adicionados a arquivos, fixtures, logs ou PR. Registro apenas
do layout: SIS/DIA/PULSO e unidades impressos na carcaça à direita do LCD;
dígitos de sete segmentos; região inferior com acessórios de calendário/relógio;
reflexo e contraste não uniformes. Isso não reproduz o quadro entregue pela demo.
Imagem vista pelo assistente não equivale a resultado do ML Kit no Samsung.

## Hipóteses e implementação

Enquadrar apenas o LCD pode excluir rótulos. OCR pode ler somente a carcaça,
falhar nos segmentos ou entregar caixas inadequadas à associação. Nenhuma dessas
causas foi comprovada. O parser já aceita SIS/PULSO e possui testes sintéticos
para números à esquerda dos rótulos/unidades separadas. Não relaxar geometria,
inventar campos por ordem/faixa nem substituir o motor com base nas fotos.

`associacao-2` mantém os quatro indicadores anteriores e acrescenta apenas:

- `ocr:digitos-ascii-presentes` ou `ocr:sem-digitos-ascii`;
- `rotulo:SYS=presente/ausente`, `rotulo:DIA=presente/ausente` e
  `rotulo:PUL=presente/ausente`.

Rótulos usam normalização/tokenização/dicionário do próprio parser; não se trata
de busca de substring. A presença é lexical, não conta ocorrências nem confirma
identidade, número clínico, caixa válida, proximidade ou acerto. Dígitos podem
pertencer a acessórios. Ausência de dígitos ASCII não prova ausência de imagem
ou OCR: letras confundidas com números e outros caracteres permanecem possíveis.
Não há texto bruto, valor, posição, confiança, hora, arquivo, logger, upload ou
nova captura. Diagnóstico segue transitório e os testes de ciclo de vida conferem
seu descarte. Nenhuma regra de interpretação/câmera/nativo/permissão mudou.

## Próximo ensaio — ainda não executado ou solicitado

Nenhum novo build/instalação ou repetição agora. Alteração é JS/TS, mas sua
adoção exige fonte/Metro/bundle identificados para não usar ferramentas fixadas
na fonte ca786ed de outra rodada como prova desta. App instalado e snapshots
anteriores devem ser preservados. Primeiro conferir mudança e CI do PR.

Preparar posteriormente um único ensaio dirigido com entradas não clínicas,
identidade do artefato, ambiente local controlado e redes verificadas conforme
protocolo de privacidade; nenhuma foto ou texto bruto precisa ser devolvido.
Enquadramento deve incluir LCD e rótulos externos, câmera aproximadamente frontal,
sem zoom digital e sem brilho cobrindo o visor. Não usar o ciclo de inflar/medir
como estímulo de teste. Não pedir medições adicionais ou invocar modo de teste
não documentado. LCD desligado testa layout, não leitura de segmentos; estímulo
sintético tampouco homologa o display real.

Retorno futuro: somente versão visível, App/Fase/Nativo, os oito indicadores de
associação e observação de encerramento/erro, sem screenshot ou valores.
Se não há dígitos, investigar captura/OCR; se faltam rótulos, investigar
cobertura/reconhecimento da carcaça; se ambos existem mas campos seguem incertos,
investigar associação. Essas classificações orientam, não comprovam causa.

Privacidade SDK, tráfego por UID/destino, efeito compilado do inspector e demais
critérios permanecem pendentes. TASK-04/06/07/09/18 parciais, habilitação clínica
bloqueada. Esta mudança diagnostica; não corrige ou comprova leitura do medidor.

## Verificações desta alteração

Lint, TypeScript raiz e demo, 745 testes em 67 suítes e diff sem erros de
whitespace aprovados. Testes usam somente textos sintéticos, cobrem marca sem
dígitos, acessórios numéricos, rótulos sem valores, limites léxicos, ausência de
conteúdo sensível na saída e distinção entre presença lexical/associação.
Regressões confirmam descarte do diagnóstico e rejeição de resultados tardios.
Nenhum ML Kit real, APK novo ou ensaio físico executado pelo Codex.


## Retorno do visor desligado — rótulos presentes

Autor confirmou fonte Windows a649b6c181f6a04e5b9677f286bb22b19ffa024b
limpa, preparo inspector-metro-1 e APK25990bb4… sem instalação. Tela captura-5 /
associacao-2, active/idle/nao-carregado, Fast Refresh desligado, sem câmera ou
revisão antiga percebidas. Preparação offline retornou bundle
`2191e4f100e72f97a3a899d033e48f42b6d5190987eb4efdd59d643bb3c748ee`
e ReverseAtivosDepois=0; redes/ancoragens/VPN conforme roteiro por declaração.

Uma captura do medidor desligado: linhas presentes; três campos incertos por
ilegível ou distante; dígitos ASCII presentes; três rótulos presentes. Autor
avisou possibilidade de erro de digitação; escreveu associação com acento e
PUl com último caractere minúsculo. Esta síntese interpreta as categorias
relatadas, sem tratar essas grafias como saída literal do software.

Esclarecimento sem repetição: cancelled/nao-carregado foi antes de Iniciar;
autor depois viu preview e ready antes de Capturar. Câmera encerrou após OCR,
cancelamento encerrou revisão, sem retomada/recarga/erro percebidos. Reverse
restaurado pelo preparo, mesmo APK, instalação=false; redes restauradas depois
desse JSON, conforme esclarecido. Essa ordem não contradiz a janela offline
relatada. Sem tráfego por UID/destino medido; isolamento não comprova ausência
de fila/telemetria/transientes SDK ou comportamento universal.

Conclusão limitada: os três rótulos chegaram à detecção lexical nesta tentativa.
Não falta suporte aos nomes SIS/DIA/PULSO. Falta de números do LCD desligado é
coerente com campos incertos; dígitos detectados podem ser inscrições acessórias.
Não afirmar que todos vieram delas ou que há falha de geometria. Isso não
reconstitui nem explica sozinho a tentativa anterior com visor ligado.

## Comparação dirigida preparada — fonte comum versus sete segmentos

[Cartões HTML locais](../tools/task09/cartoes-ocr.html), dois estímulos estáticos
independentes de fotos de usuário. Valores inventados 120/80/72, mesmos rótulos,
mesmo retângulo e organização; variam formato/largura dos dígitos. Não é controle
pixel a pixel nem réplica calibrada do LCD. Nenhuma origem, cor ou geometria foi
extraída de fotografia. Sem JS, recursos externos, captura, gravação ou envio;
CSP bloqueia recursos/rede e formulários. Só permite estilo inline para desenho
geométrico de segmentos. Não inclui arquivos de fonte ou motor adicional.

Escopo: duas capturas distintas A/B, sem novas medições, edição ou confirmação.
Comparação física depende do Samsung; não foi executada pelo Codex. Resultado
positivo não homologa LCD/reflexo/sete segmentos de outros displays; falha não
atribui causa exclusivamente ao motor ou aos segmentos. Testar os dois no mesmo
bundle/câmera/aparelho evita comparar diretamente com a rodada antiga do cartão.
Não repetir tentativas para selecionar apenas sucessos.

### Procedimento Windows, depois de obter o arquivo estático

Preservar Metro da fonte a649b6c e APK25990bb4…; não usar a pasta dos cartões
como novo projeto Expo. Abrir o HTML por arquivo local no PC, selecionar A e
manter cartão inteiro visível, sem rolagem/cortes, cabeçalho fora do enquadramento.
Somente o Samsung ligado ao ADB. Não carregar foto do usuário no navegador.

No telefone, anotar estados originais; desligar Wi-Fi, dados e Bluetooth;
conferir ancoragens/VPN desligadas e ausência de outras rotas/adaptador Ethernet.
Retornar por Recentes: background pode cancelar e deve continuar cancelando.
Se houver rota desconhecida ou erro de preparação, parar sem capturar.

No Terminal B, na fonte Windows a649b6c, usar o bloco abaixo. Só remove o reverse
conhecido e confere o bundle desta rodada; saídas brutas ficam privadas:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task09-rotulos'
    Import-Module .\tools\task07\AferiEvaluationAdb.psm1 -ErrorAction Stop
    $aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    $aferiBundle = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @(
        'shell', 'run-as', 'com.ramonmenz.afericapturetest', 'sha256sum',
        'files/DevLauncherApp-BridgelessReactNativeDevBundle.js'
    )
    if ($aferiBundle.Code -ne 0 -or $aferiBundle.Lines.Count -ne 1 -or
        $aferiBundle.Lines[0] -notmatch '^2191e4f100e72f97a3a899d033e48f42b6d5190987eb4efdd59d643bb3c748ee\s+files/DevLauncherApp-BridgelessReactNativeDevBundle\.js$') {
        throw 'bundle-unexpected-preserve'
    }
    $aferiAntes = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @('reverse', '--list')
    if ($aferiAntes.Code -ne 0 -or $aferiAntes.Lines.Count -ne 1 -or
        $aferiAntes.Lines[0] -notmatch '^\S+\s+tcp:8097\s+tcp:8097\s*$') {
        throw 'reverse-unexpected-preserve'
    }
    $aferiRemocao = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @('reverse', '--remove', 'tcp:8097')
    if ($aferiRemocao.Code -ne 0) { throw 'reverse-remove-failed' }
    $aferiDepois = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @('reverse', '--list')
    if ($aferiDepois.Code -ne 0 -or $aferiDepois.Lines.Count -ne 0) { throw 'reverse-offline-not-confirmed' }
    [pscustomobject]@{ BundleConfere = $true; ReverseAtivosDepois = 0 } | ConvertTo-Json
}
```

Com preparo aprovado: uma captura A, aproximadamente frontal, sem zoom digital,
preview/ready observados; enquadrar apenas o retângulo incluindo seus rótulos.
Transcrever os oito indicadores; comparar campos com os valores inventados:
corretos/incorretos/ausentes por campo, sem corrigir ou confirmar. Cancelar e
conferir câmera/revisão encerradas. Trocar no PC para B, sem tocar rede/Metro
ou recarregar app; preservar distância/enquadramento/luz/tamanho do cartão.
Somente se A encerrou normalmente, fazer uma captura B pelos mesmos passos.
Se A der erro, travar ou não liberar câmera, parar e não executar B.

Se os cartões não couberem completos no monitor, ajustar antes do ensaio e
anotar zoom do navegador; manter o mesmo ajuste para A/B. Não fazer varredura de
brilho/foco/distâncias ou tentativas extras nesta coleta. Anotar aproximações
ou mudanças inevitáveis; não inventar medidas.

Após cancelar, restaurar só reverse8097 via Update-AferiInspectorEvaluation.ps1
-PrepareMetro (na pasta rotulos), restaurar estados originais das conexões e
registrar ordem/resultado. Em falha de remoção não repetir automaticamente;
consultar/preparar restauração pelo script, sem reinstalar. Não deixar o usuário
sem orientação de recuperação se a captura interromper.

Retorno: JSON do preparo/restauração; versão/zoom do navegador; redes conforme;
para A e B separados, preview/ready, oito indicadores, correspondência dos três
campos (somente correto/incorreto/ausente), encerramento, cancelamento e erros.
Sem screenshot, fotos, OCR bruto, payloads, logcat ou heap dump. Sem espera idle
adicional. Privacidade e habilitação clínica permanecem bloqueadas.

### Verificações da preparação dos cartões

Lint, TypeScript raiz, 745 testes/67 suítes e diff sem erros de whitespace
aprovados. Chromium154.0.8037.57, viewport1280x900: HTML fornecido via setContent,
um cartão visível por seleção, retângulos600x452 sem corte/sobreposição entre
valores/rótulos e nenhuma requisição observada; renderização sete segmentos
inspecionada visualmente. Navegação file foi bloqueada por política do navegador
deste ambiente; abertura do arquivo no Windows do autor ainda não verificada.
Sintaxe do bloco PowerShell validada com parser7.5.4, sem executar ADB.
Nenhum ensaio ML Kit/Samsung ou acerto físico novo inferido desses checks.
