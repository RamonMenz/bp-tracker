# Relatório PDF — Android (etapa P3)

**Branch:** `feat/pdf-android`, a partir de `origin/staging` em `efb68d7`.
**Spec:** [`specs/spec-relatorio-pdf.md`](../specs/spec-relatorio-pdf.md) (§2, §3.3–3.5, §4, §5, §7). Web: [`pdf-relatorio.md`](pdf-relatorio.md) (P1, P2 e P4).
**Estado:** implementado e coberto por testes automatizados, mas **NÃO validado em aparelho**. É preciso um build novo de Dev Client pela EAS, porque o `expo-print` é módulo nativo. O build e a validação no Samsung são do autor (§9). Nenhum critério da P3 está "validado em aparelho".

## 1. O que a P3 entrega

No Android, em Histórico, o botão **“Gerar relatório PDF”** abre o mesmo diálogo de período da Web e usa o mesmo hook (`useReportPdf`). O fluxo é:

1. **Leitura e modelo.** Leitura única (`getReadingsForReport`) e **o mesmo modelo puro** da Web (`buildReportModel`): cabeçalho, cobertura, médias com N, gráfico, tabela completa e notas.
2. **PDF.** O template HTML/CSS (`report-html.ts`) é convertido em PDF pelo `expo-print` (`printToFileAsync`, WebView do sistema), no cache privado do app.
3. **Revisão sem prévia embutida.** Mostra o resumo e declara: “Este aparelho não mostra a prévia do PDF dentro do Aferi. Depois de salvar ou compartilhar, abra o arquivo no aplicativo escolhido para conferi-lo.”
4. **Entrega.** “Salvar ou compartilhar PDF” abre a folha de compartilhamento do sistema (`expo-sharing`) com `application/pdf` e o nome `aferi-relatorio-AAAA-MM-DD_a_AAAA-MM-DD.pdf`.
5. **Limpeza.** O arquivo temporário é apagado depois do uso (§4), e a geração seguinte varre resíduos.

Estados, cancelamento, uma geração por vez, prazo de 30 s, limite de 3.000 registros, troca de conta e mensagens em pt-BR **são os mesmos da Web**, porque o hook é o mesmo. jsPDF/AutoTable continuam fora do bundle Android.

## 2. Decisões

1. **`expo-print` no Android** é uma decisão congelada na spec §7.1, sem jsPDF no Android. Nenhuma alternativa foi testada nesta etapa.
2. **Mesmo modelo e mesma geometria.**
   - O template só desenha o `ReportModel`.
   - O gráfico SVG usa o mesmo `ReportChart` e as funções puras `chartDayRatio`/`chartValueRatio` (`src/lib/report/report-chart.ts`), que repetem a fórmula do `xOf`/`yOf` do jsPDF.
   - O renderizador Web **não** foi alterado para usar essas funções, para não mexer no fluxo Web. A equivalência está escrita nos comentários e foi conferida por teste de coordenada (`report-html.test.ts`). Fica sugerido como refatoração futura.
3. **Template autocontido** (`src/features/report/report-html.ts`):
   - **Página:** A4 retrato, `@page { size: A4 portrait; margin: 15mm 15mm 20mm }`, largura útil de 180 mm e colunas de mesma largura da Web.
   - **Tipografia:** título 16 pt, seções 13 pt, texto 11 pt, tabela 10 pt e rodapé 9 pt.
   - **Tabela:**
     - cabeçalho repetido com `thead { display: table-header-group }`;
     - linhas inteiras com `tr { break-inside: avoid; page-break-inside: avoid }`;
     - observação longa: a quebra é estimada por caracteres (`wrapTextByChars`, 38 por linha) e fatiada em blocos de até 12 linhas (`splitDetailLines`, o mesmo da Web), com “(continua)”/“(continuação)” e data/hora repetidas. Detalhe curto fica com o texto original e o motor quebra a linha.
   - **Paginação:** “Página X de Y” pelas caixas de margem do `@page` (`@bottom-right` com `counter(page)`/`counter(pages)`). **Depende do motor:** o Chromium 131+ suporta; o WebView do aparelho precisa ser conferido.
   - **Gráfico:** SVG inline. Sistólica com linha contínua e círculo cheio (blue-700); diastólica tracejada com quadrado vazado (amber-700). Linhas só entre dias consecutivos.
   - **Segurança:**
     - todo texto variável passa por `escapeHtml` (`& < > " '` e controles invisíveis);
     - o rodapé usa uma string CSS com escape hexadecimal;
     - CSP `default-src 'none'; style-src 'unsafe-inline'`;
     - sem script, `url(...)`, `@import`, imagens ou fontes externas. O WebView do `expo-print` carrega o HTML com `loadDataWithBaseURL(null, …)` e JavaScript desligado (padrão do WebView).
   - **Fonte:** `sans-serif` do sistema (Roboto no Android), local e com cobertura Unicode. Não há a troca por “?” da Helvetica padrão do jsPDF, porque acentos, emoji e CJK usam a fonte do sistema.
4. **`textZoom: 100`.** O documento não muda com a escala de fonte do sistema. A interface do app continua respeitando a escala (`allowFontScaling` intocado), e o leitor de PDF amplia o documento.
5. **Contrato da plataforma** (`report-pdf-platform.types.ts`):
   - o artefato é opaco: `Blob` na Web e `{ kind: 'printed-file', uri }` no Android;
   - `deliveryMode`: `download` na Web, `share` no Android;
   - `discard` é opcional (só o Android implementa);
   - `deliver` pode devolver uma Promise.
6. **Entrega assíncrona no hook:**
   - `saveReport()` continua síncrono e devolve `true` quando a entrega **começou**. O diálogo fecha e a folha do sistema abre na mesma volta do event loop, sem espera em que uma troca de conta pudesse entrar.
   - O arquivo só é liberado quando a Promise do `shareAsync` termina. Cancelar, trocar de conta ou desmontar durante o compartilhamento **não** apagam o arquivo em leitura.
   - Falha do compartilhamento: “Não foi possível abrir o compartilhamento do relatório. Gere o relatório novamente.” Aparece no rodapé do Histórico, porque o diálogo já fechou. Só aparece para a mesma conta e se nenhuma preparação nova começou.
7. **Descarte de resultado sem dono.** Um PDF que chega depois do prazo, do cancelamento ou da troca de conta é apagado na hora (`discard`).
   - *Defeito encontrado e corrigido durante a implementação:* a primeira versão registrava o descarte num `.then` anterior ao `await` e apagava o arquivo **adotado** antes do compartilhamento. O teste “compartilhar: … só é liberado quando a folha fecha” falhava; o descarte agora só ocorre em prazo estourado ou geração não corrente.
8. **Semântica do `shareAsync` no Android.** O código do `expo-sharing` 57.0.7 resolve a Promise no `onActivityResult` do seletor, quando ele **fecha**. Isso não distingue envio de cancelamento nem prova que o app de destino terminou de ler. Por isso:
   - o app não declara envio, e cancelar a folha não mostra erro nem “enviado”;
   - a remoção depois do compartilhamento espera uma carência (§4).
9. **Sem pré-visualização embutida** (declarado na interface). A spec §3.4.1 pede “recurso compatível com a plataforma”. Uma prévia nativa exigiria outra biblioteca de visualização de PDF, fora do escopo. O leitor escolhido pelo usuário faz esse papel.
10. **Mensagens e logs.**
    - Exceções do `expo-print`, do `expo-sharing` e do sistema de arquivos viram códigos fixos (`report-print-failed`, `report-share-failed`, `report-file-move-failed`, `report-cleanup-failed`…) e nunca chegam ao usuário nem ao logger com caminho, nome de arquivo, valores ou observações.
    - O hook usa as mensagens pt-BR existentes, além da de compartilhamento.

## 3. Arquivos

| Camada | Arquivo | Papel |
|---|---|---|
| Puro | `src/lib/report/report-chart.ts` | + `chartDayRatio`, `chartValueRatio` (geometria compartilhada). |
| | `src/lib/report/report-table.ts` | + `wrapTextByChars` (quebra estimada para fatiar detalhes longos). |
| Feature | `src/features/report/report-html.ts` | Template HTML/CSS + SVG; `escapeHtml`; `A4_WIDTH_PT`/`A4_HEIGHT_PT`. |
| | `src/features/report/report-print-pipeline.ts` | Pipeline Android: período, modelo e `printToFileAsync`. Único importador de `expo-print`. |
| | `src/features/report/report-pdf-files.ts` | Ciclo de vida do temporário: pasta por geração, remoção, carência e varredura limitada. |
| | `src/features/report/report-pdf-platform.native.ts` | Adaptador real: `import()` do pipeline, `shareAsync`, liberação e descarte. |
| | `src/features/report/report-pdf-platform.types.ts` | Artefato opaco, `deliveryMode`, `discard?`, entrega `void \| Promise<void>`. |
| | `src/features/report/report-pdf-platform.web.ts` | Só aditivo: `deliveryMode: 'download'` e recusa de artefato que não seja `Blob`. Download e prévia iguais. |
| | `src/features/report/useReportPdf.ts` | Entrega assíncrona, descarte de resultado sem dono e `deliveryMode`. |
| UI | `ExportPdfDialog.tsx`, `ReportReviewPanel.tsx` | Textos por `deliveryMode` (a Web continua com os mesmos textos). |
| | `PdfPreviewFrame.tsx` (nativo) | Só o comentário. |
| Rota | `app/(app)/history.tsx` | Repassa `deliveryMode`; erro do relatório com o diálogo fechado vai ao rodapé. |
| Testes | `report-html.test.ts`, `report-html.chromium.test.ts` (opt-in), `report-pdf-platform.native.test.ts`, `useReportPdf.share.test.ts`, + casos em `report-lazy-loading.test.ts`, `ExportPdfDialog.test.tsx`, `history.test.tsx`, `report-chart.test.ts`, `report-table.test.ts`. `report-privacy.test.ts` ganhou só um *cast* de tipo (`pdf as Blob`). | |

**Não mudaram:** CSV, renderizador jsPDF, pipeline Web, rules, schema, índices, `metro.config.js`, `tasks.md`.

## 4. Ciclo do arquivo temporário (PDF-17)

| Situação | O que acontece |
|---|---|
| Geração | `printToFileAsync` grava `cache/Print/<uuid>.pdf`; o arquivo é **movido** para `cache/aferi-relatorios/<epoch-ms>-<aleatório>/aferi-relatorio-…pdf`. Se mover falhar, o original e a pasta são apagados. |
| Revisão cancelada, período alterado, conta trocada, desmontagem | Apagado **na hora** (nunca foi entregue). |
| Resultado tardio (prazo, cancelamento durante a impressão) | Apagado na hora (`discard`). |
| Compartilhado (enviado ou cancelado na folha) | Apagado **5 min** (`SHARE_GRACE_MS`) depois de a folha fechar. Com o app em segundo plano o Android pode adiar o timer: a remoção acontece depois, nunca antes. |
| Falha ao abrir a folha | Apagado na hora (não houve entrega). |
| App encerrado no meio | Na **geração seguinte**, a varredura examina no máximo **20** entradas e apaga pastas de geração de `aferi-relatorios/` e PDFs com nome de UUID em `Print/` que tenham **mais de 30 min** e não estejam em uso neste processo. Nomes desconhecidos, CSV e o arquivo em uso são preservados. |
| `documentDirectory` | **Nunca** é usado pelo relatório (testado). A cópia que o usuário salvar pelo seletor fica no destino escolhido, fora da limpeza do app. |

Limites: a varredura só roda ao gerar um novo relatório. Um resíduo de interrupção pode ficar no cache até a próxima geração, ou até o sistema limpar o cache do app. `Print/` é tratado como do relatório porque o `expo-print` só é usado por ele.

## 5. Versões

| Pacote | Versão | Licença | Observação |
|---|---|---|---|
| `expo-print` | `~57.0.1` no `package.json`; **57.0.2** no lock (publicada em 11/09/2026) | MIT | Faixa do `bundledNativeModules.json` do Expo 57.0.8, instalada com `EXPO_OFFLINE=1 npx expo install expo-print`, porque a CLI on-line foi bloqueada pelo proxy da sessão. `npm view expo-print versions` mostra 57.0.0–57.0.2 na linha 57; 58.x é do SDK 58. Sem config plugin; **exige build nativo novo**. `expo install --check` só acusa `@shopify/flash-list` (2.3.2 vs. 2.0.2), anterior a esta tarefa. |
| `expo-sharing` | 57.0.7 | MIT | Já existia (CSV). FileProvider com `cache-path`. |
| `expo-file-system` | 57.0.1 (API `legacy`) | MIT | Já existia; mesma API de `src/lib/file.native.ts`. |
| `luxon` | 3.7.2 | MIT | Já existia; agora também no bundle Android (§6). |

## 6. Tamanho dos bundles (`npx expo export`, base `origin/staging` `efb68d7` × P3)

Valores fictícios de `EXPO_PUBLIC_*` só no ambiente do comando; `EXPO_OFFLINE=1`.

| Artefato | Base (bytes / gzip -9) | P3 (bytes / gzip -9) | Delta |
|---|---|---|---|
| Android `entry-*.hbc` | 7.231.965 / 3.054.739 | 7.445.764 / 3.154.737 | **+213.799 / +99.998** |
| Web `entry-*.js` | 5.601.034 / 1.268.990 | 5.602.576 / 1.269.561 | +1.542 / +571 |
| Web `report-pdf-pipeline-*.js` (sob demanda) | 91.544 / 29.531 | 92.072 / 29.737 | +528 / +206 |
| Web `jspdf.es`, `jspdf.plugin` | iguais | iguais | 0 |

- **Android.**
  - O `.hbc` não tem `jsPDF`, `jspdf`, `autoTable` nem `report-pdf-pipeline` (0 ocorrências).
  - Tem `ExpoPrint`, `printToFileAsync`, `aferi-relatorios` e a CSP do template.
  - O grosso do delta é o **luxon** (`IANAZone`, `Invalid DateTime` só aparecem na P3) mais o modelo do relatório, que antes não existiam no bundle nativo.
  - Os módulos entram por `import()` e só são **avaliados** ao pedir o relatório; os bytes são distribuídos mesmo assim.
  - O delta do **APK/AAB** (código nativo do `expo-print`) **não foi medido**: exige build EAS.
- **Web.** Nenhuma ocorrência de `expo-print`, `ExpoPrint`, `printToFileAsync`, `aferi-relatorios`, `report-print-pipeline` ou da CSP do template. O `entry` cresceu 1,5 KB (contrato, `deliveryMode`, textos).

## 7. Aproximação em Chromium — **não equivale ao motor do Android**

`report-html.chromium.test.ts` (opt-in, `AFERI_ANDROID_HTML_EVIDENCE_DIR`) renderiza o HTML do template com `page.pdf` do Playwright (Chromium 158, `preferCSSPageSize`) e confere com o poppler. Resultados nesta sessão:

- **Exemplo da spec:** “130,0 mmHg (N = 3 registros)”, “90,0 mmHg (N = 3 registros)”, “70,0 bpm (N = 2 de 3 registros com pulso informado)” e rodapé “Aferi — gerado em … / Página 1 de 2”.
- **400 registros com observação longa, hostil e acentuada:**
  - A4 de 595 × 842 pt e 16 páginas;
  - o cabeçalho da tabela aparece em toda página com linhas da tabela;
  - **400 de 400** linhas contadas;
  - “(continua)”/“(continuação)” presentes, e o fim da observação longa está presente;
  - acentos e “— “ok”” intactos;
  - `<img src="https://…">` aparece como texto literal.
- **Rede:** com `page.route('**/*')` registrando tudo, **nenhuma** requisição.
- **Inspeção visual (PNG em cores e em cinza, `pdftoppm -gray`):** séries distinguíveis em cinza pelo traço/marcador; nenhuma linha cortada entre páginas; continuação legível.
- **Volume (CPU de servidor):**

  | Registros | Modelo | HTML | Tamanho do HTML | `page.pdf` | Páginas | PDF |
  |---|---|---|---|---|---|---|
  | 400 | 22 ms | 6 ms | 94 KB | 0,15 s | 15 | 137 KB |
  | 1.095 | 45 ms | 5 ms | 245 KB | 0,27 s | 38 | 313 KB |
  | 3.000 | 96 ms | 16 ms | 662 KB | 0,75 s | 101 | 801 KB |

  **No celular, o WebView será mais lento.** No Android o prazo único de 30 s também cobre o `printToFileAsync`; se um relatório de 3.000 registros passar disso no aparelho, ele sempre vai estourar o prazo, e o limite terá de ser revisto com evidência.

O que a aproximação **não** prova:
- versão e recursos do WebView do aparelho (caixas de margem do `@page`, `print-color-adjust`, quebras);
- fontes do sistema;
- comportamento do `PrintDocumentAdapter`;
- FileProvider, apps de destino, memória e tempo no celular.

## 8. Matriz de critérios (após a P3)

“Automatizado” = Jest (com `expo-print`/`expo-sharing`/sistema de arquivos simulados), guarda estática, export real dos bundles ou aproximação em Chromium (rotulada). **Nenhum critério está validado em aparelho.**

| ID | Automatizado | Validado em aparelho | Pendente (motivo) |
|---|---|---|---|
| **PDF-15** | Sim (simulado): `shareAsync(uri, { mimeType: 'application/pdf', UTI, dialogTitle })`; nome `aferi-relatorio-…pdf` sem identificador pessoal; nada sai antes de “Salvar ou compartilhar”; nome divergente é recusado antes da folha. Aproximação Chromium: PDF A4 válido, `pdftotext` ok. | Não | **Abrir no leitor externo do Samsung**; nome e MIME vistos pelo app de destino; FileProvider real. Exige build EAS novo. |
| **PDF-16** | Sim (simulado): folha que fecha (envio ou cancelamento) não mostra erro nem “enviado”; falha vira mensagem pt-BR no Histórico, sem caminho no log; arquivo não é apagado enquanto a folha está aberta nem durante a carência; cancelar, trocar de conta ou desmontar durante o compartilhamento não apagam o arquivo. | Não | **Cancelar a folha** no aparelho; app de destino que lê depois (ex.: upload com confirmação); carência de 5 min suficiente para os destinos usados; compartilhamento indisponível. |
| **PDF-17** | Sim (simulado): ciclo completo da §4; nada em `documentDirectory`; varredura limitada (≤ 20, > 30 min, só nomes reconhecidos, nunca o arquivo em uso); falha de listagem não interrompe a geração. | Não | **Inspecionar o cache real** (`run-as`) após concluir, cancelar e matar o app; adiamento de timers em segundo plano. |
| PDF-01 | Guarda estática: `expo-print` só no pipeline de impressão, alcançado só por `import()` do adaptador nativo; a Web não o referencia; o caminho Android não importa jsPDF. Export: `.hbc` sem jsPDF, Web sem `expo-print`. | Não | Inicialização e Histórico no aparelho; delta do APK. |
| PDF-03/04/05/06 | Template com o mesmo modelo: ordem das seções, exemplo da spec (130,0/90,0 N=3; 70,0 N=2), “—” e “Não informado”, sessão uma vez (Jest e Chromium). | Não | Conferir no PDF gerado pelo WebView com dados sintéticos reais da conta. |
| PDF-08 | SVG com séries distintas por traço e marcador, sem linha entre dias não consecutivos, um dia sem tendência, coordenadas pela geometria da Web; PNG em cinza (Chromium). | Não | SVG no WebView do aparelho; impressão em cinza. |
| PDF-09 | Cabeçalho repetido, 400/400 linhas, continuidade de observação longa, “Página X de Y” (Chromium). | Não | **Quebras e paginação no WebView** (caixas de margem do `@page` dependem da versão). |
| PDF-10 | A4 por `pdfinfo` e PNG em cinza (Chromium); `textZoom` fixo. | Não | Leitor externo, A4 real, impressão física em cinza. |
| PDF-11 | CSP `default-src 'none'`; sem `http(s)://`, `@import`, `url()`, script ou atributo de recurso no markup; Chromium sem nenhuma requisição; nenhuma API de rede no caminho Android. | Não | Inspeção de rede no aparelho, se exigida. |
| PDF-12 | Observação com `<img src="https://…">`, `<script>`, aspas, `</style>` e `@import` vira texto escapado; um único `</style>`; Chromium mostra o texto literal. | Não | Conferir no PDF do aparelho. |
| PDF-13 | Exceções do `expo-print`, `expo-sharing` e do sistema de arquivos viram códigos fixos; logs sem caminho, nome, valores ou observações (simulado). `report-privacy.test.ts` (Web) continua verde. | Não | Crashlytics real. |
| PDF-14 | Toques repetidos fazem uma impressão; cancelar durante a geração descarta o arquivo tardio; prazo estourado descarta o arquivo tardio. | Não | Aparelho. |
| PDF-18 | Troca de conta durante a geração descarta o arquivo; com a revisão aberta, libera e recusa salvar; durante o compartilhamento, a nova conta não vê erro da anterior. | Não | Troca real de conta no aparelho. |
| PDF-21 | Testes de componente do modo `share` (rótulos e ações). | Não | **TalkBack** e fonte ampliada no aparelho. O PDF não é marcado (não verificado). |
| PDF-22 | Limite 3.000 e prazo de 30 s herdados (agora cobrindo a impressão). Volume só na aproximação Chromium (§7). | Não | **Tempo e memória do `printToFileAsync` no Samsung** com 1.095 e 3.000 registros. |
| PDF-02, 07, 19, 20 | Sem mudança: mesmo hook, período, leitura e modelo da Web (testes existentes verdes). | Não | Aparelho e fluxo logado. |

## 9. O que o autor precisa conferir no aparelho (Samsung)

**Pré-requisito:** build **novo** do Dev Client (o `expo-print` é nativo; o build atual não o tem):
```bash
eas build --profile development --platform android
```
Instalar, entrar com uma conta de teste e cadastrar dados **sintéticos**:
- registros em pelo menos 3 dias;
- um registro sem pulso e uma sessão de duas leituras;
- uma observação longa (mais de 600 caracteres);
- uma observação com `<b>x</b> https://exemplo.invalido "aspas" — ação, coração 😀`.

Roteiro (anote “ok”, “falhou” ou “não feito” em cada item):
1. No **Histórico**, “Gerar relatório PDF” aparece ao lado de “Exportar CSV”, e o CSV continua funcionando.
2. O diálogo diz “Você confere o resumo antes de salvar ou compartilhar”. Escolher “Últimos 30 dias” e “Preparar relatório” mostra “Preparando o relatório…” e depois a revisão **sem prévia**, com o aviso declarado. As médias e os N batem com o histórico.
3. “**Salvar ou compartilhar PDF**” abre a folha do sistema com o título “Salvar ou compartilhar o relatório em PDF”. Só aparecem apps que aceitam PDF.
4. Salvar em **Arquivos** (ou Drive) e conferir o nome: `aferi-relatorio-AAAA-MM-DD_a_AAAA-MM-DD.pdf`, sem nome, e-mail ou UID.
5. **Abrir o PDF no leitor externo** (ex.: Samsung Notes, Drive, Adobe). Deve abrir sem erro.
6. **A4:** nas propriedades do documento (ou `pdfinfo` no computador), 210 × 297 mm (595 × 842 pt).
7. **Paginação:** “Página X de Y” e “Aferi — gerado em …” no rodapé de **todas** as páginas. Se faltar, registrar a versão do WebView (Configurações → Apps → Android System WebView).
8. **Cinza:** imprimir ou visualizar em escala de cinza. Sistólica (contínua, círculo) e diastólica (tracejada, quadrado vazado) distinguíveis; números e rótulos legíveis.
9. **Quebras de página:** cabeçalho da tabela repetido em cada página; nenhuma linha cortada ao meio; nada cortado na borda direita.
10. **Observação longa:** continua na linha seguinte com “(continua)”/“(continuação)” e data/hora repetidas, sem texto perdido.
11. **Acentos e especiais:** “ação, coração”, aspas, “—” e emoji corretos; `<b>x</b>` e a URL aparecem como **texto**, sem negrito nem link.
12. **Cancelar o compartilhamento** (voltar na folha): o app volta ao Histórico **sem** erro e **sem** dizer que foi enviado; uma nova geração funciona.
13. **Destino que lê depois:** compartilhar para o Drive e esperar ~1 min antes de confirmar o upload. O upload precisa terminar com o PDF íntegro (a carência é de 5 min).
14. **Temporários** (o build de desenvolvimento é *debuggable*):
    ```bash
    adb shell run-as com.ramonmenz.bptracker ls -la cache/aferi-relatorios cache/Print files
    ```
    - (a) Depois de “Cancelar” na revisão: `aferi-relatorios` vazio na hora.
    - (b) Depois de compartilhar: o arquivo existe; com o app aberto em primeiro plano por mais de 5 min, some.
    - (c) Matar o app com a folha aberta: na geração seguinte, feita 30 min depois, o resíduo antigo some.
    - (d) Nada do relatório em `files/` (`documentDirectory`).
15. **Troca de conta:** sair da conta durante “Preparando o relatório…”. Nenhuma folha abre e a nova conta começa do zero.
16. **Tempo:** cronometrar “Preparar relatório” com cerca de 90, 1.095 e 3.000 registros sintéticos. Se aparecer “A preparação do relatório demorou demais…”, registrar o volume e o tempo.
17. **TalkBack e fonte ampliada:** botões e avisos anunciados; com a fonte do sistema no máximo, o diálogo continua operável. O PDF **não** muda com a escala, porque `textZoom` é fixo.
18. **Modo escuro:** diálogo legível; o PDF continua com fundo branco.

## 10. Limites conhecidos

- **Nada validado em aparelho.** Build EAS novo pendente.
- **Sem prévia embutida no Android** (declarado na interface).
- **Caixas de margem do `@page`** (paginação) dependem da versão do WebView; sem elas, o PDF sai sem “Página X de Y”.
- **`shareAsync` resolve quando o seletor fecha:** não distingue envio de cancelamento. A carência de 5 min é uma hipótese a confirmar com os destinos reais.
- **Timers em segundo plano** podem atrasar a remoção (nunca antecipar). Resíduos só são varridos na geração seguinte.
- **Prazo de 30 s inclui a impressão** no Android; o tempo no celular não foi medido.
- **Bundle Android +214 KB** (`.hbc`), principalmente luxon; APK não medido.
- **Quebra estimada** de observação longa (38 caracteres por linha) é aproximada. O risco é um bloco com mais linhas reais que 12, que mesmo assim cabe numa página.
- **PDF não marcado** (acessibilidade do documento não verificada).
- A equivalência de coordenadas Web × Android é por fórmula idêntica e teste, **não** por código compartilhado no renderizador jsPDF (refatoração sugerida).

## 11. Registro para o relatório final

**Fatos**
- **Branch e commits:** `feat/pdf-android` a partir de `origin/staging` `efb68d7`, com 8 commits (1 de dependência, 5 de código e testes, 1 só de testes e 1 de documentação). **Sem push e sem PR** até autorização do autor.
- **Dependência:** `expo-print ~57.0.1`, 57.0.2 no lock, MIT, faixa do SDK 57.
- **Testes:** `npm test` com 1.094 aprovados e 3 pulados (aproximação Chromium, opt-in) em 90 suítes. Novos: 17 do template, 17 do adaptador Android, 14 do hook no modo `share`, 8 da guarda de importações, 4 do diálogo, 2 do Histórico e 6 dos helpers puros, além de 3 opt-in.
- **Qualidade:** `npm run lint` e `npm run typecheck` sem erros.
- **Aproximação Chromium** (opt-in, rotulada): exemplo da spec, 400 registros (400/400 linhas, cabeçalho repetido, continuidade, acentos, escape), zero requisições e PNG em cinza.
- **Export:** `.hbc` Android sem jsPDF; Web sem `expo-print`. Deltas na §6.
- **Inalterados:** CSV, fluxo Web (textos, download, prévia), rules, schema, índices, `metro.config.js` e `tasks.md`. `npm run test:rules` **não** foi executado, porque rules e repositório não mudaram.

**Defeito encontrado e corrigido**
- O descarte do resultado tardio apagava o arquivo adotado antes do compartilhamento: o `.then` registrado antes do `await` rodava primeiro. Um teste do modo `share` falhava antes da correção.

**Pendências e motivo**
- **Validação no Samsung** (§9): exige build EAS novo e operação humana.
- **Delta do APK/AAB:** exige build.
- **Tempo e memória no celular:** exigem aparelho.
- **Leitor de tela real:** exige TalkBack e operação humana.
- **Impressão física:** exige impressora.

**Comandos de reprodução**
```bash
git fetch origin feat/pdf-android
```
```bash
git switch --detach origin/feat/pdf-android
```
```bash
npm ci
```
```bash
npm run lint && npm run typecheck && npm test
```
Aproximação em Chromium (exige Playwright com Chromium e poppler-utils; não são dependências do projeto):
```bash
AFERI_ANDROID_HTML_EVIDENCE_DIR=/tmp/aferi-android-html npx jest src/features/report/report-html.chromium
```
Exports (valores fictícios para as `EXPO_PUBLIC_*` de `.env.example` só no ambiente do comando):
```bash
EXPO_OFFLINE=1 npx expo export -p android --clear --output-dir /tmp/aferi-dist-android
```
```bash
EXPO_OFFLINE=1 npx expo export -p web --clear --output-dir /tmp/aferi-dist-web
```
