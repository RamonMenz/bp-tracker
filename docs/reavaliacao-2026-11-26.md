# Reavaliação da estratégia de execução — 26/11/2026

Registro da análise e do plano acordados em 26/11/2026 (quinta-feira), a 12 dias da
avaliação de 08/12 e 19 dias de 15/12. Base verificada: `staging` em `2afb60d` (merge do
[PR #85](https://github.com/RamonMenz/bp-tracker/pull/85)), árvore limpa. Decisões e
evidências em formato de registro corrido: [decisões e evidências](relatorio/decisoes-e-evidencias.md).

> **Nota de 27/11/2026 (o corpo abaixo não foi reescrito):** a diferença
> `origin/main..origin/staging` passou de 139 para **186** commits (`staging @ 1140197`,
> histórico completo; `main @ 3f8220f` continua ancestral). Onde este documento cita 139 (§2 e
> §7), vale o valor da data. O valor atual e as evidências posteriores (PDF Web, Sentry, V1 de voz)
> estão no [registro de decisões e evidências](relatorio/decisoes-e-evidencias.md), a partir de
> E-026 (contagem em E-030).

Este documento **não conclui nenhuma funcionalidade**. Ele registra prioridades, dependências
verificadas e o plano de entregas. Os critérios de aceite continuam sendo os das specs e da
[constituição](../constitution.md); estado de cada TASK continua em [tasks.md](../tasks.md).

## 1. Decisão operacional do autor

O autor decidiu priorizar **voz** e **PDF**, **pausando a investigação de fotografia**. Escopo
da pausa:

- **Pausado:** novas capturas, ajustes experimentais, novo código de fotografia e as rodadas
  físicas de TASK-07/09/18 relativas a fotografia.
- **Preservado, sem perda:** `native-modules/aferi-photo-capture`, `demos/android-capture`,
  `demos/web-capture`, `demos/photo-review`, `tools/task07` e `tools/task09`, os documentos
  `docs/task-07-*` e `docs/task-09-*`, os hashes dos APKs registrados, os cartões sintéticos
  (`tools/task09/cartoes-ocr.html`) e os checks de CI desses itens (continuam rodando, sem
  manutenção prevista).
- **Não significa:** fotografia concluída; substituição por registro manual; troca de motor
  (ML Kit/Tesseract.js permanecem); corte de escopo. A fotografia é irredutível no TAP (P117) e
  seu estado final depende da orientadora (seção 9).

## 2. Evidências verificadas em 26/11/2026

Verificação feita por leitura do repositório, do GitHub (somente leitura) e do ambiente da
sessão. Nada executado contra produção. **Os testes do app não foram reexecutados nesta
análise** (não há `node_modules` e nada foi instalado); a evidência automatizada é o CI do PR #85.

| Afirmação | Como foi verificada |
|---|---|
| `staging @ 2afb60d`, igual ao remoto; `main @ 3f8220f` (PR #60, 08/10) é ancestral de `staging`; todo o trabalho do ciclo está só em `staging` | `git rev-parse`, `git fetch`, `git rev-list --count origin/main..origin/staging` = 139 |
| CI do PR #85 verde: App (lint, typecheck, testes), Cloud Functions, Security Rules (emulador), Bridge OCR (Java) | GitHub `get_check_runs` do PR #85 |
| Nenhum PR aberto; #56–#85 mesclados | GitHub `list_pull_requests` |
| 8 branches `claude/*` têm commits fora de `staging` (4 delas patch-equivalentes a algo já incorporado); o commit extra de `docs/task-07-revisao-samsung` tem patch idêntico ao do PR #68 (`7f6125a`) | `git branch -r --no-merged`, `git cherry`, `git patch-id`, após `git fetch --unshallow` (o primeiro número, 26, veio de clone raso e foi retirado) |
| O consolidado da TASK-07 foi reconstruído: 15 fontes conferem com o manifesto; no PR #65, 12 arquivos idênticos e 3 adaptados | `docs/task-07-integracao-android.md:24-48` (conferido o texto, não os hashes) |
| **PDF: zero código.** `expo-print`, `jspdf`, `jspdf-autotable` ausentes; `expo-sharing` já existe | `package.json`; busca por "pdf" em `src/` e `app/` |
| `expo-print@57.0.2` existe (compatível com SDK 57); `jspdf@4.2.1` e `jspdf-autotable@5.0.9` (peer `jspdf ^2 \|\| ^3 \|\| ^4`) | `npm view` (somente leitura, registry) |
| A spec do PDF já escolhe e justifica as bibliotecas | `specs/spec-relatorio-pdf.md` §7.1 |
| O container da sessão tem `pdftotext`, `pdftoppm`, Java 21, Node 22; alcança npm, Maven Central e o JAR do emulador do Firestore; **não** alcança `dl.google.com` (Google Maven) | `which`, `java -version`, `curl -I` (somente leitura) |
| Tipos/schema/repositório/rules/porta de confirmação já aceitam `photo/voice`; **nenhuma rota de `app/` importa nada assistido**; o produto não autolinka `native-modules/` | `models.ts:15`, `reading.schema.ts:102`, `readings.repo.ts:77-79`, `firestore.rules:114`, `confirmed-assisted-reading.ts`; busca em `app/` |
| O modo `recognition` de `useVoiceReview` (com escritor) só é instanciado em testes; os clientes reais de voz usam `preview` | busca por `mode: '…'` em `src/` |
| `getAllReadings` não expõe ID nem metadados de cache/pendência e omite inválidos em silêncio; `Reading` não tem `id`; `computeDailyTrend` é só 7/30 dias com inteiros | `readings.repo.ts:125-160`, `models.ts`, `useReadingsTrend.ts` |
| `file.native.ts` grava o CSV em `documentDirectory` e `file.web.ts` revoga a URL de imediato; `useExportCsv` repassa `error.message` cru | leitura dos arquivos |
| O cliente `demos/android-voice` **não tem** o endurecimento aplicado ao de fotografia nos PRs #75/#76 (`allowBackup: false`, plugins `with-no-backup` e `with-disabled-network-inspector`); os checks de CI e o ferramental Windows cobrem só o cliente de fotografia | `demos/android-voice/app.json`, `demos/android-capture/plugins/`, `tools/task07/*` |
| O adaptador Web de voz integrado não tem ação para instalar o modelo local (só a PoC em `pocs/`) | busca por `.install(` em `src/`, `demos/`, `pocs/src` |
| O módulo nativo de voz nunca disparou `triggerModelDownload`; a API existe desde a API 33 (variante com listener na 34) | `LocalSpeech.kt`; [documentação Android](https://developer.android.com/reference/android/speech/SpeechRecognizer) |
| Nenhum commit em arquivos de voz desde 27/10 (`09eea48`) | `git log` nos caminhos de voz |
| Rules legadas exigiam `source == 'manual'` desde a primeira versão (28/07); as atuais aceitam `manual/photo/voice` e tornam `source` imutável no update | `git log -p -- firestore.rules` |
| Excluir a conta dispara `onUserDelete`, que apaga `users/{uid}` com `recursiveDelete` (readings incluídas) — **se a Function estiver implantada**; não verificado em produção | `src/features/auth/deleteAccount.ts`, `functions/src/triggers/onUserDelete.ts` |

## 3. Fotografia: o que foi encerrado e o que continua aberto

- **Encerrado:** a linha de correção ROI/orientação/escala (`roi-1`) para o cartão de sete
  segmentos, **nas condições observadas** (um Samsung SM-S731B, cartões CSS sintéticos, um par
  original/processado por cartão). Resultado negativo, formalizado em
  [docs/task-09-etapa-4-resultado-roi591.md](task-09-etapa-4-resultado-roi591.md) e
  [docs/task-09-etapa-6-viabilidade-roi591.md](task-09-etapa-6-viabilidade-roi591.md).
- **Aberto:** a causa de o ML Kit não emitir dígitos nesse estímulo; o LCD real (G-Tech BSPII),
  nunca reensaiado após o ROI591; o Tesseract.js nunca testado em sete segmentos; a Etapa 5
  (generalização) não executada; o segundo modelo de aparelho; a privacidade interna do SDK
  (telemetria e ID de instância não demonstradas nem refutadas); a comparação ML Kit ×
  Tesseract (TASK-20).
- **Dependência real de voz ou PDF em relação à fotografia:** nenhuma. O
  `CandidateReadingReview` compartilhado já está pronto, e o autolinking do cliente de voz já
  exclui o módulo de fotografia.
- **Condição objetiva para retomar** (qualquer uma):
  1. resposta da orientadora definindo o estado esperado da fotografia (seguir a orientação);
  2. no ponto de decisão proposto de 03/12, o PDF essencial e o esqueleto do relatório estarem
     prontos e os veredictos de voz registrados — nesse caso a **primeira ação** seria o
     Tesseract.js nos cartões sintéticos já existentes (a spec de fotografia §6.3 já exige
     comparar os dois motores; não é troca de motor), **somente com autorização expressa do
     autor**. Sem novas capturas ou ajustes por padrão.

## 4. Voz: percurso e estado

| Elo | Estado real | Falta |
|---|---|---|
| Falar → reconhecimento local (Android) | Kotlin **nunca compilado nem executado** | Build e aparelho do autor; endurecimento e ferramental Windows (V1) |
| Falar → reconhecimento local (Web) | Só chegou a `model-missing` no Chromium da nuvem | Teste no Chrome do autor; ação de instalar o modelo |
| Resultado final → interpretação pt-BR | Implementado e testado; demonstrado com texto sintético | — |
| Revisão e correção | Funciona em modo `preview`, em memória, nos clientes isolados | Montar no produto |
| Confirmação → salvar | Porta `confirmAndSave` testada com doubles; modo `recognition` só em testes | Elo nunca composto com o reconhecedor |
| Contexto de escrita | Sem `epoch` por login nem fonte para `persistenceEnabled`; `hasConsent` existe em `useConsentGate` | Hook de contexto e flag de build |
| Entrada no produto | Nenhuma | Botão "Registrar por voz" carregado sob demanda, sem deslocar o formulário manual |

Dependem da disponibilidade de reconhecedor local e pt-BR: Android
(`isOnDeviceRecognitionAvailable` e pacote pt-BR em `installedOnDeviceLanguages`) e Chrome
(`available()` e `processLocally`). Indisponibilidade é resultado a registrar como **limite**,
nunca motivo para fallback remoto. Só o autor pode: compilar e instalar no Windows, rodar no
Samsung, abrir o Chrome com microfone e configurar contas/ambientes. O restante é autônomo.

**Primeira entrega de voz utilizável:** voz Web atrás de flag, se o Chrome do autor oferecer o
pacote pt-BR local; senão, Android após o veredito do TASK-12 e do rebuild do Dev Client do
produto. Sem fallback remoto.

## 5. PDF: reaproveitável e lacunas

- **Reaproveitável:** padrão do `ExportCsvDialog`/`useExportCsv`, `parseReading`, formatadores
  de `datetime.ts`, `expo-sharing`.
- **Lacunas (spec §4):** nova leitura com ID e metadados de cache e contagem de omitidos,
  preservando o contrato do CSV; modelo puro de período em dias civis com fuso fixado; médias
  por registro; gráfico próprio (não reaproveitar `computeDailyTrend` como está); renderizadores
  por plataforma; entrega e limpeza de temporários próprias (não copiar o padrão do CSV).
- **Sem dependência** de fotografia, voz ou persistência assistida (spec §2).

## 6. Sequência de entregas

Responsáveis: **CC** = Claude Code; **CX** = Codex; **autor** = Ramon. Nenhuma programação é
transferida ao autor. Prompts de execução em [docs/prompts](prompts/).

### P1 — Relatório PDF essencial na Web (primeiro resultado verificável) — CC
Resultado: em Histórico (Web), "Gerar relatório PDF" → período → baixar PDF com cabeçalho,
cobertura, médias com N, tabela completa e fuso. Falta: modelo puro, nova leitura, renderizador
`jsPDF`+AutoTable sob demanda, diálogo. Testes: exemplo da spec (120/80/60, 130/90/—,
140/100/80 → **130,0/90,0 (N=3)** e pulso **70,0 (N=2)**); sem pulso; sessão uma vez; vazio;
bordas e horário de verão; omitidos sinalizados; HTML literal; várias páginas; `pdftotext` e
`pdftoppm`. Conclusão: exemplo exato extraído do PDF, CSV e legado verdes, lint e typecheck.
Limite: duas rodadas de correção por bloqueio; depois reportar. **Não é o PDF completo.**

### P2 — PDF completo na Web — CC (depende de P1)
Gráfico vetorial com datas reais, multipágina com cabeçalho repetido, A4/escala de cinza,
observações longas, pré-visualização, cancelamento sem concorrência. Conclusão: PDF-03, 04, 05,
06, 08, 09, 12 e 14 na Web com evidência automatizada, PDF-10 inspecionado.

### P3 — PDF no Android — CC escreve; autor valida no aparelho
`expo-print` com template HTML/CSS do **mesmo modelo**, armazenamento privado temporário,
limpeza sem apagar arquivo em leitura. Depende do rebuild do Dev Client do produto com
`expo-print`. O Chromium do container é só aproximação do motor do Android. Limite: duas rodadas
de correção; depois PDF Android declarado parcial. Trocar de biblioteca seria mudança de decisão
congelada (orientadora).

### P4 — Endurecimento e aceite do PDF — CC; revisão cruzada CX
Conta trocada invalida o resultado; sem rede de renderização; sem log clínico; CSV intacto;
PDF-11 a 22 que couberem sem aparelho; o restante registrado como pendente com o motivo.

### V1 — Veredito de capacidade de voz — CX + autor
- **V1a Web (autor, hoje, sem código):** rodar a PoC Web (`pocs/`, roteiro A3 de
  `docs/pocs-fotografia-voz.md`) no Chrome com microfone; devolver o registro simples.
- **V1b Android (TASK-12):** CX faz a revisão estática, a paridade de endurecimento do cliente de
  voz, o ferramental de build/identificação para Windows e a atualização das instruções; o autor
  compila, instala e roda a rodada A–D/E/F/G/H/L no Samsung.
- **Adaptador Web:** CX acrescenta a ação **explícita, iniciada pelo usuário**, de instalar o
  pacote pt-BR local (decisão registrada em D-004).
- Conclusão: cada plataforma com veredito registrado, positivo ou **limite explícito**.
  Alternativa se negativo nas duas: voz declarada "implementada, com capacidade verificada e
  indisponível nos ambientes testados, manual preservado" (P116 e spec de voz §6), decisão de
  escopo com a orientadora, **sem fallback remoto**.

### V2 — Voz Web no produto, atrás de flag — CX (depende de V1a)
Botão "Registrar por voz" (sob demanda, só com capacidade verificada **e** flag ligada); hook de
`AssistedWriteContext`; montagem do modo `recognition`; fluxo até uma leitura `source: 'voice'`
confirmada. Testes com `@firebase/rules-unit-testing`: confirmar escreve uma vez; cancelar,
falhar ou não confirmar não escreve nem enfileira; troca de conta descarta; transcrição e
confiança não vão ao documento; voz e manual não pedem permissão sem ação (VOZ-01).
Reconhecedor simulado fica **rotulado como simulado**. Conclusão: testes verdes e uma leitura de
voz **real** confirmada pelo autor (ver seção 7).

### V3 — Voz Android no produto — CX (depende do veredito V1b positivo)
Mesmo fluxo, mais autolinking de `aferi-local-voice` no produto; exige rebuild do Dev Client.

### R — Relatório e demonstração — CC, em paralelo a partir do ponto de decisão
Esqueleto do relatório técnico a partir das evidências já existentes (método, arquitetura,
decisões, resultados, limites, delimitação legado × ciclo) e roteiro de demonstração só com o que
estiver validado. Horas e despesas reais continuam "não informado" até o autor fornecê-las.

## 7. Homologação e ambiente de produção

**Informação do autor (26/11/2026):** a configuração de produção na Vercel/Firebase exigiria ser
refeita para criar um ambiente de homologação; por isso a homologação será feita **no ambiente de
produção**, sendo o aplicativo de uso exclusivo do autor. Isso substitui a premissa anterior de um
Firebase de homologação separado (`docs/guia-validacao-e-staging.md` §5).

Esta decisão é do autor e foi aceita. Os riscos e as salvaguardas propostas, registrados em D-003:

1. **Backend de produção, frontend local.** Rodar o app da branch em teste localmente
   (`.env.local` com as variáveis já existentes, Web por `npm run web`, Android por Dev Client
   apontando para o Metro local) **sem promover nada na Vercel**. Qualquer atualização da Vercel
   de produção a partir de `staging` (ou de `main` após merge) levaria junto os 139 commits de
   diferença entre as duas branches, não só a funcionalidade em teste. Qual branch alimenta a
   produção na Vercel não foi verificado (configuração do projeto, fora do repositório).
2. **Conta de teste própria.** Usar uma segunda conta Google, com UID diferente, para a
   homologação de voz: as leituras ficam em `users/{uid-de-teste}`, isoladas pelas rules, sem
   tocar no histórico real do autor. A exclusão da conta apaga seus dados se a Function
   `onUserDelete` estiver implantada (não verificado). O PDF pode ser validado também com dados
   reais do autor (leitura apenas), sem escrita.
3. **Flag desligada por padrão.** O ponto de entrada de voz só aparece com flag de build ligada;
   o build normal e a Vercel de produção continuam sem ele.
4. **Publicação das rules em produção é operação explícita do autor.** Não há registro de que as
   rules com `photo/voice` (PR #62) tenham sido publicadas. Elas são compatíveis com documentos
   legados: as rules originais já exigiam `source == 'manual'`; o CI executa a suíte no emulador
   (cerca de 51 casos por contagem de `it(` com `grep`, verde no #85). **Não verificado contra os
   dados reais de produção.** Reverter é
   possível pelo histórico de versões de rules do Firebase. Nenhum agente publica rules ou toca
   produção sem autorização expressa, caso a caso.
5. **Registro honesto no relatório:** a homologação foi feita no ambiente de produção, com conta
   de teste, sem ambiente isolado — limitação declarada, não omitida.

## 8. Distribuição entre agentes

| Branch | Dono | Arquivos principais |
|---|---|---|
| `feat/pdf-relatorio` | Claude Code | `src/features/report/**`, `src/lib/report/**`, diálogo, `app/(app)/history.tsx`, `package.json` e lock (dependências de PDF) |
| `feat/voz-capacidade` | Codex | `demos/android-voice/**`, `tools/task12/**`, `native-modules/aferi-local-voice/**`, `web-voice.web.ts`, `demos/web-voice/**` |
| `feat/voz-produto` (depois dos veredictos) | Codex | `app/(app)/index.tsx`, hook de contexto, autolinking do produto |
| `docs/relatorio-*` | Claude Code | `docs/relatorio/**` |

Regras: um dono por alteração; **ninguém refaz** a investigação de fotografia; `package.json` e
lock só na branch do PDF; `app/(app)/history.tsx` só no PDF; `app/(app)/index.tsx` só na voz;
`tasks.md` só no PR de consolidação nos pontos de decisão (cada branch registra em `docs/*.md`
próprio). Revisão cruzada só onde rende: Codex revisa o PDF quanto a guardrails (log clínico,
recurso remoto, temporários); Claude Code revisa a voz no produto quanto a confirmação,
cancelamento e troca de conta. Ambientes: esta sessão alcança npm, Maven Central e o emulador do
Firestore mas não o Google Maven, então não compila Android; o ambiente do Codex não é presumido.
Nenhum agente faz push, abre PR ou faz merge sem autorização do autor.

## 9. Decisões que dependem da orientadora (não tomadas aqui)

1. **Estado final da fotografia** contra P117/P106 (carta da Etapa 6 em
   `task-09-etapa-6-viabilidade-roi591.md:83-94`; sem registro de envio ou resposta).
2. Priorizar voz sem a fotografia completa **inverte a precedência descrita em P116**.
3. Marco de 24/11 vencido e P02 (nenhuma prorrogação presumida).
4. P01 (semântica de `source`) antes de habilitar fora da homologação.
5. Data de corte do legado: o PR #1 é de 28/07/2026 (uma semana antes da Fase 1), e os PRs #4–#60
   caem entre 13/08 e 08/10, dentro do período de Fase 1 e 2 (premissa P105).
6. **Comparação mínima aceitável** para o relatório (P106 admite "análise comparativa dos
   limites"): a comparação continua devida (P117); a de voz com Whisper.cpp exige corpus de áudio
   e não está dimensionada.
7. Coleta de voz de terceiros (P048/P107).

## 10. Marcos × estado (26/11/2026)

| Marco do TAP | Estado |
|---|---|
| 27/10 — duas modalidades integradas, casos coletados | Não atendido: módulos isolados e fora do produto; sem corpus |
| 10/11 — comparação concluída | Não atendida: nenhuma comparação executada |
| 24/11 — PDF operante e referencial/método/desenvolvimento redigidos | **Não atendido**: zero código de PDF; nenhuma seção redigida |
| 08/12 — avaliação 03 (60%) | 12 dias corridos |
| 15/12 — ajustes e encerramento | 19 dias corridos |

Os marcos vencidos devem ser declarados no relatório sem retrodatação. Não se presume
prorrogação nem autorização para cortar entregas.

**Estimativas:** as horas de `tasks.md` (TASK-23 a 26: 3+3+3+2 = 11 h) são do plano original, não
medidas, e o projeto não tem histórico para calibrar trabalho de software puro. Este plano não
estima horas; ordena por dependências. **Pontos de decisão propostos** (sujeitos à
disponibilidade do autor): 26/11 (V1a pelo autor; P1 e V1 começam); segunda 30/11 (P1 entregue;
vereditos V1a/V1b); quinta 03/12 (estado de P2, P3 e V2; composição da demonstração; retomar ou
manter a pausa da fotografia).

**Perguntas em aberto ao autor:** disponibilidade diária/semanal até 08/12; se existe Dev Client do
produto instalável no Samsung (cota da EAS ou build local); se a carta da Etapa 6 foi enviada e se
houve resposta; o que a avaliação de 08/12 exige que seja demonstrado ao vivo; se outras contas
(além do autor) têm dados no Firebase de produção.

## 11. Riscos e limites

- **Capacidade do reconhecedor local** (Android/Chrome) é incerta e fora do controle do código;
  resolve-se com V1.
- **`expo-print` no Android** (fontes, SVG, paginação) só se confirma no aparelho.
- **Rebuild do Dev Client do produto** é pré-requisito de P3 e V3.
- **Produção como homologação** (seção 7).
- Limite de investigação: duas rodadas de correção por bloqueio; na terceira, parar e reportar.

## 12. Correções ao diagnóstico anterior

Incorporadas a partir da conferência independente: oito (não 26) branches `claude/*` com commits
fora de `staging`; patch do commit extra de `docs/task-07-revisao-samsung` idêntico ao do #68;
"nada ligado ao produto" delimitado (preparação de tipos/schema/repositório/rules/porta já está no
produto, mas nenhuma rota habilita captura assistida); integração do consolidado da TASK-07
conferida (15 arquivos; 12 idênticos, 3 adaptados no #65); Expo Print e jsPDF/AutoTable já
justificados na spec §7.1 (faltam implementação, versões instaladas e delta de bundle). O número
de commits (349, não 204) e a contagem de branches vieram de clone raso e foram refeitos com o
histórico completo.

## 13. Guardrails preservados

Capturas de imagem/áudio só em memória; sem log clínico; sem fallback remoto; nenhuma escrita ou
fila offline antes da confirmação explícita; cancelamento e descarte tardio; isolamento entre
contas; caminho manual e legado intactos; PDF com política própria de geração, compartilhamento
e limpeza (spec do PDF §3.5), distinta das mídias proibidas da captura. Nenhuma funcionalidade é
declarada concluída sem a evidência exigida pelas specs.
