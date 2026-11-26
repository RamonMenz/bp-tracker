# Relatório PDF — etapa P1 (Web)

**Branch:** `feat/pdf-relatorio`, a partir de `origin/staging` em `d28b005`.
**Spec:** [`specs/spec-relatorio-pdf.md`](../specs/spec-relatorio-pdf.md) (§2, §3, §4, §5, §7).
**Estado:** P1 implementada e verificada localmente. **O relatório PDF não está completo:** faltam gráfico, pré-visualização, Android, validação em navegador móvel e inspeção manual de impressão. O Android não foi validado.

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

## 8. Matriz de critérios PDF-01..22

| ID | Estado | Evidência / motivo |
|---|---|---|
| PDF-01 | **Coberto (Web)** | `import()` dinâmico; nenhum chunk de PDF no carregamento (Chromium, §6); `entry` sem jsPDF (§5); testes legados do Histórico e do CSV verdes. |
| PDF-02 | **Coberto** | `report-period.test.ts`: atalhos em dias civis, bordas inclusiva e exclusiva, horário de verão em São Paulo e Nova York, bloqueio de inversão, de dia futuro e de data inexistente; diálogo e hook bloqueiam antes da consulta. |
| PDF-03 | **Parcial** | Cabeçalho, cobertura, três médias e tabela completa do mesmo retrato (`render-report-pdf.test.ts`). **Gráfico pendente** (fora do escopo P1). |
| PDF-04 | **Coberto** | 130,0/90,0 mmHg (N = 3) e 70,0 bpm (N = 2), também com dois registros no mesmo dia; conferido no modelo e no `pdftotext`. |
| PDF-05 | **Coberto** | “—” na tabela; “Não informado” com N = 0; pulso `null` fora do denominador. |
| PDF-06 | **Coberto** | Sessão conta uma vez; detalhe “Média de sessão (2 leituras): 1ª …; 2ª …, pulso —”; documentos antigos sem `sessionReadings` não ganham detalhe reconstruído. |
| PDF-07 | **Coberto** | Período vazio mostra “Nenhuma medição no período selecionado.” e não gera PDF; vazio não confirmado (cache ou omissão) ganha mensagem própria; documento inválido omitido e declarado; falha de leitura mostra mensagem e permite nova tentativa. |
| PDF-08 | **Pendente** | Gráfico fora do escopo P1. |
| PDF-09 | **Coberto** | 400 registros em 15 páginas: as 400 linhas contadas via `pdftotext` por página, cabeçalho repetido e “Página X de Y”; observação longa na mesma linha do registro; primeira e última página inspecionadas em PNG. |
| PDF-10 | **Parcial** | PNG em escala de cinza (`pdftoppm -gray`) legível; A4 conferido por `pdfinfo`. Falta impressão física e checagem em leitores externos. |
| PDF-11 | **Parcial** | Chromium com rede externa abortada: a geração só requisitou chunks locais. Sem recurso remoto no template (nenhum `/URI`, `/JS` ou `/Launch` no PDF). Falta inspeção com Firestore real autenticado. |
| PDF-12 | **Coberto** | HTML, URL, aspas, `\`, `( )`, `%`, `&` e acentos aparecem literais; emoji vira “?” declarado; nenhuma ação ou link no PDF. |
| PDF-13 | **Coberto (unitário)** | Testes com sentinelas: exceção do renderizador, erro de SDK e documento inválido não chegam ao `logError`; o contexto leva só `uid`/`docId`. Falta inspeção do coletor real (Sentry). |
| PDF-14 | **Coberto** | Trava de concorrência, botão desabilitado durante a geração, cancelamento descarta o resultado; nenhuma escrita (mocks de `add`/`update`/`delete` nunca chamados). |
| PDF-15 | **Parcial** | Web: download com `application/pdf` e nome correto, conferido no Chromium. **Android pendente.** |
| PDF-16 | **Parcial** | Falha no download mostra mensagem amigável e não declara envio. A URL só é revogada após 60 s. Compartilhamento nativo pendente. |
| PDF-17 | **Parcial** | Web: nada é persistido pelo app (Blob em memória, URL revogada). Temporários Android pendentes. |
| PDF-18 | **Coberto (Web)** | `useReportPdf.test.ts`: troca de uid durante a renderização descarta o resultado (sem download) e o estado da conta anterior não aparece; teste de mutação confirma que o teste falha sem o descarte. |
| PDF-19 | **Parcial** | `fromCache`, pendências e omissões declaradas no documento e na mensagem de vazio (testes de modelo, hook e `pdftotext`). Falta avisar **antes** de exportar (spec §3.2.7): hoje o PDF com dados de cache é gerado com aviso interno, sem pedir conexão. |
| PDF-20 | **Coberto por desenho** | Uma única leitura (`getDocs`) congela o retrato usado por cobertura, médias e tabela; cada nova geração faz nova leitura. Não há teste com alteração concorrente no Firestore real. |
| PDF-21 | **Parcial** | Diálogo com `radiogroup`/`radio`, rótulos, alvos de 48 dp, escala de fonte preservada e Cancelar sempre ativo (testes de componente). PDF com texto selecionável, mas **não marcado** (`Tagged: no`): não é PDF/UA. Teste manual com leitor de tela e teclado pendente. |
| PDF-22 | **Parcial** | Volume medido (§7), sem truncamento. Pendentes: worker, limites e timeout definidos e medição em navegador móvel. |

## 9. Limites conhecidos

- **Sem gráfico e sem pré-visualização.** O resumo prévio (spec §3.4.1) e os botões “Alterar período / Salvar ou compartilhar” não existem; o PDF é baixado direto após “Gerar PDF”.
- **Só Web.** O Android não tem botão; o adaptador nativo é inerte.
- **Fonte padrão não embutida.** Caracteres fora do CP1252 viram “?” (declarado). O PDF não é marcado (sem estrutura de acessibilidade).
- **Thread principal.** Relatórios muito grandes podem travar a aba por segundos.
- **Cobertura “confirmada”** significa leitura do servidor (`fromCache = false`) e nenhum documento omitido. Não é auditoria de completude além do que o Firestore informa.
- **Cache:** com o servidor inacessível, o `getDocs` da Web pode responder do cache. O relatório é gerado e declarado “não confirmado”; não há opção de “pedir conexão e tentar de novo” antes de exportar.
- **Diálogo duplicado** em relação ao `ExportCsvDialog`; extrair um seletor compartilhado exigiria refatorar o CSV.
- **Ícone novo:** `FileTextIcon` (Lucide `file-text`) foi adicionado ao inventário `icons.ts`.

## 10. Registro para o relatório final

**Fatos**
- P1 do relatório PDF na Web, entregue em 8 commits na branch `feat/pdf-relatorio`, sem push.
- Testes: 912 em 79 suítes, todos verdes. São 80 testes novos: 77 em 8 suítes novas e 3 no teste do Histórico. Lint e typecheck sem erros.
- Dependências novas: `jspdf` 4.2.1 e `jspdf-autotable` 5.0.9, ambas MIT. Custo de geração: R$ 0,00. Delta do bundle inicial Web: +3,1 KB gzip; chunks sob demanda: +179,7 KB gzip.
- O PDF foi gerado e conferido no Jest (node) e no Chromium com `pdftotext`, `pdftoppm`, `pdfinfo` e `pdffonts`, sempre com dados sintéticos.

**Decisões**
- Período civil com fuso fixado, implementado com luxon (já instalado). O CSV não foi alterado.
- Média aritmética por registro; pulso ausente fora do denominador; a sessão conta uma vez.
- Nova leitura `getReadingsForReport` com id, pendência, `fromCache` e omissões; `getAllReadings` intacta.
- Helvetica padrão (WinAnsi) com troca declarada de caracteres não suportados.
- Opcionais do jsPDF excluídos do bundle via resolver do Metro.
- Adaptadores por extensão de arquivo; Android inerte nesta etapa.

**Limitações**
- Sem gráfico, pré-visualização ou Android.
- PDF não marcado.
- Renderização na thread principal, sem limite e sem timeout.
- Pendentes: impressão física, leitor de tela, navegador móvel e coletor de erros real.

**Comandos de reprodução**
```bash
git switch feat/pdf-relatorio
npm ci
npm run lint && npm run typecheck && npm test
AFERI_PDF_EVIDENCE_DIR=/tmp/aferi-pdf npx jest src/features/report/render-report-pdf
pdftotext -layout /tmp/aferi-pdf/exemplo-spec.pdf -
pdffonts /tmp/aferi-pdf/exemplo-spec.pdf
pdftoppm -gray -png -r 70 /tmp/aferi-pdf/cobertura-parcial.pdf /tmp/aferi-pdf/cinza
```
Para medir o bundle, defina valores fictícios para as variáveis `EXPO_PUBLIC_*` listadas em `.env.example` apenas no ambiente do comando e rode:
```bash
npx expo export -p web --clear --output-dir /tmp/aferi-dist
```
