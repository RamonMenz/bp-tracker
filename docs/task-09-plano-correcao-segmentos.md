# TASK-09 — plano de correção da leitura segmentada Android

## Objetivo, base e limite da decisão

Plano solicitado pelo autor; não é implementação, resultado de teste ou
aprovação clínica. Base staging49627427b56b6e19b518954421525ea6a14dbac8,
merge do PR#78 confirmado. [Evidência A/B](task-09-diagnostico-visor-real.md#retorno-ab--fonte-comum-correta-sete-segmentos-sem-dígitos-ascii):
A teve três campos corretos; B, rótulos presentes e nenhum dígito ASCII nos
tokens utilizáveis, com três campos ausentes. Uma tentativa de cada, sem taxa
ou latência inferidas. Privacidade integral SDK/SO e leitura do LCD real não
comprovadas. Diagnóstico aponta captura/reconhecimento/bridge antes do parser.

Referências: constitution.md; tasks.md TASK-04/06/07/09/18;
spec-fotografia§§3.2,6.2–6.4 e FOT-03/07/10/12/16; registro do PR#78;
AferiPhotoView.kt, FrameBytes.java e interpret-photo.ts.
Prazo final registrado:15/12/2026. Esforço/saldo reais não informados; não prometer
prazo ou custo de implementação sem aferição. Este plano não muda escopo/stack.

## Ordem de execução proposta

### 1. Conferir o caminho e preparar diagnóstico restrito — Codex

- Conferir ciclo de captura, rotação/contrato de coordenadas, dimensões efetivas,
  resolução selecionada e transformação preview→quadro; não presumir que preview
  e ImageAnalysis tenham campo visível idêntico.
- Distinguir presença de dígitos na saída ML Kit e depois dos filtros da bridge
  (boundingBox ausente/linha longa), somente categorias fixas ou contagens técnicas
  limitadas. Nada de texto bruto, valores, caixas textuais, logs ou snapshots.
- Testar a projeção de diagnóstico com entradas sintéticas e sentinelas sensíveis.
  Se a bridge estiver descartando dígitos úteis, corrigir o contrato/filtragem com
  limites equivalentes e testes, antes de escolher pré-processamento.
- Não pedir outra rodada física somente para ampliar diagnóstico. Incorporar
  indicadores necessários ao candidato que será avaliado na etapa4.

Saída revisável: hipótese de transformação documentada, contrato de coordenadas
explícito e instrumentação somente na demo. Sem reinterpretação por faixa,
ordem, histórico ou substituição de letras por números.

### 2. Implementar candidato mínimo em RAM — Codex

- Primeira variante: região de interesse que preserve números E rótulos,
  orientação correta e redimensionamento limitado. Priorizar legibilidade do
  quadro entregue ao ML Kit, não redesenho/reconstrução dos dígitos.
- No BSPII os rótulos ficam na carcaça. Não recortar apenas o LCD. A guia visual
  deve corresponder ao quadro analisado por transformação comprovada, considerando
  rotação, escala e corte do preview; não usar retângulo arbitrário no sensor.
- Normalizar as caixas retornadas ao contrato upright-frame de origem, incluindo
  offset do recorte/escala; impedir deslocamento de SYS/DIA/PUL ou empréstimo de
  números acessórios. Testar percurso de ida/volta das coordenadas.
- Implementar transformador puro e testável, sem dependências novas. Manter o
  limite existente MAX_FRAME_PIXELS=1920000 e validar dimensões/strides/overflow.
  Definir e verificar limite de buffers intermediários; o teto de pixels sozinho
  não comprova teto total de RAM, inclusive memória interna do SDK.
- Normalização de luminância é segunda variante condicional, somente se houver
  justificativa no resultado/diagnóstico da primeira. Cartão B já tem contraste
  visual alto: não assumir que contraste resolverá. Fixar parâmetros antes da
  coleta; não usar busca de parâmetros nem preenchimento de segmentos apagados.

Escopo máximo proposto: duas variantes justificadas, sem transformar teste em
varredura. Se a etapa1 apontar falha de bridge, reavaliar necessidade das variantes.
Sem treinamento, classificador próprio de sete segmentos, OpenCV, outro motor,
upload ou fallback remoto. Não modificar parser para fabricar dígitos ausentes.

### 3. Verificar código, recursos e artefato — Codex; build físico pelo autor

- Testes puros: identidade, recortes nas bordas, dimensões inválidas/ímpares,
  strides/posições, rotações0/90/180/270, escala e inversão de coordenadas,
  entrada uniforme e limites de alocação. Imagens geradas de teste não contêm
  conteúdo do usuário. Testes geométricos não demonstram acerto do ML Kit.
- Regressões: uma tentativa ativa, cancelamento/background/desmontagem,
  rejeição tardia, falha de processamento/cleanup e isolamento. Manter lease
  até o SDK concluir; nenhum buffer em uso pode perder sua referência antes
  disso. Não alegar apagamento físico/instantâneo da RAM por remover referências.
- Código e testes pertinentes, lint/typecheck/Jest, compilação nativa e CI antes
  de solicitar instalação. Quando o build depender do Windows, fornecer comandos
  fixados e sanitizados; não afirmar compilação Android apenas por testes JVM.
- Validar novo APK por hash, manifesto/regras backup, configuração de inspector e
  assinatura comparada ao instalado. Atualização restrita deve aceitar o NOVO
  candidato identificado: scripts fixados no hash259 não o instalam corretamente.
  Não reutilizar guards de hashes como se fossem genéricos nem pedir uninstall.
- Novo código nativo exige APK novo; Metro não o atualiza. Preservar APK259,
  fontes/bundle2191 e cartões como referências, sem rebuild das cópias antigas.

### 4. Experimento controlado antes/depois — autor no Samsung; análise pelo Codex

Preparar modo explícito de avaliação na demo, sem habilitar produto. Um quadro
capturado pode alimentar original e variante sequencialmente para reduzir
variação entre fotos; se adotado, comparar separadamente os resultados em RAM.
Não mesclar campos, escolher o que parece válido ou apresentar duas passagens
como uma captura clínica normal. Uma chamada por vez, sem retry silencioso;
cancelamento impede a segunda e mantém descarte das pendentes.

Avaliar A e B no mesmo candidato, parâmetros fixos e sem rede após carregar
assets/aplicação. Uma coleta por estímulo/variante definida, sem seleção de
sucessos. Registrar original/processado, hash/revisões, configuração aplicada,
correspondência exata por campo, trocas, erro válido, ausências e tempos técnicos.
Medir duração/alocações quando houver ferramenta adequada; não pedir heap dumps
ou tráfego com conteúdo. Sanitizar falhas; não transmitir pixels/OCR/valores
clínicos. Retorno do autor só categorias e comparação dos estímulos inventados.
Se medir somente latência de uma tentativa, não reportar p50/p95 representativos.

Decisão local: candidato só avança se A continuar correto e B apresentar os
três valores sintéticos exatos, sem troca, enquanto cleanup/cancelamento seguem
corretos. Isso autoriza ampliar avaliação, NÃO concluir correção geral. Se B
continuar sem resultado, analisar diagnóstico antes da única segunda variante
condicional; se houver resultado errado apresentado como válido, bloquear avanço.
Falha técnica/privacidade interrompe sem novas tentativas automáticas.

### 5. Verificar generalização e LCD físico — etapa distinta

Se o par inicial melhorar, congelar variante/parâmetros. Usar conjunto sintético
separado do ajuste, cobrindo0–9, diferentes comprimentos, pulso ausente e números
acessórios, segmentos/larguras/espaçamentos e condições visuais previamente
especificadas. Não escolher somente exemplos que passaram. Definir quantidade,
metas e timeout a partir da PoC ANTES da avaliação final, conforme TASK-06;
este plano não inventa metas atingidas ou amostra já coletada.

Validar depois o LCD físico com protocolo próprio e entradas acadêmicas
não identificáveis, sem novas medições feitas por causa do teste ou dados de
usuários do produto. Não presumir que o BSPII tenha modo de teste não documentado.
Se não houver estímulo físico adequado, registrar bloqueio; cartão em monitor
não substitui essa evidência. Cobertura final da spec exige pelo menos dois
modelos de aparelho; não inventar disponibilidade do segundo. Procedimentos
com terceiros seguem governança do TAP. Não enviar fotos/resultados clínicos.

### 6. Fechar diagnóstico de viabilidade e critérios restantes

- Se houver ganho: documentar exatamente versão/configuração/cobertura e concluir
  apenas critérios demonstrados. Preservar revisão obrigatória e caminho manual.
- Se as variantes compatíveis não resolverem: registrar inviabilidade/limite
  observado para esse caminho/estímulo e encaminhar decisão de escopo pela
  governança do projeto. Não trocar motor, omitir falha ou declarar modalidade
  concluída para cumprir prazo. Não expandir indefinidamente a investigação.
- Em paralelo, sem exigir repetição de idle: inspeção compilada do inspector,
  telemetria/identificadores SDK e rede por UID/destino/reconexão; sem conteúdo.
  São critérios de habilitação próprios, não correções para sete segmentos.
- Após viabilidade, ainda faltam integração/nenhuma escrita ou fila antes da
  confirmação, gravação única depois dela, contas e legado. Sucesso no cartão
  não habilita autolinking/rotas clínicas ou persistência automaticamente.

## Próxima ação e situação desta entrega

O plano está preparado para revisão. Não há implementação de pré-processamento,
novo APK, nova coleta física ou garantia de correção nesta entrega. Nenhuma ação
no dispositivo é necessária agora. Próxima implementação é a etapa1 e o candidato
mínimo da etapa2, em branch própria do staging então atual, com entregas pequenas
que mantenham um resultado revisável por hipótese. Não concluir TASK-04/06/07/09/18.

## Continuidade — primeira entrega da etapa 1

Etapa 1 implementada na branch `fix/task-09-diagnostico-bridge`, sobre staging
`a106a39` após confirmação dos merges #78/#79. [Caminho, contrato e limites](task-09-diagnostico-visor-real.md#etapa-1-do-plano--caminho-conferido-e-diagnóstico-da-bridge-preparado):
projeção `bridge-1`/`associacao-3` separa presença de ASCII nas linhas do SDK e
após filtros, com categorias de descarte e metadados técnicos em memória.
Política de 500 linhas/500 caracteres e parser preservados. Fonte explicita
preview FILL_CENTER, análise completa e ausência de transformação comum; isso
não demonstra geometria ou descarte de dígitos no A/B físico anterior.

Lint/TypeScript raiz/demo, 773 testes/68 suítes e checks Java puros aprovados.
Compilação Kotlin/APK e etapas 2–6 continuam pendentes. Nenhum pré-processamento,
novo artefato ou resultado físico comprovado. Não pedir nova captura para obter
diagnóstico isolado; incorporá-lo ao candidato posterior. Continuação dependente
não requer merge intermediário. Tarefas parciais e habilitação bloqueada.
