# Relatório PDF — Web (etapas P1 e P2)

**Branches:** P1 em `feat/pdf-relatorio` (mesclada em `staging` pelo PR #87); P2 em `feat/pdf-relatorio-p2`, a partir de `origin/staging` em `987562c`.
**Spec:** [`specs/spec-relatorio-pdf.md`](../specs/spec-relatorio-pdf.md) (§2, §3, §4, §5, §7).
**Estado:** P1 e P2 implementadas e verificadas localmente, com testes automatizados e inspeção do PDF gerado. **O relatório PDF não está completo:** faltam o Android (`expo-print`) e a validação em fluxo logado, navegador móvel, impressão física e leitor de tela. O Android não foi validado.

As seções 1 a 7 registram a P1 e foram mantidas como histórico; onde a P2 mudou algo, a seção 8 diz o quê.

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

## 9. Matriz de critérios PDF-01..22 (após a P2)

**Legenda.** “Coberto (automatizado)” = há teste automatizado (Jest) **ou** inspeção do PDF gerado (`pdftotext`, `pdftoppm`, `pdfinfo`, `pdffonts`) ou do bundle/Chromium local. **Nenhum critério foi validado em aparelho nem em fluxo logado** (coluna “Aparelho/logado”).

| ID | Estado | Aparelho/logado | Evidência / motivo |
|---|---|---|---|
| PDF-01 | **Coberto (automatizado)** | Não | `import()` dinâmico; `entry` sem jsPDF; Chromium: nenhum chunk de PDF antes da ação (§6, §8.5); worker rejeitado por carregar jsPDF na abertura (§8.2). |
| PDF-02 | **Coberto (automatizado)** | Não | `report-period.test.ts` (dias civis, bordas, horário de verão, bloqueios); diálogo e hook bloqueiam antes da consulta. |
| PDF-03 | **Coberto (automatizado)** | Não | Cabeçalho, cobertura, três médias, gráfico e tabela do mesmo retrato; ordem médias → gráfico → tabela → notas conferida no `pdftotext`. |
| PDF-04 | **Coberto (automatizado)** | Não | 130,0/90,0 (N = 3) e 70,0 bpm (N = 2), também com dois registros no mesmo dia; modelo e `pdftotext`. |
| PDF-05 | **Coberto (automatizado)** | Não | “—” na tabela; “Não informado” com N = 0. |
| PDF-06 | **Coberto (automatizado)** | Não | Sessão conta uma vez nas médias e no gráfico (ponto diário por registro); detalhes sem reconstrução. |
| PDF-07 | **Coberto (automatizado)** | Não | Vazio sem PDF; vazio não confirmado com mensagem própria; omissão declarada; nova tentativa. |
| PDF-08 | **Coberto (automatizado)** | Não | `report-chart.test.ts` (lacuna sem ponto/linha, pontos isolados sem linha, um dia sem linha + explicação, escala única, painéis sem perda de ponto, datas reais) e PNG em cores e cinza da página do gráfico (7 dias, um dia, extenso). |
| PDF-09 | **Coberto (automatizado)** | Não | 400 registros com as linhas contadas por página; observação de 60 linhas com “(continua)/(continuação)”, as 60 linhas presentes e em ordem; PNG inspecionado. |
| PDF-10 | **Parcial** | Não | PNG em cores e em cinza legíveis (séries distintas por traço/marcador); A4 por `pdfinfo`. Falta impressão física. |
| PDF-11 | **Parcial** | Não | Chromium com rede externa abortada: só chunks locais; PDF sem `/URI`, `/JS` ou `/Launch`. Falta inspeção em fluxo logado com Firestore real. |
| PDF-12 | **Coberto (automatizado)** | Não | HTML, URL, aspas e caracteres especiais literais; emoji vira “?” declarado. |
| PDF-13 | **Coberto (automatizado)** | Não | Sentinelas em exceção do renderizador, SDK e documento inválido não chegam ao `logError`; prazo estourado loga só um `Error` genérico. Falta o coletor real (Sentry). |
| PDF-14 | **Coberto (automatizado)** | Não | Sem preparações concorrentes; cancelar descarta o resultado e libera a prévia; nenhuma escrita. |
| PDF-15 | **Parcial** | Não | Web: só “Salvar PDF” entrega (nome e MIME conferidos no Chromium); prévia não embutida sem visualizador, evitando download automático. **Android pendente.** |
| PDF-16 | **Parcial** | Não | Falha no download vira mensagem e a revisão é mantida; URLs revogadas só após 60 s. Compartilhamento Android pendente. |
| PDF-17 | **Parcial** | Não | Web: nada persistido pelo app; URL da prévia liberada ao salvar, cancelar, alterar o período, trocar de conta e desmontar (testes). Temporários Android pendentes. |
| PDF-18 | **Coberto (automatizado)** | Não | Troca de uid durante a renderização (descarte) e durante a revisão (prévia liberada, resumo oculto, salvar recusado); mutação confirma os testes. |
| PDF-19 | **Coberto (automatizado)** | Não | Cache, omissão e pendência abrem a revisão com aviso **antes** de salvar, “Tentar novamente” (nova leitura) e “Salvar recorte parcial”; o PDF também declara. Não validado com cache real do Firestore. |
| PDF-20 | **Coberto (automatizado, com dublês)** | Não | Uma leitura por preparação; o PDF salvo é o mesmo Blob pré-visualizado; “Tentar novamente” faz nova leitura. Sem teste de alteração concorrente no Firestore real. |
| PDF-21 | **Parcial** | Não | Diálogo e revisão com papéis, rótulos e aviso `role="alert"`; alvos de 48 dp; link da prévia com 48 px. PDF não marcado (não é PDF/UA). Leitor de tela e teclado manuais pendentes. |
| PDF-22 | **Parcial** | Não | Limite explícito de 3.000 sem truncar e prazo de 30 s para as etapas assíncronas (testes); volume medido no node. Renderização na thread principal (worker avaliado e rejeitado, §8.2); navegador móvel não medido. |

## 10. Limites conhecidos

- **Só Web.** O Android não tem botão; o adaptador nativo é inerte. `expo-print` não foi instalado.
- **Nada validado em fluxo logado, aparelho, navegador móvel, impressão física ou leitor de tela.**
- **Prévia embutida não observada** num navegador com visualizador de PDF; só o caminho “sem visualizador” foi exercitado no Chromium.
- **Fonte padrão não embutida.** Caracteres fora do CP1252 viram “?” (declarado). O PDF não é marcado.
- **Thread principal.** O limite de 3.000 registros controla o tempo de renderização; o prazo de 30 s não interrompe a renderização síncrona.
- **Cobertura “confirmada”** = leitura do servidor, nenhum documento omitido e nenhuma escrita pendente na revisão. Não é auditoria além do que o Firestore informa.
- **Painéis:** no máximo 12, cada um com pelo menos 92 dias. Em períodos muito longos, os marcadores ficam densos, mas nenhum ponto é omitido.
- **Continuação** usa a métrica de 10 pt da coluna de detalhes; uma linha nunca é cortada entre páginas, e a separação acontece entre blocos.
- **Diálogo duplicado** em relação ao `ExportCsvDialog`; extrair um seletor compartilhado exigiria refatorar o CSV.

## 11. Registro para o relatório final

**Fatos**
- **P1:** 8 commits em `feat/pdf-relatorio`, mesclada em `staging` pelo PR #87, com CI verde (908 testes aprovados e 4 pulados no runner, sem poppler).
- **P2:** 7 commits em `feat/pdf-relatorio-p2`, sem push.
  - Testes: 952 em 82 suítes, todos verdes. São 40 novos em relação a `staging`, com 3 suítes novas (`report-chart`, `report-table`, `PdfPreviewFrame.web`).
  - Lint e typecheck sem erros.
- **Bundle da P2:** +3,9 KB gzip no total, sendo +1,5 KB gzip no inicial. Nenhuma dependência nova; `metro.config.js` intacto.
- **Verificação do PDF:** com dados sintéticos, por `pdftotext`, `pdftoppm` (página do gráfico em cores e em cinza), `pdfinfo` e `pdffonts`, e no Chromium headless com rede externa abortada.
- **Achado do Chromium:** um `<iframe>` com PDF, sem visualizador embutido, baixa o arquivo sozinho. Foi corrigido condicionando a prévia a `navigator.pdfViewerEnabled`.

**Decisões**
- Pontos do gráfico: média diária por registro, sem arredondar; linhas só entre dias consecutivos; escala única; painéis de pelo menos 92 dias, no máximo 12.
- Distinção das séries por cor, traço e marcador.
- Fluxo preparar → revisar → salvar, sem entrega antes da ação explícita; PDF salvo idêntico ao pré-visualizado.
- Cobertura não confirmada avisada antes de exportar, com nova tentativa e rótulo de recorte parcial.
- `MAX_REPORT_READINGS = 3000` sem truncamento; prazo de 30 s para as etapas assíncronas.
- Worker rejeitado: o Metro passa a carregar jsPDF em toda abertura (chunk `__common` de 567 KB).
- Observações longas fatiadas em blocos de 12 linhas com marcas de continuidade.

**Limitações**
- Android/`expo-print` pendente.
- Sem validação em fluxo logado, aparelho, navegador móvel, impressão física ou leitor de tela.
- Prévia embutida não observada em navegador com visualizador.
- PDF não marcado.
- Renderização na thread principal.

**Comandos de reprodução**
```bash
git switch feat/pdf-relatorio-p2
npm ci
npm run lint && npm run typecheck && npm test
AFERI_PDF_EVIDENCE_DIR=/tmp/aferi-pdf npx jest src/features/report/render-report-pdf
pdftotext -layout /tmp/aferi-pdf/grafico-7-dias.pdf -
pdftoppm -png -r 90 -f 1 -l 1 /tmp/aferi-pdf/grafico-7-dias.pdf /tmp/aferi-pdf/grafico
pdftoppm -gray -png -r 90 -f 1 -l 1 /tmp/aferi-pdf/grafico-7-dias.pdf /tmp/aferi-pdf/grafico-cinza
pdftotext -layout /tmp/aferi-pdf/observacao-longa.pdf - | grep -E "continua|continuação"
```
Para medir o bundle, defina valores fictícios para as variáveis `EXPO_PUBLIC_*` listadas em `.env.example` apenas no ambiente do comando e rode:
```bash
npx expo export -p web --clear --output-dir /tmp/aferi-dist
```
