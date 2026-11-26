# Prompt P1 — Relatório PDF essencial na Web (Claude Code)

Registro do prompt de execução de 26/11/2026 (parte do plano em
[reavaliação](../reavaliacao-2026-11-26.md)). Destinatário: nova sessão do Claude Code (nuvem),
com este repositório, a partir de `staging`.

**Configuração recomendada** (as opções do produto podem ter mudado; ajuste ao seu plano):
sessão **na nuvem** (precisa de `pdftotext`, `pdftoppm`, Chromium e acesso ao npm, que existem no
container); modelo mais capaz disponível na assinatura (Fable 5.2 ou Opus 5.5) com esforço
**high**; Sonnet 5.5 em **high** como alternativa mais econômica; evitar `xhigh`/`max` salvo
bloqueio; modo de permissão padrão (não "bypass"); sem subagentes por padrão.

---

```
Contexto: projeto Aferi (repo RamonMenz/bp-tracker), app Expo/React Native (Android + Web) para
registro de pressão arterial. Esta é a etapa P1 de um plano de entregas; leia CLAUDE.md antes de
qualquer coisa e siga-o (TypeScript estrito, sem any, sem console.log, rotas em app/ sem lógica,
alias @/, exports nomeados, erros amigáveis em pt-BR, Conventional Commits).

Base: origin/staging (HEAD esperado 2afb60d ou mais novo; confira com git log). Crie a branch
feat/pdf-relatorio a partir dela (sessão na nuvem: git switch -c feat/pdf-relatorio origin/staging;
checkout local: git worktree add ../bp-tracker-pdf -b feat/pdf-relatorio origin/staging).

Antes de editar, escreva em até 15 linhas o plano e a lista de arquivos que tocará; depois
prossiga sem esperar resposta.

Leia antes: CLAUDE.md, constitution.md, specs/spec-relatorio-pdf.md (§2 invariantes, §3, §4, §5,
§7), src/features/export/useExportCsv.ts, src/components/bp/ExportCsvDialog.tsx,
src/features/readings/readings.repo.ts, src/features/readings/reading.schema.ts, src/lib/csv.ts,
src/lib/datetime.ts, src/lib/file.web.ts, app/(app)/history.tsx.

OBJETIVO (P1): na Web, em Histórico, "Gerar relatório PDF" gera e baixa um PDF com cabeçalho
(título, período solicitado, data/hora da geração, fuso IANA), cobertura (nº de registros, dias
com registro, primeiro/último incluído), médias de sistólica/diastólica/pulso com N e tabela
completa em ordem cronológica. NÃO inclui gráfico, pré-visualização nem Android nesta etapa.

ESCOPO
1. Modelo puro e cálculos em src/lib/report/ (sem I/O, sem React): períodos 7 dias, 30 dias,
   Tudo e Personalizado por measuredAt, em DIAS CIVIS com o fuso fixado no início da operação;
   início do primeiro dia inclusivo e início do dia seguinte ao último, exclusivo; bloquear
   data final anterior à inicial e dias futuros; média aritmética POR REGISTRO (nunca média de
   médias diárias); pulso null fora do denominador ("Não informado" se N=0, nunca zero);
   sessionReadings é detalhe e o documento salvo conta UMA vez; arredondar só na apresentação,
   uma casa, vírgula pt-BR; dd/mm/aaaa e HH:mm.
2. Nova função de leitura em readings.repo.ts SEM alterar getAllReadings nem o CSV: devolve os
   registros com id, indicação de fromCache/hasPendingWrites e contagem de documentos inválidos
   omitidos. Cobertura incompleta, cache ou omissão devem ser declarados no documento; nunca
   apresentar subconjunto como histórico completo.
3. Renderizador Web em src/features/report/ com jsPDF + jspdf-autotable carregados por import()
   dinâmico (não inicializar antes da ação do usuário). Texto selecionável, A4 retrato, corpo da
   tabela >= 10 pt, cabeçalho da tabela repetido, numeração de páginas, observações tratadas como
   texto literal. Fonte: a padrão do jsPDF deve cobrir os acentos do pt-BR; confirme com pdftotext
   e registre a decisão.
4. Hook + diálogo seguindo o padrão do ExportCsvDialog (atalhos 7/30/Tudo/Personalizado). Botão
   só na Web nesta etapa; o CSV permanece independente e intacto. Descartar o resultado se o uid
   mudar durante a geração. Mensagens amigáveis em pt-BR; NUNCA error.message cru (o
   useExportCsv legado faz isso; não copie). Gerar PDF jamais grava no Firestore.
5. Download por Blob + URL de objeto, revogando a URL só depois do consumo (não de forma
   síncrona). Nome sem identificador pessoal: aferi-relatorio-AAAA-MM-DD_a_AAAA-MM-DD.pdf.
   Nada de nome, e-mail, UID ou foto no PDF nem nos metadados.

FORA DE ESCOPO (não faça): gráfico, pré-visualização, Android/expo-print, voz, fotografia,
mudança de modelo/schema/rules/índices, novas coleções, recursos remotos (CDN, fontes ou
imagens externas), alteração do CSV, refatoração de código não relacionado, tasks.md.

DEPENDÊNCIAS: apenas jspdf e jspdf-autotable (já escolhidas e justificadas em spec §7.1).
Registre as versões instaladas, confirme que o bundle Web não puxa canvg/html2canvas/dompurify
e meça o delta do bundle Web (expo export -p web, antes e depois). Operações só locais; nenhum
contato com produção, Firebase real ou serviços externos além do registry npm.

TESTES (obrigatórios; comportamento, não implementação)
- Exemplo da spec: 120/80/pulso 60, 130/90/sem pulso, 140/100/pulso 80 => médias 130,0/90,0
  (N=3) e pulso 70,0 (N=2); também com os dois primeiros no mesmo dia (média global igual).
- Todos sem pulso => "Não informado". Sessão de duas leituras contada uma vez. Período vazio =>
  "Nenhuma medição no período selecionado." e nenhum PDF. Bordas inclusiva/exclusiva do dia e
  mudança de horário de verão (fixe TZ explicitamente nos testes). Documento inválido omitido e
  cache/pendência sinalizados. Observação com HTML, URL, aspas e caracteres especiais. Muitos
  registros => várias páginas sem perda. Resultado descartado quando o uid muda.
- Gere o PDF real em teste e confira com pdftotext (valores, acentos, ordem) e pdftoppm
  (converta para PNG e inspecione visualmente a primeira e a última página).
- Rode: npm run lint && npm run typecheck && npm test (as suítes legadas e as do CSV devem
  continuar verdes). Se o jsPDF não rodar no ambiente Jest, use o ambiente node do Jest.

ENTREGA
- Commits atômicos na branch feat/pdf-relatorio, mensagens em Conventional Commits, no estilo do
  repositório. NÃO faça push, PR nem merge sem autorização explícita do autor.
- Documente em docs/pdf-relatorio.md (novo): decisões, versões instaladas, delta de bundle, matriz
  dos critérios PDF-01..22 (coberto / parcial / pendente, com a evidência e o motivo), limites
  conhecidos e um bloco final "Registro para o relatório final" (fatos, decisões, limitações,
  comandos de reprodução). Não edite tasks.md.
- Relatório final no chat: o que foi feito, contagem de testes, o que ficou pendente. Não declare
  a funcionalidade completa nem o Android validado; P1 não é o PDF completo.

LIMITE: se um bloqueio persistir após duas tentativas de correção, pare e reporte o que foi
tentado, sem contornar guardrails nem trocar de biblioteca.
```
