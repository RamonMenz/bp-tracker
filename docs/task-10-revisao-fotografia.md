# TASK-10 — revisão de fotografia antecipada

27/10/2026. **Entrega parcial** na branch `feature/task-10-photo-review`, sobre a
base `staging` `7d72cb3`. Os arquivos locais não commitados da TASK-14 foram
preservados; seu contrato `CandidateSet` foi reutilizado. Não houve merge nem
alteração na frente `feature/pocs-fotografia-voz`.

## Implementado

- `PhotoReadingReview`: candidatos editáveis, sistólica/diastólica/pulso, unidades,
  observação, data/hora inicial da captura, indicação textual de ausência/incerteza
  e seu motivo. Campos incertos começam vazios e podem ser corrigidos. Pulso é
  opcional; ausência nunca vira zero. Candidatos inválidos não são ajustados.
- Reutilização de `BpNumberInput`, `Field`, `DateTimeField`, `Card`, `Text`, `Button`
  e `Screen`, mantendo os componentes legados. A validação usa o schema existente,
  incluindo inteiros, faixas, SYS > DIA, nota de até 280 caracteres e data válida
  com a tolerância de futuro já adotada. O discriminador `manual` exigido pelo
  schema é usado **apenas dentro da validação local**: não há payload clínico de
  origem manual/photo, writer, documento ou fila de persistência nesta entrega.
- `usePhotoReview`: identidade por tentativa, trava síncrona na confirmação e
  revalidação no clique. Recebimento é aceito uma única vez por tentativa; não
  sobrescreve correções. Recapturar/cancelar descarta o rascunho e invalida respostas
  anteriores e confirmações pendentes. Background e desmontagem também invalidam.
  Voltar ao foreground não restaura a revisão.
- Confirmação com resultado final **somente em memória**, sem callback de escrita.
  O texto diz “Confirmar simulação” e não afirma salvamento. Cancelar após a
  confirmação também limpa o resultado demonstrativo.
- `PhotoReviewDemoScreen`: cenários completos, campo incerto e valor fora de faixa,
  todos identificados como sintéticos. Recapturar aguarda nova escolha de cenário;
  não abre câmera nem produz uma saída de OCR fictícia.
- Entrada Expo Web isolada em `demos/photo-review`, com as dependências já travadas
  na raiz. Não usa Expo Router, raiz autenticada, configuração Firebase, hooks de
  escrita, analytics ou crash reporting. Sem `.env.local` ou login. Servidor local
  GET/HEAD, sem gravação, cache desativado e CSP `connect-src 'none'`.

O controller aceita **candidatos já normalizados** do contrato da TASK-03. Não é
adaptador de saídas brutas desconhecidas; validação de formato na fronteira do
reconhecedor e associação de campos continuam na integração correspondente.

## Como executar e demonstrar

Pré-requisito: Node 24 e dependências da raiz instaladas. Não instalar dependências
na subpasta da demonstração; ela compartilha as versões do lock da raiz.

Na raiz do repositório:

```bash
npm ci --ignore-scripts
cd demos/photo-review
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 ../../node_modules/.bin/expo export --platform web
node serve.mjs
```

Abra **http://localhost:8096 no mesmo computador**. Os dois prefixos de ambiente
acima usam sintaxe de terminal Linux/macOS; no PowerShell, defina-os com `$env:`
antes de executar `../../node_modules/.bin/expo export --platform web`.
`Ctrl+C` encerra o servidor. Não use a entrada Web autenticada da raiz para esta
demonstração. Nenhum comando requer Firebase, EAS, build pago ou publicação.

Roteiro (somente dados sintéticos):

1. Escolha “Simular candidatos completos”: revise 120/80 e pulso 72, corrija a
   sistólica, abra “Data e hora” e altere data/hora ou observação.
2. Pressione “Confirmar simulação”: confira os valores corrigidos e o aviso de
   confirmação em memória. Atualizar a página descarta tudo.
3. Escolha “Simular campo incerto”: sistólica vazia com motivo textual; confirmação
   bloqueada até preencher corretamente. Pulso ausente pode permanecer vazio.
4. Escolha “Simular valor inválido”: 400 permanece visível com erro. Corrija para
   um valor permitido ou use “Tirar outra fotografia (simulação)”.
5. Recapturar limpa os candidatos; escolha outro cenário. Cancelar limpa rascunho
   e resultado. Não surge registro no histórico, pois o app de demonstração não
   inicializa o histórico ou qualquer SDK Firebase.

## Verificado

```bash
npm run lint
npm run typecheck
node node_modules/typescript/bin/tsc --noEmit -p demos/photo-review/tsconfig.json
npm test -- --runInBand
```

- **454 testes em 48 suítes passaram**, incluindo 24 novos testes de controller/UI,
  46 da TASK-14 e 384 do legado. Testes de UI bloqueiam imports de auth/writer com
  falha explícita; não substituem esses serviços por um salvamento fake.
- Casos novos cobrem campos/editabilidade, motivo textual, erros por campo,
  obrigatórios, pulso opcional, inteiros, faixas, relação entre pressões, nota,
  data inválida/futura, confirmação duplicada no mesmo ciclo, cancelar/recapturar
  durante confirmação, callbacks atrasados/repetidos, background e desmontagem.
- Lint e TypeScript da raiz e da entrada isolada aprovados; export Web aprovado
  offline, sem variáveis Firebase. ESLint ignora apenas artefatos gerados da demo.
- Chromium headless: seleção dos cenários, edição de campo, confirmação em memória,
  erro de faixa, recaptura e cancelamento executados; desktop 1280×1000 e viewport
  móvel 390×844 sem overflow horizontal. Percurso observado: quatro requisições
  locais, zero externas, zero exceções JavaScript. Inspeção visual levou à correção
  dos paths do Tailwind no projeto isolado; tema do legado preservado.

Essas evidências são de revisão e simulação; não são reconhecimento de display,
privacidade de câmera/OCR ou suporte de hardware. O seletor de data/hora da UI tem
stub nos testes de composição; sua implementação Web já possui suíte própria.
Avisos React `act` existentes na suíte legada não foram confundidos com falhas.

## Pendências mantidas

- TASK-09: parser fotográfico real e associação segura dos campos.
- Captura/OCR e inspeção de mídia/recursos nos dispositivos: TASK-04/06–08.
- Integração segura com sessão/conta, troca de conta, permissões e captura real.
- TASK-11: origem `photo`, regras/modelo coordenados, confirmação clínica e
  persistência real, testes isolados/emuladores antes de qualquer habilitação.
- TalkBack, navegação completa por teclado/leitor de tela, ampliação de fonte e
  comportamento Android real, incluindo seu seletor nativo de data/hora.
- Feedback e sugestão de segunda medição após **salvamento clínico real**.

TASK-10 permanece aberta: esta tela não encerra seus aceites dependentes de OCR,
persistência ou dispositivo. Não houve operação contra Firebase, nova dependência,
commit, push, deploy ou contratação. Esforço/despesas reais acumulados e saldo do
teto global de R$300 continuam não informados.

Próxima tarefa recomendada: antecipar a parte pura da TASK-09 com observações OCR
sintéticas, preservando a pendência de integração e avaliação de displays reais.
