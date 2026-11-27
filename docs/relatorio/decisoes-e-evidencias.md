# Registro de decisões, evidências e pendências — fonte para o relatório técnico final

Registro **corrido e cumulativo** (acrescentar ao final; não reescrever entradas antigas — corrigir
com nova entrada que referencie a anterior). Alimenta as seções de desenvolvimento, decisão
técnica rastreável, resultados, limitações e delimitação legado × ciclo do relatório técnico
final (TAP P024). Não substitui [tasks.md](../../tasks.md) (estado das TASKs) nem a
[constituição](../../constitution.md).

**Regras de escrita:** datas reais, sem retrodatação; distinguir *fato observado*, *hipótese* e
*decisão*; citar fonte verificável (arquivo, commit, PR, comando); não registrar valores de
medição, áudio, imagens, e-mails, tokens ou identificadores de contas; horas e despesas reais
permanecem **não informadas** até o autor fornecê-las; nenhuma funcionalidade é registrada como
concluída sem a evidência exigida pelas specs.

Prefixos: **D** decisão · **E** evidência · **Q** pendência acadêmica/aberta · **M** marco.
Autor da decisão = autor do projeto, salvo indicação.

---

## Decisões

### D-001 — 26/11/2026 — Pausa operacional da investigação de fotografia
- **Decisão (autor):** pausar novas capturas, ajustes experimentais e código de fotografia para
  concentrar a capacidade em voz, PDF, integração/validação e relatório.
- **Motivação:** a investigação de dígitos segmentados (PRs #64–#85) consumiu a capacidade do
  período sem entregar funcionalidade utilizável no produto; faltam 12 dias para a avaliação de
  08/12.
- **Preservado:** código, documentos, hashes de APK, cartões e checks de CI da fotografia.
- **Não significa:** conclusão, substituição pelo manual, troca de motor ou corte de escopo. A
  fotografia é irredutível no TAP (P117); o estado final depende da orientadora (Q-001, Q-002).
- **Condição de retomada:** resposta da orientadora, ou (ponto de decisão 03/12) PDF essencial e
  esqueleto do relatório prontos e vereditos de voz registrados; primeira ação possível:
  Tesseract.js nos cartões sintéticos existentes, **somente com autorização expressa do autor**.
- **Fonte:** [reavaliação](../reavaliacao-2026-11-26.md) §1 e §3.

### D-002 — 26/11/2026 — Ordem de execução: PDF e voz em paralelo
- **Decisão (autor), conforme proposta da análise:** P1 (PDF essencial na Web) e V1 (veredito de
  capacidade de voz) começam em paralelo, com dono único por branch (Claude Code: PDF; Codex:
  voz). Hipótese de previsibilidade verificada: **confirmada para o PDF**; **parcial para a voz**
  (a incerteza dominante é a disponibilidade do reconhecedor local, não o código de integração).
- **Evidência:** [reavaliação](../reavaliacao-2026-11-26.md) §2 e §6; E-004 a E-010.

### D-003 — 26/11/2026 — Homologação no ambiente de produção, com salvaguardas
- **Informação e decisão (autor):** a configuração de produção (Vercel/Firebase) teria de ser
  refeita para criar um ambiente de homologação, o que consumiria tempo considerável; o app é de
  uso exclusivo do autor; a homologação será feita no ambiente de produção.
- **Ressalva da análise:** é decisão legítima do autor, com riscos próprios: leituras de teste no
  histórico real, caminho de escrita experimental em produção e publicação das rules em produção.
- **Salvaguardas propostas (adotar ou ajustar):** (1) backend de produção com **frontend local**
  (`.env.local`; sem promover nada na Vercel); (2) **segunda conta Google de teste** para a
  homologação de voz, isolando as leituras por UID (as rules já isolam `users/{uid}`);
  (3) flag de build **desligada por padrão** para o ponto de entrada de voz; (4) publicação das
  rules em produção só por ação expressa do autor, caso a caso — nenhum agente publica rules nem
  opera produção; (5) registro no relatório de que a homologação foi feita em produção, sem
  ambiente isolado.
- **Estado de verificação:** compatibilidade das rules novas com dados reais de produção **não
  verificada** (E-014); existência/implantação da Function `onUserDelete` em produção **não
  verificada**.
- **Substitui:** a premissa de Firebase de homologação separado em
  [guia de validação](../guia-validacao-e-staging.md) §5 (documento histórico de 27/10).

### D-004 — 26/11/2026 — Ação explícita de instalação do modelo local (Web)
- **Decisão (autor, implícita ao pedir a tarefa V1 com adaptador Web):** permitir, no cliente Web
  de voz, uma ação **iniciada pelo usuário** que instala o pacote pt-BR local
  (`SpeechRecognition.install`). Nunca automática; nunca antes de `available()`; sem fallback
  remoto; a instalação de modelo estático é distinta de armazenar áudio (spec de voz §7.2).
- **Pendente:** decisão análoga para Android (`triggerModelDownload`, API 33+) somente depois do
  veredito V1b, se vier `model-missing`.

### D-005 — 26/11/2026 — Pontos de entrada assistidos atrás de flag e sob demanda
- **Decisão de projeto:** o ponto de entrada "Registrar por voz" só aparece com capacidade
  verificada **e** flag de build ligada; carrega o módulo sob demanda; o registro manual não
  depende de microfone nem de reconhecedor (VOZ-01; constituição §4).

### D-006 — 26/11/2026 — Distribuição entre agentes e regras de branch
- **Decisão:** um dono por alteração; ninguém refaz a investigação de fotografia;
  `package.json`/lock só na branch do PDF; `app/(app)/history.tsx` só no PDF;
  `app/(app)/index.tsx` só na voz; `tasks.md` só em PR de consolidação; revisão cruzada só em
  guardrails de PDF (Codex) e de confirmação/cancelamento/troca de conta na voz (Claude Code);
  nenhum agente faz push, PR ou merge sem autorização do autor.
- **Fonte:** [reavaliação](../reavaliacao-2026-11-26.md) §8; prompts em [../prompts](../prompts/).

### D-007 — 26/11/2026 — Escopo do PDF na entrega: Web implementada, Android pendente
- **Decisão (autor):** executar P1, P2 e P4 do PDF na Web antes da P3 (Android), porque a P4 não
  depende dela. A P3 depende do Dev Client do produto com `expo-print` (Q-010, sem resposta).
- **Efeito:** sem Dev Client até a avaliação de 08/12, o PDF no Android não será entregue e o
  relatório declara o alcance (Web). Trocar de biblioteca no Android seria mudança da decisão
  congelada e iria à orientadora.
- **Fonte:** [docs/pdf-relatorio.md](../pdf-relatorio.md).

### D-008 — 26/11/2026 — Worker para a geração do PDF: avaliado e não adotado
- **Fato (agente, P2):** com worker, o Metro passa a carregar um bloco de ~567 KB com o jsPDF em
  toda abertura do app, o que desfaz o ganho de carregamento sob demanda da P1.
- **Decisão:** manter a geração na thread principal com limite de 3.000 registros (recusa sem
  truncar) e prazo de 30 s para carregamento e leitura; a renderização não é interrompível.
- **Fonte:** `docs/pdf-relatorio.md` §8.2.

### D-009 — 26/11/2026 — Prévia embutida só com visualizador de PDF do navegador
- **Fato (agente, P2):** no Chromium sem visualizador, o `<iframe>` da prévia baixou o arquivo
  antes de "Salvar PDF". **Decisão:** embutir a prévia só se `navigator.pdfViewerEnabled`; nos
  demais, texto orientando a salvar. O caso com visualizador não foi exercitado (Q-011).

---

## Evidências (verificadas em 26/11/2026 por leitura; ver tabela completa na reavaliação §2)

| ID | Evidência | Como reproduzir |
|---|---|---|
| E-001 | `staging @ 2afb60d` = remoto; `main @ 3f8220f` ancestral; 139 commits de diferença | `git rev-list --count origin/main..origin/staging` |
| E-002 | CI do PR #85 verde (App, Functions, Rules no emulador, Bridge OCR) | check-runs do PR #85 no GitHub |
| E-003 | 8 branches `claude/*` com commits fora de `staging` (4 patch-equivalentes); patch do commit extra de `docs/task-07-revisao-samsung` idêntico ao do #68 | `git branch -r --no-merged origin/staging`, `git cherry`, `git patch-id` (após `git fetch --unshallow`) |
| E-004 | PDF: zero código e zero dependências de geração no `package.json` | `package.json`; busca "pdf" em `src/` e `app/` |
| E-005 | Versões compatíveis disponíveis: `expo-print@57.0.2`; `jspdf@4.2.1`; `jspdf-autotable@5.0.9` | `npm view <pacote> version peerDependencies` |
| E-006 | O container de agente tem `pdftotext`/`pdftoppm`, Java 21, alcança npm, Maven Central e o JAR do emulador do Firestore; não alcança o Google Maven | `which`, `java -version`, `curl -I` |
| E-007 | Produto já contém tipos/schema/repositório/rules/porta de confirmação para `photo/voice`, mas nenhuma rota de `app/` os usa | `models.ts:15`, `reading.schema.ts:102`, `firestore.rules:114`; busca em `app/` |
| E-008 | Modo `recognition` com escritor só é instanciado em testes; STT real usaria `preview` | busca por `mode:` em `src/` |
| E-009 | Cliente `demos/android-voice` sem o endurecimento dos PRs #75/#76; ferramental Windows específico da fotografia | `demos/android-voice/app.json` × `demos/android-capture/`; `tools/task07/*` |
| E-010 | Adaptador Web de voz integrado sem ação de instalar modelo; módulo Android sem `triggerModelDownload` | busca `.install(` e `LocalSpeech.kt` |
| E-011 | Nenhum commit de voz desde 27/10 (`09eea48`) | `git log -- <caminhos de voz>` |
| E-012 | Legado do PDF: `getAllReadings` sem ID/cache/omitidos; `Reading` sem `id`; `computeDailyTrend` 7/30 inteiros; `file.native.ts` grava em `documentDirectory`; `file.web.ts` revoga a URL de imediato; `useExportCsv` repassa `error.message` | leitura dos arquivos citados na reavaliação §2 |
| E-013 | `staging`/`main` e histórico: 349 commits no total; 41 antes de 04/08; 171 entre 04/08 e 25/10; 137 desde 26/10; PR #1 em 28/07/2026 | `git rev-list --count --before/--after`; GitHub `list_pull_requests` |
| E-014 | Rules legadas já exigiam `source == 'manual'` desde 28/07; atuais aceitam `manual/photo/voice` e tornam `source` imutável no update; **sem registro de publicação das rules novas** | `git log -p -- firestore.rules`; `tasks.md:137` |
| E-015 | Investigação de fotografia: resultado negativo do ROI591 nas condições observadas; encerramento limitado; sem causa demonstrada | [etapa 4](../task-09-etapa-4-resultado-roi591.md), [etapa 6](../task-09-etapa-6-viabilidade-roi591.md) |
| E-016 | PRs do PDF mesclados em `staging`: [#87](https://github.com/RamonMenz/bp-tracker/pull/87) (P1), [#88](https://github.com/RamonMenz/bp-tracker/pull/88) (P2), [#89](https://github.com/RamonMenz/bp-tracker/pull/89) (P4, `a80250f`); CI do #87 e do #89 verde nos quatro jobs (App, Functions, Rules, Bridge OCR) | check-runs dos PRs no GitHub (verificado por leitura); lista de arquivos do #87: 26 arquivos, CSV e `getAllReadings` sem alteração |
| E-017 | Dependências do PDF: `jspdf` 4.2.1 e `jspdf-autotable` 5.0.9, fixadas; `luxon` já existia. `metro.config.js` devolve módulo vazio para `canvg`, `html2canvas` e `dompurify` só quando importados de dentro de `node_modules/jspdf` | `package.json`; `git diff` do #87 em `metro.config.js` |
| E-018 | Bundle Web (valores **reportados pelo agente e registrados em `docs/pdf-relatorio.md` §5 e §8.4; não reexecutados na análise**): P1 entrada +12.101 B (+3.136 B gzip), chunks sob demanda +571.110 B (+179.705 B gzip); P2 +3,9 KB gzip no total, +1,5 KB no carregamento inicial | `npx expo export -p web`, antes e depois (§5, §8.4) |
| E-019 | Testes (reportados; CI verde): 912 testes/79 suítes após a P1; 952/82 após a P2; 976/84 após a P4; `npm run test:rules` com 86 testes (7 novos do PDF-20, no job de Rules do CI) | `docs/pdf-relatorio.md` §7, §8.3, §9.3 |
| E-020 | **Defeitos reais achados pela P4, com teste que falhava antes:** (1) troca de conta A→B→A reexibia a revisão antiga com URL de prévia já revogada (vazamento entre contas); (2) rádios do diálogo do PDF sem `aria-checked` na Web | `docs/pdf-relatorio.md` §9.1 e §9.7 |
| E-021 | Rede e logs na geração (Chromium local, rede externa bloqueada): nenhuma requisição externa durante a geração; o único host externo na abertura é o reCAPTCHA do App Check, que não vem do relatório; logger em modo produção não recebeu sentinelas clínicas | `tools/pdf-relatorio/browser-check.cjs`, `report-privacy.test.ts`, §9.4 |
| E-022 | Achado de plataforma: o substituto de `TextDecoder` do Expo só aceita UTF-8, e uma dependência do jsPDF precisa de latin1; reforça manter `expo-print` no Android | `docs/pdf-relatorio.md` §3 |
| E-023 | Risco residual no legado (fora do PDF): o Sentry da Web grava o `aria-label` do elemento clicado (`dom: true`) e as linhas do Histórico contêm valores de pressão; os rádios do CSV e do tema também não têm `aria-checked` | `docs/pdf-relatorio.md` §9.4, §9.7 |
| E-024 | Correção de privacidade do Sentry Web mesclada ([#91](https://github.com/RamonMenz/bp-tracker/pull/91), 26/11/2026): integração `Breadcrumbs` desligada, `beforeBreadcrumb` descarta, `beforeSend` reduz o evento ao essencial. Causa confirmada no SDK instalado (`@sentry/browser` 10.70.0): `dom`, `console`, `fetch`, `xhr` e `history` ligados por padrão. 10 testes de privacidade com SDK real falhavam (9 de 10) antes e passam depois. **Não verificado:** chegada ao Sentry real. O diagnóstico perde a mensagem da exceção (ficam tipo, stack e `scope`) | [docs/sentry-privacidade.md](../sentry-privacidade.md) |
| E-025 | Estado do PDF após #87–#91 (valores reportados pelo agente; matriz em `docs/pdf-relatorio.md` §10): **19 de 22 critérios com evidência automatizada, 3 parciais (PDF-10, 16, 21), 0 validados em aparelho ou fluxo logado**; TASK-23 e 25 parciais (só Web), TASK-24 não iniciada, TASK-26 parcial | [docs/pdf-relatorio.md](../pdf-relatorio.md) §10 |

---

## Pendências acadêmicas e abertas (dependem da orientadora, salvo indicação)

| ID | Pendência | Referência TAP/spec |
|---|---|---|
| Q-001 | Estado final da fotografia (irredutível) diante do resultado negativo; carta da Etapa 6 preparada, **sem registro de envio ou resposta** | P117, P106, P048 |
| Q-002 | Priorizar voz sem a fotografia completa inverte a precedência descrita em P116 | P116 |
| Q-003 | Marco de 24/11 vencido; marco de 06/10 sem evidência (P02); nenhuma prorrogação presumida | P103, P110 |
| Q-004 | Aceite formal de P01 (`source` = origem da primeira gravação confirmada) antes de habilitar fora da homologação | [revisão](../revisao-specs.md) P01 |
| Q-005 | Data de corte do legado (PR #1 em 28/07/2026; PRs #4–#60 entre 13/08 e 08/10) e aprovação do aproveitamento | P044, P105 |
| Q-006 | Comparação mínima aceitável para o relatório (fotografia e voz); a de voz com Whisper.cpp exige corpus de áudio e não está dimensionada | P024, P106, P117 |
| Q-007 | Coleta de voz de terceiros (aprovação prévia e consentimento por escrito) | P048, P107 |
| Q-008 | TAP sem assinatura/aprovação evidenciada no arquivo recebido | P118–P129 |
| Q-009 | **(autor)** Horas, despesas e saldo do teto de R$ 300: não informados | P048, P111 |
| Q-010 | **(autor)** Existe Dev Client do produto instalável no Samsung (EAS ou build local)? Há outras contas com dados no Firebase de produção? | — |
| Q-011 | **(autor)** Validar o PDF Web com dados reais em fluxo logado (local, só leitura) e a prévia num Chrome com visualizador de PDF; informar o número de registros (limite de 3.000); impressão A4 e em cinza | PDF-03, 10, 15 |
| Q-012 | **(decisão)** Restringir o registro de cliques do Sentry na Web (valores clínicos podem chegar à telemetria; constituição §2) — correção no legado, ainda não iniciada | Constituição §2 |
| Q-013 | **(decisão)** Coletor nativo: `crashReporter.native.ts` repassa `error.message` sem filtro ao Crashlytics (mesmo vetor fechado no Web); decidir se redige a mensagem também no nativo. Não alterado | Constituição §2; [sentry-privacidade.md](../sentry-privacidade.md) |
| Q-014 | **(autor)** Quantos registros tem o histórico (limite do PDF: 3.000)? Teste do PDF Web com dados reais em fluxo logado, impressão A4/cinza e leitor de tela real continuam pendentes (ver Q-011) | PDF-03, 10, 21, 22 |

---

## Marcos do TAP × estado em 26/11/2026

| ID | Marco | Estado |
|---|---|---|
| M-001 | 27/10 — duas modalidades integradas ao app e casos coletados | Não atendido (módulos isolados, fora do produto; sem corpus) |
| M-002 | 10/11 — comparação concluída | Não atendida |
| M-003 | 24/11 — PDF operante; referencial/método/desenvolvimento redigidos | **Não atendido** (zero código de PDF) |
| M-004 | 08/12 — avaliação 03 (60%) | 12 dias corridos |
| M-005 | 15/12 — encerramento | 19 dias corridos |

---

## Diário de execução (acrescentar abaixo, mais recente por último)

Formato: `AAAA-MM-DD — responsável — o que foi feito — evidência (arquivo/commit/PR/comando) — limites`.

- 2026-11-26 — Claude Code — reavaliação de estratégia, verificação das hipóteses e plano de
  entregas registrados — [reavaliacao-2026-11-26.md](../reavaliacao-2026-11-26.md), prompts em
  [../prompts](../prompts/) — análise por leitura; testes do app não reexecutados; nada publicado.
- 2026-11-26 — Claude Code (outro chat) — PDF Web: P1 ([#87](https://github.com/RamonMenz/bp-tracker/pull/87)), P2 ([#88](https://github.com/RamonMenz/bp-tracker/pull/88)) e P4 ([#89](https://github.com/RamonMenz/bp-tracker/pull/89)) mesclados — [docs/pdf-relatorio.md](../pdf-relatorio.md), E-016 a E-023, D-007 a D-009 — Web coberta por testes automatizados; **nenhum critério validado em aparelho nem em fluxo logado**; Android (P3) não iniciado.
- 2026-11-26 — Claude Code (outro chat) — correção de privacidade do Sentry Web mesclada ([#91](https://github.com/RamonMenz/bp-tracker/pull/91)) — E-024, [sentry-privacidade.md](../sentry-privacidade.md) — **Q-012 atendida no Web** (mantida no histórico acima como pendência aberta na data); nativo e Sentry real seguem pendentes (Q-013).
- 2026-11-26 — Claude Code (esta sessão) — consolidação do estado do PDF (E-025) e nota de atualização em `docs/pdf-relatorio.md` §12 — verificação por leitura de PRs e documentos; testes e bundle não reexecutados.
