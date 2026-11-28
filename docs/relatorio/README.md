# Relatório técnico final — Aferi (ciclo 2º semestre de 2026)

**Situação:** rascunho de 28/11/2026 (segunda versão; a primeira é de 27/11, PR #96), para revisão do autor. Base verificada: `origin/staging @ f8cfdee`, com árvore idêntica à de `main @ 3153c05`. A apresentação (pitch narrado) é outro documento e não está aqui.

O relatório atende à orientação de entrega (identificação, metodologia, desenvolvimento, dificuldades, resultados, conclusão e referências) e às seções que o TAP exige do relatório técnico final ([P024](../fontes/tap-aferi-v1.0.md#p024)).

## Capítulos

| # | Capítulo | Seções do TAP P024 atendidas |
|---|---|---|
| 1 | [Identificação do autor e do projeto](01-identificacao.md) | — |
| 2 | [Contextualização e justificativa](02-contextualizacao-justificativa.md) | Contextualização |
| 3 | [Referencial teórico e trabalhos correlatos](03-referencial-teorico-trabalhos-correlatos.md) | Referencial teórico; trabalhos correlatos |
| 4 | [Metodologia](04-metodologia.md) (especificação, ledger, níveis de evidência, ensaios físicos, homologação) | Metodologia |
| 4-A | [Metodologia de desenvolvimento assistido por agentes de IA](04a-desenvolvimento-assistido-por-agentes.md) (papéis, branches, revisão cruzada, defeitos encontrados) | Metodologia |
| 5 | [Desenvolvimento](05-desenvolvimento.md) (legado × ciclo, arquitetura, fotografia, voz, PDF, privacidade, correções, release) | Desenvolvimento |
| 6 | [Decisão técnica e comparação entre abordagens](06-decisao-tecnica-comparacao.md) | Decisão técnica documentada; comparação entre abordagens |
| 7 | [Resultados](07-resultados.md) (quadro-resumo, **o que NÃO está validado**, por modalidade, marcos × realizado) | Resultados |
| 8 | [Dificuldades encontradas](08-dificuldades.md) | — |
| 9 | [Discussão crítica e limitações](09-discussao-limitacoes.md) | Discussão crítica |
| 10 | [Conclusão](10-conclusao.md) | Considerações finais |
| 11 | [Referências bibliográficas](11-referencias.md) | — |
| 12 | [Trabalhos futuros](12-trabalhos-futuros.md) | Considerações finais |

Fonte principal: [registro de decisões, evidências e pendências](decisoes-e-evidencias.md). Os IDs D-, E-, Q- e M- citados nos capítulos remetem a ele.

## Estado em uma linha por entrega (28/11/2026)

- **PDF Web:** no produto; validado pelo autor em fluxo logado (53 registros; relato).
- **PDF Android:** implementado e testado com dublês; **não validado em aparelho** (falta build novo).
- **Voz:** demonstrada nas demos (Galaxy S25 FE, Chrome 158); no produto Web e Android atrás de **flags desligadas**, testada só com reconhecedor **simulado**; correção das frases curtas (0 de 10) **sem validação**.
- **Fotografia:** fora do produto; resultado negativo no visor de sete segmentos nas condições observadas; pausada; estado final depende da orientadora.
- **Comparação entre abordagens:** não executada.
- **Horas, despesas e saldo:** não informado.

Lista completa do que falta validar: [capítulo 7, §7.2](07-resultados.md#72-o-que-não-está-validado).

## Lacunas que dependem do autor ou da orientadora

| Lacuna | Capítulo |
|---|---|
| Nome e código da unidade curricular | 1 |
| Aprovação do TAP (data e canal) | 1 |
| Recomendações de MRPA a citar das diretrizes; revisão de literatura da Fase 1; correlatos de voz; fonte sobre "doze por oito"; taxas de acerto de R9 e R10 | 2, 3, 11 |
| Documento de decisão anterior a 06/10, se existir, ou tratamento formal de P02 | 6 |
| Resposta da orientadora sobre fotografia, precedência P116 e comparação mínima (Q-001, Q-002, Q-006) | 6, 10 |
| Data de corte do legado (Q-005) | 5 |
| Se o Galaxy S25 FE da voz é o mesmo aparelho `SM-S731B` da fotografia | 7 |
| Commit e SHA-256 do APK da rodada de 27/11 e da rodada refeita a partir de `staging` (Q-023) | 7 |
| Ambiente, conta e data da validação do PDF Web (E-045) | 7 |
| Resultado do reteste da voz (#102), da V2, da V3 e do PDF Android, se executados até 08/12 (Q-024) | 7 |
| Revisão cruzada formal dos PRs #99 a #102 | 4-A |
| Atividades avaliativas 01 (22/09) e 02 (24/11), apresentações de 13/10 e 10/11 e demonstração de 28/10: realização e resultado | 7 |
| Conferência das referências marcadas "a confirmar" e formatação ABNT | 11 |
| Revisão da conclusão após as últimas entregas | 10 |

Todas as lacunas estão marcadas no texto como **[PENDENTE: …]**.
