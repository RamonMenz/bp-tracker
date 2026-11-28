# 4-A. Metodologia de desenvolvimento assistido por agentes de IA

[← 4. Metodologia](04-metodologia.md) · [Índice](README.md) · [Próximo: 5. Desenvolvimento →](05-desenvolvimento.md)

> **Resumo.** Quase todo o código e a documentação do ciclo foram produzidos por dois agentes de IA de programação, sob a direção de um único autor. O método se apoiou em quatro práticas: dono único por branch, ledger só de acréscimos, revisão cruzada em pontos críticos e regras de evidência que separam "testado" de "validado". A verificação encontrou defeitos reais antes do uso (§4A.5). O custo foi concentrar no autor tudo o que é físico e produzir muita documentação. Sem horas registradas, não dá para medir se houve ganho de esforço.

## 4A.1 Papéis

| Ator | O que fez | O que **não** fez |
|---|---|---|
| **Autor** | Decide escopo, prioridade e merges; executa tudo o que é físico (build Android no Windows, Samsung, Chrome com microfone, login com dados reais, impressão); relata resultados de forma sanitizada | Não teve horas registradas (Q-009) |
| **Claude Code** (Anthropic) | PDF Web (P1, P2, P4) e Android (P3); correções do Sentry, do prazo do jsPDF, do poppler no CI e do Crashlytics; consolidações do ledger; reavaliação de 26/11; este relatório | Não compila Android, não usa aparelho, não opera produção |
| **Codex** (OpenAI) | Fotografia (TASK-07/09, até o #85); voz: V1 (#93), V2 Web (#99), V3 Android (#101) e correção por consenso (#102) | Idem |

Fonte da atribuição: D-002, D-006 e o diário do [registro](decisoes-e-evidencias.md). O Git não separa o Codex do autor: dos 430 commits de `staging`, 193 têm autor "Claude", e os demais têm o nome do autor (E-048).

## 4A.2 Branches por agente e regras de coordenação

- **Um dono por alteração e por branch** (D-006). Exemplos: `feat/pdf-*` e `fix/*` do PDF ficaram com o Claude Code; `feat/voz-*` e `fix/voz-hipoteses`, com o Codex.
- **Arquivos reservados:** `package.json` e o lock só na branch do PDF; `app/(app)/history.tsx` só no PDF; `app/(app)/index.tsx` só na voz; `tasks.md` só em PR de consolidação.
- **Integração:** cada branch vira um PR para `staging`, com CI de quatro jobs (App, Functions, Rules no emulador, Bridge OCR). O merge é sempre do autor. `staging` foi levada a `main` pelo autor em 27/11 (#103, D-012).
- **Ações vedadas sem autorização expressa:** push, PR, merge, publicar rules, operar produção. Prompts de execução versionados em [docs/prompts](../prompts/).
- **Limite de investigação:** no máximo duas rodadas de correção por bloqueio; na terceira, o agente para e reporta. Exemplo: o emulador do Firestore falhou duas vezes no ambiente local da V3 (HTTP 403 no JAR), e a execução ficou para o CI ([voz-android-produto](../voz-android-produto.md)).

## 4A.3 Ledger e regras de evidência

O [registro de decisões e evidências](decisoes-e-evidencias.md) é a fonte do relatório. Regras principais (detalhes no [capítulo 4, §4.4](04-metodologia.md#44-ledger-de-decisões-e-regras-de-evidência)):

1. Só acrescentar. Exemplo: E-036 supera E-032 (conteúdo do PDF no CI), e E-037 supera E-033 (prazo).
2. Separar fato, hipótese e decisão, sempre com fonte verificável.
3. Separar **relato do autor transcrito** de **verificação reproduzida** (exemplos: E-042 e E-045 são relatos).
4. Nada é concluído sem a evidência da spec. Teste com dublê nunca vale como validação em aparelho.
5. Sem dado sensível: os números citados são estímulos sintéticos.

## 4A.4 Revisão cruzada

Planejada em D-006: o Codex revisa os guardrails do PDF, e o Claude Code revisa confirmação, cancelamento e troca de conta da voz. Na prática:

- A **consolidação documental** (T1, 27/11) leu o código e os CI dos PRs do outro agente e achou divergências: os testes pulados do PDF (E-032), o prazo que não cobria o jsPDF (E-033) e a mensagem crua no Crashlytics (E-034).
- [PENDENTE: o autor deve informar se a revisão cruzada formal dos PRs #99 a #102 pelo Claude Code e do #100 pelo Codex foi feita. Não há registro de revisão nos PRs.]

## 4A.5 Defeitos que a verificação encontrou

| Defeito | Como apareceu | Correção | Fonte |
|---|---|---|---|
| Troca de conta A → B → A reexibia a revisão do PDF da conta A, com URL já revogada (vazamento entre contas) | Teste de guardrail da P4, que falhava antes | Mesmo PR (#89) | E-020 |
| Breadcrumbs do Sentry Web levavam `aria-label`s como "N por N" (valores de pressão) | Revisão de privacidade do legado durante o PDF; 9 de 10 testes com o SDK real falhavam | #91 | E-023, E-024 |
| Conteúdo do PDF pulado no CI: 8 testes com `pdftotext` viravam `describe.skip` sem poppler, e o CI ficava verde | Leitura do log do CI na consolidação | #95: instala poppler e falha se ele faltar | E-032, E-036 |
| Prazo de 30 s não cobria o import do jsPDF/AutoTable; o diálogo podia ficar preso | Leitura do código na consolidação | #97 | E-033, E-037 |
| Mensagem de erro crua ia ao Crashlytics | Leitura do código (Q-013) | #98 redige a mensagem; restam os handlers globais da biblioteca (Q-022) | E-034, E-038 |
| No Android, o descarte de resultado tardio apagava o PDF adotado antes do compartilhamento | Teste do modo `share` que falhava | Mesmo PR (#100) | E-040 |
| Voz Android recusava hipóteses de grafia diferente antes do parser (0 de 10 sem pulso) | **Rodada real do autor**, não um teste automatizado | #102 (consenso), **sem validação em aparelho** | E-042, E-043 |

O último item mostra o limite dos dublês: os testes simulados passavam, e só o ensaio físico revelou o defeito.

## 4A.6 Ganhos e custos observados

- **Ganhos:** de 384 testes (26/10) para 1.134 no CI do #103 (E-044); ferramentas de campo com checks no CI; rastreabilidade fina; defeitos de privacidade achados antes do uso.
- **Custos:** volume documental grande e às vezes divergente; ciclo de feedback físico lento, dependente de uma pessoa; rastreabilidade de ensaios frágil quando o build sai de um commit local (Q-016, Q-023); autoria no Git que não distingue os agentes.
- **Limite:** sem horas registradas e sem grupo de controle, esta seção descreve e não mede.
