# 4. Metodologia

[← 3. Referencial](03-referencial-teorico-trabalhos-correlatos.md) · [Índice](README.md) · [Próximo: 5. Desenvolvimento →](05-desenvolvimento.md)

## 4.1 Visão geral

O ciclo seguiu um desenvolvimento **dirigido por especificação e por evidência**. A cadeia de documentos vai do mais estável ao mais operacional:

| Camada | Documento | Papel | Data de inclusão |
|---|---|---|---|
| Requisitos | [TAP v1.0](../fontes/tap-aferi-v1.0.md) | Objetivo, entregas, restrições, cronograma e núcleo irredutível | Datado de 22/09/2026; recebido em 27/10/2026 |
| Regras imutáveis | [Constituição](../../constitution.md) | Teto de custo, privacidade e LGPD, confirmação explícita, preservação do legado | `ebf7fa6`, 26/10/2026 |
| Especificações | [Fotografia](../../specs/spec-fotografia.md), [voz](../../specs/spec-voz.md), [PDF](../../specs/spec-relatorio-pdf.md) | Fluxo, invariantes, 57 critérios de aceite (FOT-01..16, VOZ-01..19, PDF-01..22) e a seção "Decisões do engenheiro" | Decisões em `e62181a`, 26/10/2026 |
| Plano | [tasks.md](../../tasks.md) | 34 tarefas, 100 h **estimadas** em quatro fases | `c540bae`, 26/10/2026 |
| Revisão | [Revisão das specs (TASK-02)](../revisao-specs.md) | Rastreabilidade R01–R15 contra o TAP, correções C01–C15, pendências P01 e P02 | 26–27/10/2026 |
| Registro corrido | [Decisões e evidências](decisoes-e-evidencias.md) | Decisões (D), evidências (E), pendências (Q) e marcos (M), só acrescentados | Desde 26/11/2026 |

A constituição, as specs e o plano entraram no repositório em **26/10/2026**, depois do marco de decisão técnica de 06/10 (ver [capítulo 6](06-decisao-tecnica-comparacao.md) e a pendência P02).

## 4.2 Fluxo de trabalho no repositório

- **Branches e PRs.** Cada entrega foi feita numa branch própria e integrada a `staging` por pull request. Até a base deste relatório, o histórico de `staging` tem 94 merges de PR (do #1, em 28/07/2026, ao #95, em 26/11/2026). `main @ 3f8220f` (PR #60, 08/10/2026) é ancestral de `staging`, e `origin/main..origin/staging` soma **195 commits**.
- **Integração contínua.** O workflow `.github/workflows/ci.yml` tem quatro jobs: *App* (lint, typecheck, Jest e checks Node/PowerShell das ferramentas de campo), *Cloud Functions* (build e testes), *Security Rules* (emulador do Firestore) e *Bridge OCR* (Java puro). Um check "Vercel Preview Comments" também aparece nos PRs.
- **Convenções.** Commits semânticos (Conventional Commits), TypeScript estrito, validação Zod de todo documento do Firestore e caminhos centralizados ([CLAUDE.md](../../CLAUDE.md) §3–§4).
- **Clientes isolados.** As modalidades novas foram desenvolvidas em **clientes de avaliação separados do produto** (`demos/android-capture`, `demos/web-capture`, `demos/photo-review`, `demos/android-voice`, `demos/web-voice`), sem Firebase, sem gravação e com confirmação só em memória. Os módulos nativos (`native-modules/aferi-photo-capture`, `native-modules/aferi-local-voice`) não fazem parte do autolinking do produto.

## 4.3 Desenvolvimento assistido por agentes de IA

O trabalho técnico foi executado majoritariamente por agentes de IA de programação, sob a direção do autor:

| Ator | Papel | Fonte |
|---|---|---|
| Autor | Decide escopo e prioridade; aprova push, PR e merge; faz tudo o que exige o mundo físico (build Android no Windows, instalação e ensaios no Samsung, Chrome com microfone, contas e ambientes); relata os resultados de forma sanitizada | D-003, D-006; [reavaliação §4 e §8](../reavaliacao-2026-11-26.md) |
| Claude Code (Anthropic) | PDF Web, correção de privacidade do Sentry, consolidações documentais, reavaliação de 26/11, redação deste relatório; revisão cruzada da voz no produto (confirmação, cancelamento, troca de conta) | D-002, D-006; diário do [registro](decisoes-e-evidencias.md) |
| Codex (OpenAI) | Investigação de fotografia (TASK-07/09, até o PR #85), PoCs e clientes de voz (#93); revisão cruzada dos guardrails do PDF | D-002, D-006; [etapa 6](../task-09-etapa-6-viabilidade-roi591.md) |

**Regras de coordenação** (D-006): um dono por alteração e por branch; `package.json` e lock só na branch do PDF; `app/(app)/history.tsx` só no PDF; `app/(app)/index.tsx` reservado à voz; `tasks.md` só em PRs de consolidação; **nenhum agente faz push, abre PR, faz merge, publica rules ou opera produção sem autorização expressa do autor**. Prompts de execução estão versionados em [docs/prompts](../prompts/).

**Limite da atribuição.** O campo de autor do Git não separa o trabalho do Codex do trabalho do autor. Dos 405 commits de `staging`, 182 têm autor "Claude" e 223 têm o nome do autor; desde 26/10/2026 são 35 e 160, respectivamente. A atribuição por agente segue os registros documentais citados acima, não o Git.

**Limite de investigação.** Cada bloqueio admite no máximo duas rodadas de correção. Na terceira, o agente para e reporta ([reavaliação §11](../reavaliacao-2026-11-26.md)).

## 4.4 Ledger de decisões e regras de evidência

O [registro de decisões e evidências](decisoes-e-evidencias.md) é a fonte primária deste relatório. Suas regras:

1. **Só acrescentar.** Uma entrada antiga é corrigida por outra nova que a referencia (exemplo: E-029 supera E-009 a E-011).
2. **Datas reais, sem retrodatação.**
3. **Separar fato observado, hipótese e decisão.**
4. **Fonte verificável** para cada fato: arquivo, commit, PR ou comando de reprodução.
5. **Sem dado sensível:** nenhum valor de medição real, áudio, imagem, e-mail, token ou identificador de conta.
6. **Horas e despesas "não informadas"** até o autor fornecê-las.
7. **Nada é registrado como concluído** sem a evidência exigida pela spec. Nenhuma caixa de `tasks.md` foi marcada sem essa evidência; estão marcadas apenas TASK-03 (desenho), TASK-14 (parser puro) e TASK-19 (acompanhamento).

Também se distingue **relato do autor transcrito** de **verificação reproduzida**. Os ensaios em aparelho e navegador (E-027, E-028) são relatos do autor, conferidos no texto mas não reproduzidos pelos agentes.

### Níveis de evidência usados no capítulo 7

| Nível | Definição | Exemplo |
|---|---|---|
| **Implementado** | Código em `staging`, revisado e com lint e typecheck verdes | Módulo `aferi-local-voice` |
| **Testado com dublês** | Testes automatizados com portas, SDK, rede ou relógio simulados, emulador do Firestore ou Chromium headless com dados sintéticos. Não envolve hardware nem serviço real | Testes de `useReportPdf`; construtor falso do `SpeechRecognition` |
| **Demonstrado** | Execução real em aparelho ou navegador físico, com estímulos sintéticos (cartões, frases), num cliente isolado ou sem login, relatada e não reproduzida por terceiros | V1 de voz no Samsung e no Chrome; leitura do cartão A |
| **Validado** | Critérios de aceite da spec atendidos **no produto**, nas plataformas declaradas, com a evidência que a spec exige (aparelho real, fluxo logado, inspeção de armazenamento e rede em runtime) | **Nenhuma funcionalidade nova atingiu este nível** |

## 4.5 Protocolos de ensaio físico

- **Estímulos sintéticos.** Cartões de visor em HTML/CSS (`tools/task09/cartoes-ocr.html`): cartão A com fonte comum (Arial) e cartão B com dígitos de sete segmentos, ambos com valores inventados. Para voz, frases sintéticas ditas pelo próprio autor. Não houve dado de usuário do produto, e a coleta com terceiros não ocorreu (TAP [P107](../fontes/tap-aferi-v1.0.md#p107); Q-007).
- **Protocolo congelado antes da coleta.** Exemplo: o [protocolo A/B do ROI591](../task-09-etapa-4-ab-roi591.md) fixou critérios e parâmetros antes do retorno.
- **Identidade do artefato.** SHA-256 do APK, hash do bundle JS, commit da fonte com árvore limpa e manifesto inspecionado por `aapt2`, com ferramentas PowerShell e Node versionadas em `tools/task07`, `tools/task09` e `tools/task12`, testadas no CI com simulações.
- **Retorno sanitizado.** O autor devolve categorias e resultados, sem fotos, OCR bruto, áudio ou dumps. Correções de transcrição são registradas de forma rastreável (exemplo: TASK-07, teste J).
- **Inventários de armazenamento** antes e depois dos casos, só com metadados (nome, tamanho, mtime). Não provam ausência de conteúdo interno.

## 4.6 Ambiente de homologação

Por decisão do autor (D-003, 26/11/2026), a homologação usa o **ambiente de produção** (Vercel/Firebase), porque recriar a configuração para um ambiente separado custaria tempo considerável e o app é de uso exclusivo do autor. As salvaguardas propostas foram: frontend local contra o backend de produção, sem promover nada na Vercel; segunda conta Google de teste para isolar as leituras por UID; flag de build desligada por padrão para a voz; publicação de rules só por ação expressa do autor; e o registro desta limitação no relatório. Essa decisão é declarada como limitação no [capítulo 9](09-discussao-limitacoes.md).

## 4.7 Controle de esforço e custo

O plano distribui **100 h estimadas** (18 + 38 + 28 + 16) e as despesas são limitadas a R$ 300,00. **Horas realizadas, despesas realizadas e saldo: não informado** (Q-009). As estimativas por tarefa de `tasks.md` são planejamento e não foram convertidas em horas executadas.
