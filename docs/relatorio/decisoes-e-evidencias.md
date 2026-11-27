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

### Evidências verificadas em 27/11/2026

Base: `origin/staging @ 1140197` (merge do PR #93), histórico completo (`git fetch --unshallow`).
Os resultados de aparelho e navegador (E-027, E-028) são **relatos do autor transcritos** nos
documentos de voz; esta consolidação conferiu o texto registrado, **não reproduziu** os ensaios.

| ID | Evidência | Como reproduzir |
|---|---|---|
| E-026 | PR [#93](https://github.com/RamonMenz/bp-tracker/pull/93) (`feat/voz-capacidade`, Codex) mesclado em `staging` em 27/11/2026 (merge `1140197`, head `62356aa`): 10 commits, 29 arquivos, +1.368/−154. Conteúdo: listener registrado antes de `checkRecognitionSupport` (`523cf74`); cliente `demos/android-voice` com `allowBackup: false`, plugins `with-no-backup` e `with-disabled-network-inspector` e XML de backup/extração (`f8a98fe`); ferramental Windows `tools/task12/*` (build, identidade do APK, Metro) com checks no CI (`b0a5edb`); instalação explícita do pacote pt-BR na Web (`3c5a078`); `build/` ignorado no módulo de voz (`34c942d`); Tailwind próprio da demo (`dde2d50`); reutilização da permissão de microfone já concedida (`6b6db56`); documentos `task-12-voz-android.md`, `task-12-revisao-estatica.md` e `task-13-voz-web.md` (`ee22873`, `5be2488`). Sem `package.json`/lock; nenhuma rota de `app/` usa voz | `git show --stat 1140197`; GitHub `pull_request_read` (get, get_commits); `grep -rl -i voice app/` vazio |
| E-027 | **V1 Android (relato do autor):** Samsung Galaxy, Android 17/API 37, APK do cliente isolado compilado no Windows, Metro por USB na porta 8099, frases sintéticas do autor. **Observado:** candidatos corretos em pt-BR em pares completos com e sem pulso, inclusive em modo avião (Wi-Fi e dados desligados); variabilidade entre tentativas (`ambiguous-result`, tentativas sem candidato, revisão vazia); manual acessível antes do microfone e após recusa; silêncio sem candidato, com indicador apagado; fim automático; cancelamento em escuta; Home durante a escuta; confirmação só em memória, descartada ao sair. **Não observado/não verificado:** decimal, escala mista, dois pares/autocorreção, ruído e pulso isolado; variantes sem serviço, com API inferior ou sem pt-BR; demais fases de cancelamento e interrupções (tela bloqueada, rotação, ligação); TalkBack (J); rede e retenção do serviço do SO (K); causa dos cancelamentos de permissão anteriores à correção; número de tentativas não tabulado. Divergência interna: `task-12-revisao-estatica.md` ainda diz "a compilação Kotlin segue pendente", enquanto o registro da V1 relata a compilação no Windows (não corrigido aqui, fora do escopo) | [task-12-voz-android.md](../task-12-voz-android.md#resultado-da-v1-no-samsung) |
| E-028 | **V1 Web (relato do autor):** Chrome 158.0.8127.89 oficial, 64 bits, Windows, demo em `http://127.0.0.1:8100`. **Observado:** estado `downloadable` → instalação por toque explícito → nova consulta `available`; nova ação explícita produziu os candidatos sintéticos esperados; repetição com o PC desconectado da rede externa (servidor em loopback) também conferiu; indicador de microfone apagou nas duas condições. **Não observado/não verificado:** negativa de permissão na Web; cancelamento real no Chrome (só construtor falso nos testes); decimal, escala mista e dois pares; leitor de tela; rede e retenção pelo navegador; total de tentativas e resultados por frase não tabulados; **commit do ensaio não registrado**. A comparação com o Samsung é qualitativa | [task-13-voz-web.md](../task-13-voz-web.md#resultado-da-v1-no-chrome) |
| E-029 | **E-009, E-010 e E-011 superadas pelo #93** (as entradas originais ficam como registro de 26/11). E-009: o cliente de voz agora tem `allowBackup: false` e os dois plugins (`demos/android-voice/app.json:13,28-29`), e há ferramental Windows próprio da voz (`tools/task12/`) e checks `--voice` no CI. E-010 **superada em parte**: a Web chama `Speech.install(...)` (`src/services/recognition/web-voice.web.ts:171`); no Android, `triggerModelDownload` continua ausente do módulo (zero ocorrências) e a pendência Android de D-004 segue aberta. E-011: 7 commits de código/ferramentas de voz em 26–27/11 (`523cf74`…`6b6db56`) | `grep -rn triggerModelDownload native-modules/aferi-local-voice`; `git log --since=2026-10-28 -- <caminhos de voz>` |
| E-030 | `origin/main..origin/staging` = **186** commits (era 139 em E-001); `main @ 3f8220f` continua ancestral de `staging @ 1140197`; histórico de `staging` com 396 commits (E-013 registrava 349). Supera a contagem de E-001 e da [reavaliação](../reavaliacao-2026-11-26.md) §2 e §7 | `git rev-list --count origin/main..origin/staging`; `git rev-list --count origin/staging`; `git merge-base --is-ancestor` |
| E-031 | CI do PR #93 (run `45916359565`, head `62356aa`, árvore idêntica à de `staging @ 1140197`, `8514201`): **App** verde — lint, typecheck, Jest com **85 suítes e 1.001 testes: 993 aprovados e 8 pulados**, mais os checks Node/PowerShell (inclusive os novos `--voice` e `tools/task12/*`, só com simulações); **Cloud Functions** 16/16; **Security Rules** no emulador 86/86 em 2 suítes; **Bridge OCR** verde; "Vercel Preview Comments" verde (indica integração com a Vercel; nada diz sobre a branch de produção). A descrição do PR informa 846 testes/71 suítes "na branch", número não reconciliado com o CI | GitHub `get_check_runs` e `get_job_logs` dos jobs `140236434134`, `140236433829`, `140236434286`; `git rev-parse 62356aa^{tree} 1140197^{tree}` |
| E-032 | Os 8 testes pulados são, **por inferência**, os de conteúdo do PDF: `render-report-pdf.test.ts:49-50` define `describeWithPoppler = HAS_POPPLER ? describe : describe.skip`; os dois blocos (linhas 147 e 258) têm 4 + 4 `it`; `.github/workflows/ci.yml` não instala poppler; não há outro `skip` nos testes do app, das Functions nem de `tests/`. O log do Jest não lista os nomes pulados. O bloco é condicional desde a P1 (`9d60884`); a contagem pulada nos CI dos #87–#89 não foi conferida. Portanto o "CI verde" de E-016, E-019 e E-025 **não inclui** a extração de texto com `pdftotext` | `grep -rn "describe.skip" src app __tests__ tests functions/src`; `grep poppler .github/workflows/ci.yml` (vazio) |
| E-033 | O prazo de 30 s (`REPORT_PREPARATION_TIMEOUT_MS`, `useReportPdf.ts:61`) envolve só `loadPipeline()` (`:205`, import de `report-pdf-pipeline`) e a leitura `getReadingsForReport` (`:219`). `await pipeline.render(...)` (`:238`) fica fora do prazo, e é dentro de `render` que `loadPdfLibraries()` faz `import('jspdf')` e `import('jspdf-autotable')` (`report-pdf-pipeline.ts:27-28`; `render-report-pdf.ts:30-33`). **O import do jsPDF/AutoTable não está coberto pelo prazo**, ao contrário do que sugerem D-008 ("carregamento e leitura"), o comentário em `useReportPdf.ts:56-60` e a nota da TASK-25 | leitura dos arquivos citados |
| E-034 | Q-013 **confirmada por leitura**: `crashReporter.native.ts` chama `api.recordError(instance, toError(error), scope)`, e `toError` (`src/lib/toError.ts`) devolve o `Error` original sem redigir a mensagem; o contexto passa pelo sanitizador de `logError`, a mensagem não. Nada alterado | leitura dos arquivos citados |
| E-035 | No repositório: `firestore.rules:114` aceita `source in ['manual', 'photo', 'voice']`; `functions/src/index.ts:6` exporta `onUserDelete`; `vercel.json` não configura branch. **Nada no repositório nem no GitHub comprova** publicação dessas rules, implantação da Function em produção ou qual branch alimenta a Vercel de produção | leitura dos arquivos citados |

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

### Pendências abertas em 27/11/2026

| ID | Pendência | Referência |
|---|---|---|
| Q-015 | **(decisão)** Os 8 testes de conteúdo do PDF (`pdftotext`/`pdftoppm`) ficam pulados no CI porque o runner não tem poppler (E-032). Decidir se o CI passa a instalá-lo ou se o relatório declara que essa conferência só roda localmente. Até lá, "CI verde" não cobre o texto do PDF gerado | PDF-03, 05, 06, 09, 12; E-016, E-019, E-025 |
| Q-016 | **(autor)** A V1 de voz **não é reproduzível a partir de um commit do GitHub**: o APK registrado (`ddf7cb77…`) vem do commit local `66cc97c`, que **não existe** no repositório (`git cat-file` falha com o histórico completo; o GitHub responde "No commit found"); o APK recompilado após a correção de permissão não tem SHA-256 registrado; o ensaio no Chrome não registra o commit. Para o relatório: repetir o build a partir de um commit publicado (por exemplo, `1140197`) e registrar o hash, ou declarar o limite | E-027, E-028; [task-12](../task-12-voz-android.md#resultado-da-v1-no-samsung) |
| Q-017 | **(decisão)** O prazo de 30 s do PDF não cobre o import do jsPDF/AutoTable (E-033). Escolher entre corrigir o código (pôr o carregamento das bibliotecas dentro do prazo) e corrigir a documentação (D-008, TASK-25, `pdf-relatorio.md`). Nenhuma das duas foi feita | PDF-14, 22; D-008 |
| Q-018 | **(decisão)** Q-013 confirmada no código (E-034): o coletor nativo repassa `error.message` ao Crashlytics. A decisão de redigir continua pendente; Q-013 continua sendo a referência | Constituição §2; Q-013 |
| Q-019 | **(orientadora/autor)** Critério de privacidade da voz **sem decisão**: VOZ-13 (nenhum áudio persistido, inclusive em componentes de terceiros) e VOZ-15 (evidência de processamento local, sem armazenamento nem envio) exigem inspeção do serviço do SO e do navegador, que a V1 não fez (E-027 K, E-028). O registro da TASK-12 diz que, sem essa comprovação, o produto continua sem voz. Falta definir que evidência basta, ou aceitar o limite declarado | VOZ-13, VOZ-15; constituição §2 |
| Q-020 | **(autor)** **Desconhecido** qual branch alimenta a Vercel de produção: a configuração fica fora do repositório (E-035). Promover `staging` levaria os 186 commits de E-030 | D-003; [reavaliação](../reavaliacao-2026-11-26.md) §7 |
| Q-021 | **(autor)** Rules que aceitam `voice`/`photo` e a Function `onUserDelete` em produção **sem verificação** (E-014, E-035). Nenhum agente publica nem consulta produção | D-003 |

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
- 2026-11-27 — Claude Code (T1, consolidação documental) — evidências E-026 a E-035, pendências
  Q-015 a Q-021, notas datadas em `tasks.md` (TASK-12, 13, 25 e 26), `docs/pdf-relatorio.md` §12
  e nota na [reavaliação](../reavaliacao-2026-11-26.md) — base `origin/staging @ 1140197`;
  verificação por `git` (histórico completo), GitHub (PRs #92/#93, check-runs e logs do CI) e
  leitura de código — testes **não reexecutados** nesta sessão; ensaios de aparelho e navegador
  transcritos dos registros, não reproduzidos; nenhuma caixa marcada, nenhuma funcionalidade
  declarada concluída; horas e despesas não informadas; nada publicado.
