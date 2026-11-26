# TASK-09 — Etapa 6: diagnóstico de viabilidade e encaminhamento

## Conclusão executiva

**A viabilidade da fotografia para o cenário-alvo não foi demonstrada.** O
candidato ROI591 preservou A, mas não leu os valores do cartão B. Encerrar a
linha experimental ROI/orientação/escala nas condições observadas, sem segunda
variante automática, novas coletas ou alteração de motor/parser. Isso não prova
incapacidade universal do ML Kit nem inviabilidade de todas as abordagens.

Esta é a entrega documental da Etapa6: diagnóstico e encaminhamento preparados.
Decisão institucional de escopo e critérios de habilitação permanecem pendentes.
Não declarar fotografia/TASK09 concluída, nem habilitar integração clínica.

## Base e cadeia de evidências

PR84 merged em staging23b0823e79ced4cf8f2477b2e31cce34925dd28a, conteúdo
conferido equivalente ao resultado publicado d0419f1. Trabalho local e histórico
preservados. [Protocolo prévio](task-09-etapa-4-ab-roi591.md),
[resultado completo](task-09-etapa-4-resultado-roi591.md),
[artefato/inspeções/atualização](task-09-apk-roi591.md) e
[plano](task-09-plano-correcao-segmentos.md) sustentam a decisão.

- Fonte45f7376a7ed2f7e04725866ffe98ff625f057566; APK591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6.
- Bundle98d31d1e0523c3e8c00fbda33f052ea9e6637b8062c04478a3cb01111d3375c2,
  arquivo estático identificado, não todo código em RAM.
- Samsung SM-S731B, cartões sintéticos existentes120/80/72, roi-1/bridge-2,
  original→processado sequenciais por cartão. Sem dataset clínico do autor.
- A original/processado: três valores exatos, sem troca relatada.
- B original: três ausentes; B processado: três incertos. Rótulos passaram de
  ausentes a presentes, sem ASCII em Text/Block/Line/pós-bridge. Descartes
  investigados não sinalizados. Critério numérico prévio falhou.
- Encerramento/descarte normais segundo relato; sem heap/latência medidos nem
  teste físico de cancelamento interpassagens. Redes off declaradas separadamente
  do reverse0. Linha de buffers cortada não foi preenchida como observação.

Build/inspeções e coleta física foram feitos pelo autor. Codex revisou código,
testes e retornos sanitizados; não executou SDK no dispositivo nem recebeu fotos,
OCR bruto, dumps ou valores clínicos. A indicação incerto-ilegivel-ou-distante
não é medição de distância/foco/contraste. O indicador crop parcial não demonstra
isoladamente defeito de ROI; metadados consistentes não provam todos os pixels.

## Delimitação técnica e encerramento da investigação

Ganho limitado: detecção lexical dos rótulos de B. Objetivo não alcançado: três
valores sintéticos exatos de B sem troca, mantendo A. Ausência de ASCII já no SDK
difere da antiga evidência apenas pós-filtro, mas não identifica a causa completa.
Não corrigir o parser por faixa, histórico, ordem ou substituição de caracteres.

A normalização de luminância era condicional. Não há defeito fotométrico medido
que a justifique; o estímulo tem alto contraste. Não é necessário testar uma
variante injustificada para esgotar um máximo de duas. Somente roi-1 foi testada;
não afirmar que duas variantes ou todos os caminhos possíveis foram esgotados.
Não executar etapa5/generalização/LCD como se o candidato tivesse sido aprovado.
Não extrapolar esta rodada a outros aparelhos, displays ou contextos clínicos.

## Critérios e pendências independentes

| Frente | Demonstrado neste histórico | Continua pendente |
|---|---|---|
| Código/artefato | Testes puros/mocks, build Android pelo autor, hash/manifesto/backup/assinaturas, bytecode dirigido e instalação591 | Prova física integral de geometria/recursos/SDK; inspector analisado em escopo limitado |
| Leitura | A preservado; ganho lexical em B | Valores de B, LCD real, generalização e dois modelos de aparelho; sem acurácia representativa |
| Memória/localidade | Caminho próprio CameraX/NV21/RAM e ML Kit embarcado, limites próprios revisados | Internals SDK/SO, temporários/logs/retenção, heap/latência, telemetria/IDs, UID/destinos/reconexão, OEM/transferência |
| Revisão/persistência | Demo de comparação sem writer/mescla/confirmar | Integração clínica, nenhuma escrita/fila antes da confirmação, gravação única depois, origem/rules/contas/legado |
| Projeto | Evidências e limite técnico documentados | Metas finais e cobertura das PoCs, decisão formal sobre escopo e aceites |

TASK-04/06/07/09/18 permanecem abertas/parciais. A Etapa3 técnica concluída não
as encerra. Etapa4 teve resultado negativo; Etapa6 documental não reclassifica
esse resultado como sucesso. Pendências independentes podem ser organizadas em
trabalho próprio, sem exigir outro idle/captura para reiniciar contexto. Não
executar testes clínicos, serviços externos ou intervenções em produção.

## Encaminhamento concreto para a governança — ainda não aprovado

A [constituição](../constitution.md#aplicação) exige aprovação prévia da
orientadora para mudanças de escopo/procedimentos com terceiros/prazos. A
[revisão do TAP](revisao-specs.md) registra P106 (análise de limites), P117
(fotografia/confirmação/relatório técnico irredutíveis) e P02 (congelamento da
decisão técnica). Portanto, **não adotar manual como substituição aprovada da
fotografia, cortar a modalidade ou trocar stack automaticamente**. Manual é o
caminho preservado enquanto fotografia clínica continua bloqueada.

Texto preparado para o autor encaminhar, sem envio automático pelo assistente:

> O candidato local de fotografia ROI591 foi implementado, verificado e avaliado
> em cartões sintéticos com parâmetros prévios. Preservou a fonte comum, mas
> falhou nos três valores do cartão de sete segmentos; o processamento recuperou
> rótulos, não números. Não há fundamento demonstrado para a segunda variante
> condicional. Encerramos essa linha de correção com alcance limitado, sem
> declarar incapacidade universal do motor ou causa definitiva no LCD real.
> A fotografia consta como irredutível no TAP e não a estamos dando por concluída
> nem substituindo por entrada manual. Solicitamos definição formal de como
> tratar esse limite na entrega/avaliação e quais encaminhamentos de escopo são
> admissíveis sob P048/P106/P117/P02, preservando privacidade e confirmação.

Registrar a resposta efetivamente recebida, seu alcance e condições, sem retrodatar
aprovação ou presumir alteração de prazo/orçamento. Não existe aprovação dessa
mudança registrada nesta entrega. Horas/despesas/saldo realizados não informados;
nenhuma estimativa é convertida em gasto/resultado medido.

## Próximas ações delimitadas

1. Autor revisa este diagnóstico e encaminha a questão à orientadora pelos seus
   canais usuais; não há mensagem enviada pelo assistente ou assinatura presumida.
2. Até a definição, manter preservados código, APKs, cartões e relatórios; foto
   clínica bloqueada e caminho manual disponível. Nenhuma nova ação no telefone.
3. Planejar as pendências independentes que forem necessárias à entrega acordada,
   com evidências e metas prévias. Não usar tarefas extras para disfarçar o
   critério de leitura não atendido ou reabrir varredura de parâmetros.
4. Somente uma definição formal pode sustentar eventual revisão de planejamento;
   não há autorização automática para novo motor, nuvem, treino ou corte de PDF.

Etapa6 entregue como diagnóstico/encaminhamento. Projeto/modalidade permanecem
sem aceite clínico e sem conclusão fictícia. Sem merge, deploy, build ou coleta
novos por este documento.
