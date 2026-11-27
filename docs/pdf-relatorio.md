# Relatório PDF — Web (etapas P1, P2 e P4)

**Branches:** P1 em `feat/pdf-relatorio` (PR #87) e P2 em `feat/pdf-relatorio-p2` (PR #88), ambas mescladas em `staging`; P4 (endurecimento e aceite sem aparelho) em `feat/pdf-relatorio-p4`, a partir de `origin/staging` em `d22a2e9`.
**Spec:** [`specs/spec-relatorio-pdf.md`](../specs/spec-relatorio-pdf.md) (§2, §3, §4, §5, §7).
**Estado:** P1 e P2 implementadas; P4 converteu em evidência objetiva o que é verificável sem aparelho (seção 9). **O relatório PDF não está completo:** faltam o Android (`expo-print`, P3) e toda validação em aparelho, fluxo logado, navegador móvel, impressão física e leitor de tela. **Nenhum critério está validado em aparelho ou fluxo logado.**

As seções 1 a 7 registram a P1 e a seção 8 registra a P2, ambas mantidas como histórico. A P4 está na seção 9, e a matriz atual na seção 10.

## 1. O que a P1 entrega

Na Web, em Histórico, o botão **“Gerar relatório PDF”** abre um diálogo de período (Últimos 7 dias, Últimos 30 dias, Tudo, Personalizado). Ao confirmar, o app faz uma leitura única dos registros do próprio usuário, monta o modelo puro e gera o PDF com jsPDF + AutoTable carregados sob demanda. O navegador recebe o arquivo como download. O documento tem:

- cabeçalho: título, período solicitado, data/hora da geração e fuso IANA;
- cobertura: número de registros, dias com registro, primeiro e último registro incluídos e a declaração de cobertura (confirmada ou não), seguida dos avisos;
- médias de sistólica, diastólica e pulso, cada uma com o N;
- tabela completa em ordem cronológica com a coluna “Sessão e observação”;
- notas metodológicas, com o aviso de que o documento não substitui avaliação médica;
- rodapé com “Página X de Y” em todas as páginas.

Ficaram fora: gráfico, pré-visualização, Android/`expo-print`, voz, fotografia e qualquer mudança de modelo, schema, rules, índices ou CSV.

## 2. Arquivos

| Camada | Arquivo | Papel |
|---|---|---|
| Puro (`src/lib/report/`) | `report-period.ts` | Período em dias civis no fuso fixado. O início do primeiro dia é inclusivo e o início do dia seguinte ao último é exclusivo, limitado ao instante de preparação. Bloqueia data final anterior à inicial, dias futuros e datas inexistentes. |
| | `report-format.ts` | `dd/mm/aaaa`, `HH:mm` no fuso informado, uma casa decimal com vírgula e saneamento para WinAnsi. |
| | `report-model.ts` | Médias por registro, pulso ausente fora do denominador, sessão contada uma vez, ordenação por `measuredAt` + id, cobertura, avisos, linhas e nome do arquivo. |
| Repositório | `src/features/readings/readings.repo.ts` | Nova `getReadingsForReport`, que devolve id, `hasPendingWrites`, `fromCache` e `omittedCount`. A `ReadingsQueryError` traz o motivo tipado. **`getAllReadings` não mudou.** |
| Feature (`src/features/report/`) | `render-report-pdf.ts` | Desenho jsPDF/AutoTable. `loadPdfLibraries` faz o `import()` dinâmico. |
| | `report-pdf-pipeline.ts` | Chunk assíncrono: período, modelo e renderização. |
| | `report-pdf-platform.web.ts` / `.native.ts` / `.types.ts` | Adaptador por extensão de arquivo. A Web baixa por Blob; o nativo declara indisponibilidade. |
| | `useReportPdf.ts` | Orquestração: fuso e instante fixados, token por geração, trava de concorrência, cancelamento, descarte quando o uid muda e mensagens pt-BR. |
| UI | `src/components/bp/ExportPdfDialog.tsx` | Diálogo no padrão do `ExportCsvDialog`. |
| Rota | `app/(app)/history.tsx` | Botão e diálogo, só quando `isAvailable`. |
| Build | `metro.config.js` | Resolve `canvg`, `html2canvas` e `dompurify` como módulo vazio quando importados pelo jsPDF. |

## 3. Decisões

1. **Dias civis, não 24 h.** “Últimos 7 dias” é hoje mais os 6 dias civis anteriores, no fuso do aparelho lido uma vez no início da operação (`Intl…resolvedOptions().timeZone`, com `UTC` explícito como reserva). O CSV continua subtraindo 7 × 24 h; isso não foi alterado (spec §4).
2. **luxon** para o fuso: já estava em `dependencies`, então não é uma dependência nova. É o que resolve meia-noite inexistente (São Paulo, 04/11/2018) e o dia de 25 h (Nova York, 03/11/2024). Entra só no chunk assíncrono do relatório, não no `entry`.
3. **Fim exclusivo na consulta.** A nova função usa `>= início` e `< fim` em `measuredAt`, coberto pelo índice de campo único que já existe. O fim de “hoje” é `preparedAt + 1 ms`, para que o instante da preparação seja inclusivo. O modelo reaplica o predicado das bordas de forma determinística.
4. **Sem `error.message` cru.** O repositório lança `ReadingsQueryError(reason)` e o hook escolhe a mensagem pelo motivo. Exceções do renderizador e do download nunca vão ao logger: só `new Error('report-…-failed')` com `{ uid }`.
5. **Fonte:** a Helvetica padrão do jsPDF, Type 1 em WinAnsiEncoding e não embutida (`pdffonts`). Ela cobre todos os acentos do pt-BR e `— “ ” ‘ ’ … • €`, o que foi confirmado com `pdftotext` no Jest e no Chromium. Caracteres fora do CP1252, como emoji, setas e CJK, são trocados por `?` antes do desenho, e o documento declara quantos foram trocados. Embutir uma TTF custaria dezenas a centenas de KB por pouco ganho no conteúdo do app, que é numérico e em português.
6. **Layout:** A4 retrato, margens de 15 mm. Título 16 pt, seções 13 pt, texto 11 pt, tabela 10 pt e rodapé 9 pt (paginação, não texto explicativo). Grade com bordas slate-500 e cabeçalho slate-200 com texto quase preto, legível em escala de cinza. `showHead: 'everyPage'` repete o cabeçalho e `rowPageBreak: 'avoid'` mantém cada registro inteiro numa página com os detalhes; a observação tem no máximo 280 caracteres.
7. **Download:** `Blob('application/pdf')` com URL de objeto e `<a download>`. A revogação fica num `setTimeout` de 60 s, porque o `click()` só agenda o download e não há evento de conclusão. Mesmo se o clique falhar, a URL é liberada.
8. **Diálogo:** fica aberto durante a geração, para que erros como período vazio apareçam nele e o usuário possa trocar o intervalo. O botão Cancelar nunca é bloqueado. O atalho inicial é “Últimos 30 dias”; o CSV segue em “Tudo”. A interface dos atalhos foi **duplicada** do `ExportCsvDialog` em vez de extraída, para não refatorar o CSV nesta etapa.
9. **Plataforma por extensão** (`.web.ts` / `.native.ts`), sem `Platform.OS`. O pipeline só é alcançável pelo adaptador Web. O export Android local não contém jsPDF; ver §5.
10. **`TextDecoder` do Expo (winter):** o preset do Jest instala o polyfill do Expo, que aceita só UTF-8, e o `fast-png` (dependência do jsPDF) chama `new TextDecoder('latin1')` ao carregar. No teste de renderização, o `TextDecoder` do Node é restaurado. Navegadores têm latin1 nativo, como mostrou a verificação no Chromium. **Risco registrado:** jsPDF não deve ser levado ao runtime nativo; a spec já prevê `expo-print` no Android.

## 4. Versões instaladas

| Pacote | Versão | Licença | Observação |
|---|---|---|---|
| `jspdf` | 4.2.1 (fixa) | MIT | Dependências: `fflate` 0.8.3, `fast-png` 6.4.0 e `@babel/runtime`. |
| `jspdf-autotable` | 5.0.9 (fixa) | MIT | peer `jspdf ^2 \|\| ^3 \|\| ^4`. |
| opcionais do jsPDF | `canvg` 3.0.11, `html2canvas` 1.4.1, `dompurify` 3.5.0, `core-js` 3.51.0 | — | Instalados pelo npm como `optionalDependencies`, mas **fora do bundle Web** (§5). |
| `luxon` | 3.7.2 | MIT | Já existia em `dependencies`. |

## 5. Bundle Web (`npx expo export -p web`, antes e depois)

Valores fictícios de `EXPO_PUBLIC_*` foram passados só no ambiente do comando, sem `.env.local` e sem contato com o Firebase.

| Arquivo | Antes (bytes / gzip -9) | Depois (bytes / gzip -9) | Carregamento |
|---|---|---|---|
| `entry-*.js` | 5.580.859 / 1.263.714 | 5.592.960 / 1.266.850 | inicial |
| `report-pdf-pipeline-*.js` | — | 85.150 / 27.208 | sob demanda |
| `jspdf.es-*.js` | — | 453.919 / 142.310 | sob demanda |
| `jspdf.plugin-*.js` (AutoTable) | — | 32.002 / 10.079 | sob demanda |
| `empty-module-*.js` | — | 39 / 108 | sob demanda |

- **Delta do bundle inicial:** +12.101 B (+3.136 B gzip), referentes a diálogo, hook, adaptador e repositório.
- **Delta distribuído total:** +583.211 B (+182.841 B gzip), sendo 571.110 B (179.705 B gzip) em chunks que só baixam ao gerar.
- **Sem `canvg`/`html2canvas`/`dompurify`:** antes do ajuste em `metro.config.js`, o export trazia `html2canvas` (202 KB), `purify` (33 KB) e `index` (canvg, 174 KB) como chunks. Depois do ajuste, nenhum deles aparece. O `entry` não contém jsPDF nem luxon, só a referência assíncrona ao pipeline.
- **Android:** `npx expo export -p android` (local) gera um `.hbc` sem nenhuma ocorrência de `jsPDF`/`jspdf`/`autoTable`; só o adaptador nativo. O delta do pacote Android não foi medido.

## 6. Verificação no navegador (Chromium local, Playwright)

O roteiro usado ficou fora do repositório, no scratchpad da sessão. Ele serviu o `dist` exportado em `127.0.0.1`, com `timezoneId: America/Sao_Paulo` e **toda a rede externa abortada**, e chamou o adaptador Web (`__r(<id>)`) com 3 registros sintéticos. Resultados:

- Antes da ação, nenhum chunk de PDF foi requisitado. Depois dela, só `report-pdf-pipeline`, `jspdf.es` e `jspdf.plugin`, todos locais.
- O PDF tem `type application/pdf` e o download sugeriu `aferi-relatorio-2026-11-20_a_2026-11-22.pdf`. A URL de objeto **não** foi revogada de forma síncrona nem 1,5 s depois.
- O `pdftotext` do arquivo baixado mostra médias 130,0/90,0 (N = 3), pulso 70,0 (N = 2), acentos corretos e a observação `<img src="https://…">` como texto literal.
- O único host externo tentado foi `www.google.com`, no **boot do app** (App Check/reCAPTCHA, legado). Foi abortado e aconteceu antes e independentemente da geração.

Limite desta verificação: o app não passou pelo login, porque não há conta real nem emulador neste roteiro. O clique no botão do Histórico e o diálogo foram cobertos por testes de componente, não por navegação real.

## 7. Volume medido (Jest, ambiente node, CPU de servidor)

| Registros | Modelo | Renderização | Páginas | Tamanho |
|---|---|---|---|---|
| 400 | — | ~0,6 s | 15 | — |
| 1.095 (1 ano × 3/dia) | 63 ms | 0,8 s | 36 | 116 KB |
| 3.000 | 121 ms | 1,3 s | 96 | 313 KB |
| 10.000 | 337 ms | 5,0 s | 317 | 1,0 MB |

A renderização roda **na thread principal**, sem worker. Não há limite de volume nem timeout configurados; nenhum registro é truncado. Em celular, os tempos devem ser maiores e não foram medidos.

## 8. Etapa P2 — gráfico, revisão antes de salvar, cobertura e volume

### 8.1 O que mudou

- **Gráfico de tendência** (`src/lib/report/report-chart.ts`, puro, e `render-report-pdf.ts`). Entra depois das médias e antes da tabela, na ordem da spec §3.3.2:
  - um ponto por dia com dado: média por registro dos valores principais daquele dia, com precisão completa, sem reaproveitar valores arredondados;
  - dia sem dado não tem ponto, zero nem interpolação; as linhas só ligam dias **consecutivos**, então as lacunas aparecem como interrupção;
  - com um único dia, só marcadores e a frase “Há medições em apenas um dia: o gráfico mostra os pontos desse dia, sem linha de tendência.”;
  - eixo X com datas reais (uma faixa por dia, cobrindo o período inteiro, inclusive dias sem dado nas bordas); eixo Y em mmHg com escala numérica única para todos os painéis;
  - períodos acima de 92 dias viram painéis temporais contíguos (no máximo 12, cada um com pelo menos 92 dias), com a mesma escala e a mesma legenda, sem omitir pontos;
  - séries distintas por cor **e** por traço/marcador: sistólica com linha contínua e círculo cheio (blue-700); diastólica com linha tracejada e quadrado vazado (amber-700). A distinção sobrevive à impressão em cinza;
  - nova nota metodológica: “cada ponto é a média diária… dias sem medição não têm ponto (não equivalem a pressão zero)”.
  - `computeDailyTrend`, o gráfico legado do Histórico, **não** foi alterado.
- **Revisão antes de salvar** (`useReportPdf`, `ExportPdfDialog`, `ReportReviewPanel`, `PdfPreviewFrame`). O fluxo passou a ser preparar → revisar → salvar. A revisão mostra:
  - período, cobertura, médias com N e o aviso de que a cópia salva fica fora do controle do Aferi;
  - a pré-visualização local (Blob + URL de objeto em `<iframe>`, sem impressão e sem upload);
  - as ações **Salvar PDF**, **Alterar período** (volta à escolha anterior, preservada) e **Cancelar**.

  O arquivo só sai por “Salvar PDF”, e o PDF salvo é exatamente o pré-visualizado. A URL da prévia é liberada ao salvar, cancelar, alterar o período, trocar de conta ou desmontar, sempre com atraso de 60 s e uma única vez.
- **Prévia só onde o navegador mostra PDF:** sem visualizador embutido (`navigator.pdfViewerEnabled` falso, como no Chromium headless), um `<iframe>` com PDF **dispara download automático**. A verificação no Chromium mostrou isso: um arquivo com nome UUID foi baixado antes de “Salvar PDF”. Nesses navegadores a prévia não é embutida: o resumo continua e o usuário é orientado a salvar.
- **PDF-19, aviso antes de exportar:** com cache, omissão de documentos ou escrita pendente, a revisão abre com um bloco “Cobertura não confirmada” (`role="alert"`), a declaração e a lista de avisos. O botão vira “Salvar recorte parcial em PDF” e aparece **Tentar novamente**, que faz nova leitura com o mesmo período. O documento nunca declara histórico completo nesses casos.
- **PDF-22, volume e prazo:**
  - `MAX_REPORT_READINGS = 3000`: acima disso o relatório não é gerado nem truncado. A mensagem é “O período tem N medições e o relatório comporta até 3.000. Escolha um período menor.”
  - `REPORT_PREPARATION_TIMEOUT_MS = 30 s` para as etapas **assíncronas** (carregar o módulo do PDF e ler o Firestore). Ao estourar, o resultado tardio é descartado e aparece uma mensagem pedindo conexão ou período menor.
  - A renderização é síncrona e não pode ser interrompida; quem a limita é o teto de volume.
  - *Nota de 27/11/2026:* até esta data o prazo **não** cobria o `import()` de jsPDF/AutoTable (~486 KB), feito dentro de `pipeline.render` depois da leitura. Com esse chunk travado, o diálogo ficava em “Preparando o relatório…” até o usuário cancelar (E-033, Q-017). Corrigido na branch `fix/pdf-prazo-jspdf`: `render` também passa pelo mesmo prazo único de 30 s, contado do início da preparação. Assim, “módulo do PDF” acima inclui o jsPDF/AutoTable. O desenho síncrono continua sem interrupção. Teste: “prazo no import do jsPDF/AutoTable” em `useReportPdf.test.ts`.
- **Observações longas:** o texto de detalhe é quebrado com as métricas da fonte e fatiado em blocos de até 12 linhas (`src/lib/report/report-table.ts`). Cada bloco é uma linha da tabela que nunca é cortada entre páginas (`rowPageBreak: 'avoid'`). Os blocos seguintes levam “(continuação)” no topo e o anterior termina com “(continua)”. A continuação repete data e hora do registro, mas não os valores, para não contá-lo duas vezes na leitura.

### 8.2 Worker: avaliado e não adotado

O Metro do Expo SDK 57 reconhece `new Worker(new URL('./x', import.meta.url))` (API `unstable_createWorker`). Montei um experimento com tempo limitado, renderizando no worker, e exportei a Web: o serializador passou a gerar um chunk `__common` de **567 KB** (jsPDF/AutoTable compartilhados entre o pipeline e o worker), carregado por `<script defer>` no `index.html`, ou seja, **em toda abertura do app**.

Isso quebra o PDF-01 e o ganho de bundle da P1, e contornar exigiria configurar o serializador do Metro numa API *unstable*. O experimento foi revertido sem commit.

**Decisão:** renderização na thread principal, com o limite de 3.000 registros. A geração sai do Histórico com o diálogo em “Preparando o relatório…”, e o carregamento assíncrono dos chunks já cede a vez à interface antes do desenho.

### 8.3 Volume medido com gráfico (Jest, ambiente node, CPU de servidor)

| Registros | Modelo | Renderização | Páginas | Tamanho | Painéis |
|---|---|---|---|---|---|
| 400 | 33 ms | 0,30 s | 14 | 70 KB | 2 |
| 1.095 | 76 ms | 0,59 s | 37 | 185 KB | 4 |
| 3.000 (limite) | 136 ms | 1,48 s | 99 | 500 KB | 11 |

Em celular, os tempos devem ser maiores e **não foram medidos**.

### 8.4 Bundle Web da P2 (`npx expo export -p web --clear`, base `origin/staging` `987562c` × P2)

| Arquivo | Base (bytes / gzip -9) | P2 (bytes / gzip -9) | Delta | Carregamento |
|---|---|---|---|---|
| `entry-*.js` | 5.593.284 / 1.266.922 | 5.599.340 / 1.268.489 | +6.056 / +1.567 | inicial |
| `report-pdf-pipeline-*.js` | 85.150 / 27.208 | 91.544 / 29.529 | +6.394 / +2.321 | sob demanda |
| `jspdf.es-*.js` | 453.919 / 142.310 | 453.919 / 142.319 | 0 / +9 | sob demanda |
| `jspdf.plugin-*.js` | 32.002 / 10.079 | 32.002 / 10.079 | 0 | sob demanda |

- **Delta total da P2:** +12.450 B (+3.897 B gzip), sendo +1,5 KB gzip no bundle inicial (diálogo, painel de revisão e prévia).
- Nenhuma dependência nova; `metro.config.js` não foi alterado na P2.
- `canvg`, `html2canvas` e `dompurify` continuam fora do bundle.
- O `index.html` carrega só o `entry`.

### 8.5 Verificação no Chromium (local, rede externa abortada)

Com o `dist` da P2 e dados sintéticos, chamando o adaptador Web diretamente (sem login):
- os chunks do PDF só são requisitados depois da ação;
- a prévia é uma URL `blob:` legível (5.213 bytes), e nada foi revogado antes de `release()`;
- o download sai com o nome `aferi-relatorio-2026-11-20_a_2026-11-22.pdf`, e o `pdftotext` do arquivo traz a seção do gráfico (legenda, mmHg, datas);
- `navigator.pdfViewerEnabled` é `false` no headless, então a prévia não é embutida.

O único host externo tentado continua sendo `www.google.com`, no boot do app (App Check, legado), abortado.

**Não verificado:** a prévia embutida renderizando num navegador com visualizador de PDF. O headless não tem visualizador e não há navegador com interface nesta sessão.

## 9. Etapa P4 — endurecimento e aceite sem aparelho

Sem funcionalidade nova. Cada item virou teste automatizado ou verificação reproduzível. Os **dois defeitos encontrados foram corrigidos** com teste que falhava antes da correção.

### 9.1 PDF-18: troca de conta em cada fase (`useReportPdf.test.ts`)

- **Cobertura dos testes:** trocam o uid durante o carregamento do módulo, a leitura do Firestore, a geração do PDF e a revisão, e cobrem também sair da conta.
- **Revogação real:** a prévia usa o `openPdfPreview` real do adaptador Web, com `URL.createObjectURL`/`revokeObjectURL` substituídos por dublês, então a revogação é conferida de fato.
- **Resultados verificados:**
  - nenhuma consulta, prévia ou entrega tardia da conta anterior;
  - a URL da prévia é revogada após o atraso;
  - “salvar” é recusado;
  - a nova conta começa do zero e consulta com o próprio uid.
- **Defeito corrigido:** em A → B → A, a revisão antiga de A **reaparecia** ao voltar, com a URL já revogada, porque o estado era só escondido. O estado agora é reiniciado no render quando o uid muda.
- **Isolamento no emulador:** outra conta e um contexto sem autenticação recebem `permission` (§9.3).

### 9.2 PDF-14/22: repetição, ciclos, limite e prazo (`useReportPdf.test.ts`)

- **Concorrência:** cinco toques seguidos fazem uma leitura e geram uma prévia. Se o usuário cancelar e preparar de novo, a resposta tardia da primeira leitura é descartada.
- **Salvar duas vezes** entrega o arquivo uma vez só.
- **Ciclos sem vazamento:** preparar, alterar, cancelar, tentar de novo, salvar e cancelar revogam **todas** as 5 URLs criadas. Depois de cancelar, não sobra PDF para um “salvar” tardio. Uma mutação removendo a liberação em “cancelar” faz o teste falhar.
- **Limite:** 3.000 registros geram o relatório; 3.001 são recusados sem renderizar; um período menor volta a funcionar.
- **Prazo:** no carregamento do módulo, aos 29.999 ms a preparação ainda está em andamento e aos 30.000 ms termina com a mensagem e um log genérico; uma nova tentativa funciona em seguida.
- **Isolamento entre testes:** o `beforeEach` passou de `clearAllMocks` para `resetAllMocks`. Uma implementação de `deliver` que lança erro, definida num teste anterior, vazava para os seguintes.

### 9.3 PDF-20: retrato congelado no emulador do Firestore (`tests/report-readings.rules.test.ts`)

**Executado localmente** com `npm run test:rules` (Java 21, emulador do `firebase-tools` travado no lock), duas vezes seguidas: 86 testes, sendo 79 da suíte de rules e 7 novos. Está ligado ao job “Security Rules” do CI, porque o padrão do `jest.rules.config.js` é `tests/**/*.test.ts`. A função `getReadingsForReport` **real** lê com o contexto autenticado; um segundo contexto da mesma conta faz o papel de outro aparelho.
- **Bordas** em `Timestamp` real (São Paulo): 30/09 23:59:59.999 e 24/10 00:00 ficam de fora; 01/10 00:00 e 23/10 23:59:59.999 entram. Ordem por `measuredAt`.
- **Documento inválido** é omitido e contado (`omittedCount = 1`), e a cobertura deixa de ser confirmada.
- **Escrita depois da leitura** (atualizar, apagar, criar): o retrato e o modelo já entregues não mudam (comparação byte a byte do JSON); a nova geração incorpora as três alterações.
- **Escrita concorrente com a leitura:** cada documento vem inteiro (versão antiga ou nova, nunca meio-termo); médias, N e tabela são calculados só sobre o retrato entregue; a geração seguinte vê as escritas.
- **Isolamento:** Bob e um contexto sem autenticação recebem `ReadingsQueryError('permission')`; Bob lê só o que é dele.
- **Projeto próprio no emulador:** a suíte usa o projeto `demo-aferi-pdf20`. Na primeira tentativa, as duas suítes rodaram em paralelo no mesmo projeto e o `clearFirestore` de uma apagou dados da outra, derrubando também um teste antigo.
- **Rede da CLI:** durante o `test:rules`, o `firebase-tools` tentou acessar `firebase-public.firebaseio.com`, uma consulta da própria CLI. O proxy da sessão recusou. Nenhum teste depende disso.

### 9.4 PDF-11/13: rede e logs

**Teste automatizado** (`src/features/report/report-privacy.test.ts`, ambiente node). Percorre o caminho real hook → repositório → modelo → jsPDF:
- O logger real roda em modo produção (`__DEV__ = false`), com um coletor espião no lugar do Sentry, e o console é espionado.
- As sentinelas ficam na observação, nos valores (263/197), no nome e e-mail da conta, na mensagem de erro do SDK e na exceção do renderizador.
- Cenários: caminho feliz com documento inválido, erro do SDK, erro do renderizador, falha no download e prazo estourado.
- Garantias verificadas:
  - nenhuma sentinela chega ao coletor nem ao console (mensagem e pilha incluídas);
  - toda mensagem registrada pertence a uma lista fixa, e o contexto só tem `uid`/`docId`;
  - `fetch`, `http`, `https`, `XMLHttpRequest` e `WebSocket` não são usados;
  - o PDF entregue não tem `/Author`, e-mail nem uid.
- Uma mutação que loga a exceção crua do renderizador faz o teste falhar.

**Chromium local** (`node tools/pdf-relatorio/browser-check.cjs <dist>`, rede externa abortada, export da P4):

| Fase | Requisições locais | Hosts externos tentados (bloqueados) |
|---|---|---|
| Abertura do app | 3 (HTML, `entry`, recursos); **nenhum** chunk do relatório | `www.google.com/recaptcha/enterprise.js`: script do **App Check** (reCAPTCHA Enterprise), carregado no boot do app, **não vem do relatório** |
| Geração do relatório | só `report-pdf-pipeline`, `jspdf.es`, `jspdf.plugin` (e o `blob:` local da prévia) | **nenhum** |

**Risco residual fora do escopo, sugerido como tarefa separada.** O Sentry da Web usa a integração padrão de breadcrumbs (`dom: true`), e o SDK instalado grava o `aria-label` do elemento clicado. No fluxo do relatório, os elementos clicáveis não têm valores clínicos nos rótulos. As linhas do **Histórico legado**, porém, têm rótulos como “128 por 82”, e esses breadcrumbs seguem com qualquer erro reportado depois. A correção fica em `crashReporter.web.ts`, não no relatório.

### 9.5 PDF-17: temporários

**Web (Chromium local, mesmo script):** a geração não altera nada no armazenamento do navegador. IndexedDB, Cache Storage, OPFS, localStorage, sessionStorage e service workers são comparados antes e depois. As três bases IndexedDB do Firebase já existiam desde a abertura do app.

URLs de objeto, com o relógio da página controlado:

| Momento | Criadas | Revogadas |
|---|---|---|
| Logo após salvar | 2 (prévia e download) | 0 |
| Depois de adiantar 61 s | 2 | 2 |

Não há arquivo temporário em disco gerado pelo app: o PDF vive num `Blob` em memória até a revogação. O arquivo baixado fica onde o navegador e o usuário decidirem, fora do controle do Aferi.

**Android: pendente para a P3.** A spec §3.5.3–3.5.4 pede:
- gerar em cache privado;
- compartilhar por URI com permissão de leitura;
- limpar após o uso sem apagar o arquivo antes de o consumidor terminar;
- rotina para resíduos de interrupção;
- não copiar para `documentDirectory`.

Nada disso existe nem foi testado.

### 9.6 PDF-01 e regressão do legado

- **Guarda estática:** `src/features/report/report-lazy-loading.test.ts` falha se qualquer módulo de `app/` ou `src/` importar `jspdf`/`jspdf-autotable` de forma estática; se o `import()` desses pacotes sair do renderizador; se o pipeline for alcançado por outro caminho que não o `import()` do adaptador Web; ou se o adaptador nativo os referenciar. Um `import { jsPDF } from 'jspdf'` no Histórico faz o teste falhar.
- **Runtime:** o `browser-check` confirma que nenhum chunk do relatório é requisitado na abertura do app.
- **Suítes do legado:** CSV, diálogo e hook do CSV, Histórico, formulário manual (`index`, `useReadingForm`, `useAddReading`), repositório, `useReadings`, `useReadingsTrend` e `ReadingRow`. São 12 suítes e 129 testes, todos verdes, e a suíte completa também passa.
- **Tempo de abertura** (`node tools/pdf-relatorio/open-timing.cjs`). Condições:
  - Chromium headless (Playwright 1.63) numa VM com 4 vCPUs, rede externa bloqueada e servidor local;
  - 20 execuções por build, alternadas A/B depois de um aquecimento;
  - builds comparados: export de `d28b005` (antes da P1) e da P4.

  O Histórico exige login, então a medida é a abertura do app até a tela de entrada, com o mesmo `entry` que carrega o Histórico.

| Rodada | Build | Mediana até “Entrar com Google” | p90 | FCP mediana | DOMContentLoaded mediana | Heap JS |
|---|---|---|---|---|---|---|
| 1 (antes = A) | antes da P1 | 897 ms | 956 ms | 416 ms | 244 ms | 23 MB |
| 1 | P4 | 939 ms | 980 ms | 448 ms | 257 ms | 23 MB |
| 2 (P4 = A) | P4 | 901 ms | 954 ms | 420 ms | 246 ms | 23 MB |
| 2 | antes da P1 | 905 ms | 948 ms | 420 ms | 238 ms | 23 MB |

A diferença da rodada 1 se inverte na rodada 2, quando a ordem é trocada. É efeito de posição e ruído (amplitude de cerca de 450 a 1.000 ms em ambos), não degradação atribuível ao relatório. O `entry` cresceu 18,2 KB brutos (+4,7 KB gzip) desde antes da P1. Celular e Histórico logado **não foram medidos**.

### 9.7 PDF-21: acessibilidade da interface

**Chromium local** (`node tools/pdf-relatorio/a11y-check.cjs <dist>`). Monta o `ExportPdfDialog` **real** do bundle exportado numa raiz React própria, localizando os módulos do diálogo, do React e do `react-dom/client` no `entry`. Dados sintéticos.
- **Papéis e nomes:** o `radiogroup` contém 4 `radio` com nome; os botões têm nome; o aviso de cobertura tem `role="alert"`; o diálogo é `aria-modal`.
- **Defeito corrigido:** os rádios **não tinham `aria-checked` na Web**, porque o react-native-web 0.21 ignora `accessibilityState`. O leitor de tela não sabia qual período estava marcado. O diálogo do PDF passou a declarar `aria-checked`; o script falhava antes da correção (`null`) e agora a árvore acessível mostra `[checked]`.
- **Foco:** depois da animação de abertura (cerca de 250 ms), o foco entra no primeiro rádio. Tab e Shift+Tab circulam 7 rádios/botões sem sair do modal, e focar o fundo devolve o foco ao modal.
- **Teclado:**
  - Enter marca o rádio e aciona os botões; Espaço aciona os botões; Esc fecha (`onCancel`).
  - Durante a preparação, “Preparar relatório” fica `aria-disabled="true"` e “Cancelar” continua ativo.
  - **Limitação:** Espaço **não** marca rádio, e as setas não navegam no grupo, porque o `PressResponder` do RNW só trata Espaço em `button`/`menuitem`. O mesmo vale para o diálogo do CSV e o seletor de tema, que também não têm `aria-checked`; ambos foram sugeridos como tarefa separada.
- **Alvos:** todos os rádios e botões têm pelo menos 48 × 48 px (rádios 189 × 48; botões até 686 × 48).
- **Zoom de 200 %** (janela de 640 px com `zoom: 2`, ou seja, 320 px CSS): seleção (8 textos) e revisão (17 textos) sem sobreposição, sem texto cortado e sem rolagem horizontal da página. A revisão rola dentro do cartão.
- **Testing-library:** papéis, rótulos, estados, aviso e ações (`ExportPdfDialog.test.tsx`, `PdfPreviewFrame.web.test.tsx`).
- **Não verificado:**
  - leitor de tela real (NVDA, VoiceOver, TalkBack);
  - contraste medido nos estados;
  - modo escuro;
  - PDF marcado (o PDF tem texto selecionável mas `Tagged: no`).

**Não há declaração de conformidade WCAG AA.**

## 10. Matriz de critérios PDF-01..22 (após a P4)

“Automatizado” = teste automatizado (Jest, emulador do Firestore) ou verificação local reproduzível (inspeção do PDF com poppler, Chromium headless com rede externa bloqueada, export Web). **Nenhum critério está validado em aparelho ou fluxo logado.**

| ID | Automatizado | Validado em aparelho/fluxo logado | Pendente (motivo) |
|---|---|---|---|
| PDF-01 | Sim: guarda estática de imports; `browser-check` sem chunk do relatório na abertura; abertura do app igual antes/depois (§9.6); 129 testes do legado verdes. | Não | Medir o Histórico logado (exige conta) e no celular; Android fora do escopo (P3). |
| PDF-02 | Sim: `report-period.test.ts` (dias civis, horário de verão, bloqueios); bordas em `Timestamp` real no emulador (§9.3). | Não | Conferir no navegador do usuário, com o fuso real do aparelho. |
| PDF-03 | Sim: modelo e PDF (`pdftotext`) com cabeçalho, cobertura, médias, gráfico e tabela do mesmo retrato. | Não | Aceite com dados reais em fluxo logado; Android (P3). |
| PDF-04 | Sim: exemplo da spec no modelo e no PDF. | Não | Aceite em fluxo logado. |
| PDF-05 | Sim: “—” e “Não informado”. | Não | Aceite em fluxo logado. |
| PDF-06 | Sim: sessão conta uma vez nas médias e no gráfico. | Não | Aceite em fluxo logado com sessões reais. |
| PDF-07 | Sim: vazio sem PDF; vazio não confirmado; omissão declarada (inclusive no emulador). | Não | Aceite em fluxo logado. |
| PDF-08 | Sim: `report-chart.test.ts` e PNG em cores e cinza. | Não | Impressão física; Android (P3). |
| PDF-09 | Sim: 400 registros contados por página; continuidade de observação longa. | Não | Impressão física. |
| PDF-10 | Parcial: PNG em cores e cinza; A4 por `pdfinfo`. | Não | **Impressão física** A4/cinza e leitores externos: exige impressora e leitura humana. |
| PDF-11 | Sim: `report-privacy.test.ts` (nenhuma API de rede usada pelo relatório); `browser-check` (geração sem host externo; abertura só com o App Check, alheio ao relatório). | Não | Inspeção em **fluxo logado** com o Firestore real, separando as consultas autorizadas: exige conta. |
| PDF-12 | Sim: HTML, URL e especiais literais; sem `/URI`, `/JS` ou `/Launch`. | Não | Aceite em fluxo logado. |
| PDF-13 | Sim: logger real em modo produção com coletor espião e sentinelas; mutação detectada. | Não | Inspeção do **Sentry real** (DSN de produção); risco residual de breadcrumbs do legado (§9.4), sugerido como tarefa. |
| PDF-14 | Sim: toques repetidos, cancelar e gerar de novo, salvar duas vezes, ciclos sem vazamento de URL. | Não | Aceite em fluxo logado. |
| PDF-15 | Sim (Web): download com nome e MIME conferidos; nada sai antes de “Salvar PDF”; prévia não embutida sem visualizador. | Não | **Android (P3)**; abrir o arquivo em leitor externo, de forma manual. |
| PDF-16 | Parcial (Web): falha no download vira mensagem e mantém a revisão. | Não | **Compartilhamento Android (P3).** |
| PDF-17 | Sim (Web): armazenamento inalterado; 2 de 2 URLs revogadas só após o atraso. | Não | **Temporários Android (P3):** cache privado, limpeza e resíduos. |
| PDF-18 | Sim: troca de uid em cada fase, A → B → A corrigido; isolamento entre contas no emulador. | Não | Troca real de conta em fluxo logado. |
| PDF-19 | Sim: aviso antes de salvar, nova tentativa e recorte parcial; `role="alert"` no Chromium. | Não | Cache offline **real** do Firestore num navegador logado. |
| PDF-20 | Sim: **emulador do Firestore** (retrato congelado, escrita concorrente, nova geração); antes era só com dublês. | Não | Firestore de produção em fluxo logado. |
| PDF-21 | Parcial: Chromium (papéis, `aria-checked` corrigido, foco preso no modal, Enter e Esc, `aria-disabled`, alvos de 48 px, zoom 200 %) e testing-library. | Não | **Leitor de tela real**; contraste e modo escuro; Espaço e setas nos rádios (limitação do RNW, tarefa sugerida); PDF não marcado. Não é AA completo. |
| PDF-22 | Sim: limite 3.000/3.001, prazo de 30 s com recuperação, volume medido no node. | Não | **Celular/navegador móvel** (tempo e memória); renderização na thread principal (worker rejeitado, §8.2). |

## 11. Limites conhecidos

- **Só Web.** O Android (P3) não tem botão; o adaptador nativo é inerte e `expo-print` não está instalado.
- **Nada validado em aparelho, fluxo logado, navegador móvel, impressão física ou leitor de tela.**
- **Prévia embutida não observada** num navegador com visualizador de PDF; só o caminho sem visualizador foi exercitado.
- **Rádios na Web:** Espaço não marca e as setas não navegam (react-native-web 0.21). O diálogo do CSV e o seletor de tema também não têm `aria-checked`, mas isso é legado e está fora do escopo.
- **Breadcrumbs do Sentry** podem levar `aria-label` com valores clínicos do Histórico legado (§9.4).
- **Fonte padrão não embutida;** caracteres fora do CP1252 viram “?” (declarado). O PDF não é marcado.
- **Thread principal:** o limite de 3.000 registros controla o tempo; o prazo de 30 s não interrompe a renderização síncrona.
- **Medições de abertura** feitas na casca do app, sem o Histórico logado, em VM de servidor.
- **Cobertura “confirmada”** = leitura do servidor, nenhum documento omitido e nenhuma escrita pendente. Não é auditoria além do que o Firestore informa.

## 12. Registro para o relatório final

> **Atualização posterior (26/11/2026, sem alterar o texto abaixo, que é o registro da P4 no momento
> em que foi escrito):** a P4 foi mesclada em `staging` pelo PR #89 (CI verde nos quatro jobs). O
> risco residual dos breadcrumbs do Sentry (§9.4, §11 e "Achados registrados") foi **corrigido
> fora do PDF** pelo PR #91; ver [sentry-privacidade.md](sentry-privacidade.md). Continua sem
> verificação a chegada ao Sentry real e a mensagem de exceção no coletor nativo (Crashlytics).
> Estado consolidado do PDF, tarefas e pendências:
> [registro de decisões e evidências](relatorio/decisoes-e-evidencias.md).

> **Atualização de 27/11/2026 (consolidação documental; a nota acima fica como está):** duas
> linhas abaixo foram corrigidas no próprio texto porque descreviam um estado já superado, e a
> redação original ficou registrada ao lado: "sem push" (a P4 foi enviada e mesclada pelo PR #89,
> `a80250f`) e `git switch feat/pdf-relatorio-p4` (a branch já foi mesclada; para reproduzir, usar
> `staging`, que nesta nota está em `1140197`). Fatos novos, sem mudança de código: no CI, os 8
> testes de `render-report-pdf.test.ts` que conferem o texto com `pdftotext` ficam **pulados**,
> porque o runner não tem poppler, e só rodam localmente (Q-015). O prazo de 30 s cobre o
> carregamento do pipeline e a leitura, mas **não** o import do jsPDF/AutoTable, que ocorre na
> renderização (Q-017). Ver E-032 e E-033 no
> [registro](relatorio/decisoes-e-evidencias.md).

**Fatos**
- **P1 e P2:** mescladas em `staging` (PRs #87 e #88), com CI verde.
- **P4:** 8 commits em `feat/pdf-relatorio-p4`, a partir de `d22a2e9`, mesclados em `staging` pelo PR #89 (`a80250f`). *Corrigido em 27/11/2026; a redação original dizia "sem push", estado anterior ao PR.*
- **Testes:** `npm test` passa com 976 testes em 84 suítes (eram 953 em 82): 23 novos e 2 suítes novas (`report-privacy`, `report-lazy-loading`).
- **Rules:** `npm run test:rules` passa com 86 testes em 2 suítes (79 + 7 novos no emulador), executado localmente duas vezes.
- **Lint e typecheck** sem erros.
- **Verificações locais:** `browser-check` (rede, temporários, URLs, carregamento sob demanda), `a11y-check` (interface) e `open-timing` (abertura), todas no export Web da P4, com dados sintéticos e rede externa bloqueada.
- **Bundle:** o `entry` cresceu 91 B em relação à P2. Sem dependência nova e sem mudança em `metro.config.js`, rules, schema, índices ou CSV.

**Defeitos encontrados e corrigidos**
- A → B → A reexibia a revisão da conta A com a URL revogada. Agora o estado é reiniciado no render.
- Os rádios do diálogo do PDF não expunham `aria-checked` na Web. Corrigido.
- Implementações de mocks vazavam entre testes do hook (`resetAllMocks`).
- As duas suítes de rules se apagavam em paralelo no emulador. Corrigido com um projeto `demo-` próprio.

**Achados registrados, sem correção (fora do escopo)**
- Breadcrumbs de clique do Sentry gravam `aria-label` do Histórico legado com valores clínicos.
- Espaço e setas não operam rádios no react-native-web 0.21; `aria-checked` falta no diálogo do CSV e no seletor de tema.
- A abertura do app tenta carregar o reCAPTCHA Enterprise do App Check.
- O `firebase-tools` tenta `firebase-public.firebaseio.com` durante o `test:rules`.

**Pendências e motivo**
- **Android (P3):** geração, compartilhamento e temporários.
- **Aparelho e fluxo logado:** exigem conta e dispositivo.
- **Impressão física:** exige impressora.
- **Leitor de tela real:** exige NVDA, VoiceOver ou TalkBack e operação humana.
- **Sentry real:** exige DSN de produção.
- **Navegador móvel:** tempo e memória não medidos.

**Comandos de reprodução** (corrigido em 27/11/2026; o original fazia `git switch feat/pdf-relatorio-p4`, branch já mesclada pelo #89)
```bash
git fetch origin staging
git switch --detach origin/staging
npm ci
npm run lint && npm run typecheck && npm test
```
Emulador do Firestore (exige Java 21+; baixa o emulador na primeira execução):
```bash
npm run test:rules
```
PDF real conferido com poppler:
```bash
AFERI_PDF_EVIDENCE_DIR=/tmp/aferi-pdf npx jest src/features/report/render-report-pdf
```
Export Web, com valores fictícios para as variáveis `EXPO_PUBLIC_*` de `.env.example` só no ambiente do comando:
```bash
npx expo export -p web --clear --output-dir /tmp/aferi-dist
```
Verificações em Chromium (exigem Playwright e Chromium no ambiente; não são dependências do projeto):
```bash
node tools/pdf-relatorio/browser-check.cjs /tmp/aferi-dist /tmp/aferi-browser-check
```
```bash
node tools/pdf-relatorio/a11y-check.cjs /tmp/aferi-dist /tmp/aferi-a11y
```
Tempo de abertura, comparando com um export anterior (por exemplo, de `d28b005`):
```bash
node tools/pdf-relatorio/open-timing.cjs /tmp/aferi-dist-antes antes /tmp/aferi-dist depois 20
```
