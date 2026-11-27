# TASK-09 — interpretação determinística de fotografia

27/10/2026, branch `feature/task-09-photo-interpretation`, base staging `7d72cb3`,
preservando o trabalho local anterior. Implementação local e ligação à revisão
realizadas. A tarefa permanece aberta para validar cobertura com as integrações
em aparelhos/displays reais; TASK-07/08 também continuam abertas.

## Contrato e integração

`src/domain/interpret-photo.ts` interpreta `OcrObservation` da TASK-03 e devolve
somente `CandidateSet`. É puro: não recebe imagem, histórico, relógio, conta ou
função de escrita; não faz I/O nem logs. Preserva `capturedAtMs`, sem substituí-lo
por horário/data impressos no display. `parseOcr` mantém a validação da fronteira.

Foram conferidas as saídas concretas existentes: ML Kit envia **linhas** com
bounding boxes normalizadas pelo módulo nativo; Tesseract envia **linhas** dos
blocos/parágrafos, normalizadas pelo adaptador Web. Ambos usam `upright-frame`,
com confiança atualmente nula. Não foram presumidas caixas de palavras ou
inventadas coordenadas individuais dentro de linhas agregadas.

Os coordenadores Android/Web já chamam `interpretPhoto`; continuam enviando os
candidatos à revisão compartilhada das TASK-10/15. Campos incertos/ausentes ficam
vazios, candidatos fora da faixa ou invertidos permanecem visíveis com os erros
do schema existente. Confirmar nas demonstrações continua somente em memória.
Não foi ligada persistência clínica, Firebase, auth ou writer às demonstrações.

## Regras suportadas e limites

- Rótulos: SYS/SIS/SISTÓLICA/SYSTOLIC, DIA/DIASTÓLICA/DIASTOLIC e
  PUL/PULSE/PULSO/PR/BPM. Não depende de confiança do OCR. Normaliza caixa e
  acentos de palavras; não substitui O por 0, junta dígitos ou corrige números.
- Uma linha com rótulo e um inteiro, antes ou depois, com unidade mmHg/bpm.
  Linhas com vários campos aceitam sequência uniforme rótulo/valor ou valor/rótulo.
  Mais de um valor no segmento ou rótulos repetidos ficam incertos, mesmo iguais.
- Linhas separadas: valor à esquerda/direita do rótulo na mesma linha geométrica,
  ou imediatamente abaixo em coluna alinhada. Só usa layout **ancorado em rótulo**;
  uma coluna de três números sem identificação não basta para inferir campos.
- Mesma linha: sobreposição vertical de pelo menos metade da menor altura,
  diferença dos centros até metade da maior altura, caixas horizontalmente
  separadas (tolerância 0,01) e distância horizontal até 0,30 do quadro.
  Abaixo: distância vertical de −0,01 a 0,12 e diferença horizontal dos centros
  até 0,08. Tolerância numérica adicional de 0,000001 nas comparações de borda.
  São heurísticas conservadoras explícitas, não parâmetros medidos em aparelhos.
- Uma linha numérica já alinhada horizontalmente a um rótulo não é emprestada ao
  rótulo da linha superior. Demais opções laterais/abaixo são consideradas juntas:
  se houver várias, não escolhe pela distância, faixa, valor ou confiança. Um mesmo
  número disputado por dois campos, ou por campo/acessório, deixa o campo incerto.
- Data completa, data dia/mês, horário e identificadores explícitos de memória,
  usuário e média são acessórios. Rótulo de acessório em caixa separada também
  participa da associação espacial para impedir empréstimo indevido do seu número.
  Acessórios desconhecidos não são adivinhados; podem produzir incerteza.
- Inteiros fora das faixas clínicas continuam candidatos para validação da revisão.
  SYS 80 / DIA 120 nunca vira SYS 120 / DIA 80. Decimais/dígitos ilegíveis não são
  arredondados ou escalados. kPa explícito bloqueia candidatos de pressão como
  `mixed-scale`, sem conversão; pulso identificado pode ser preservado.
- Campo sem rótulo e sem número órfão: `missing`. Rótulo sem leitura associável:
  `unreadable`. Números órfãos sem identificação segura: `unidentified-number` nos
  campos sem rótulo. Conflitos: `ambiguous-label`. Nenhum deles preenche o campo.

Organização não suportada com segurança fica para correção/recaptura: rótulos
ilegíveis, separação espacial grande, layout sem âncora, palavras/números agrupados
em caixas que não permitem distinguir colunas. Linha agregada “SYS DIA PUL” e
linha “120 80 72” não são repartidas em caixas estimadas. Não há promessa universal
de reconhecer layouts de aparelhos. Pulso sem identificação permanece vazio.

Não houve alteração de captura, recorte, rotação, contraste, binarização ou modelo.
O parser exige o quadro já orientado do contrato. Nenhum OpenCV ou dependência nova;
nenhuma ampliação do pré-processamento além da spec §§3.3/6.2.

## Casos sintéticos reproduzíveis

Fixtures somente de texto/caixas, identificadas como sintéticas em
`src/features/assisted-entry/photo-interpretation-examples.ts`:

| Entrada rotulada | Candidatos esperados | Motivo/observação |
|---|---|---|
| SYS 120; DIA 80; PUL 72 | 120 / 80 / 72, basis label | Associação textual explícita |
| SYS: e 120; DIA e 80; PUL e 72 em caixas alinhadas | 120 / 80 / 72, basis layout | Associação espacial ancorada |
| SYS 120; SYS 130; DIA 80 | SYS vazio; DIA 80; pulso vazio | ambiguous-label em SYS |
| SYS sem número; DIA 80 | SYS vazio; DIA 80; pulso vazio | unreadable em SYS, pulso missing |
| 120; 80; 72, sem rótulos | Todos vazios | unidentified-number; não usa ordem/faixa |
| 12:30; 27/10/2026; M 99; SYS 120; DIA 80; 72 bpm | 120 / 80 / 72 | Acessórios excluídos; data/hora da captura preservada |
| SYS 400; DIA 80 | 400 / 80 / vazio | Revisão bloqueia faixa; parser não altera 400 |

Exemplo em TypeScript, sem mídia ou serviço:

```ts
import { interpretPhoto } from '@/domain/interpret-photo';
import { PHOTO_INTERPRETATION_EXAMPLES } from '@/features/assisted-entry/photo-interpretation-examples';

const candidates = interpretPhoto(PHOTO_INTERPRETATION_EXAMPLES.layout);
// fields.systolic = { status: 'candidate', value: 120, basis: 'layout' }
const ambiguous = interpretPhoto(PHOTO_INTERPRETATION_EXAMPLES.uncertain);
// ambiguous.fields.systolic = { status: 'uncertain', reason: 'ambiguous-label' }
```

Essas entradas representam o formato das integrações; **não são dumps de ML Kit
nem transcrições medidas de OCR**. Testam associação condicionada ao texto/caixas
fornecidos. Não medem acurácia do motor, leitura de sete segmentos ou iluminação.
Se o OCR trocar 120 por 128, o parser pode associar corretamente o 128 errado;
revisão explícita e avaliação separada continuam necessárias.

## Verificações efetivas

- **604 testes / 57 suítes aprovados**: associação textual/espacial, ordem do array
  irrelevante, valores à esquerda/abaixo, rótulos repetidos, dois valores possíveis,
  número disputado, acessórios agrupados/separados, pulso ausente, ilegibilidade,
  kPa, inversão/faixas, entrada imutável e confiança sem poder de aprovação.
- Testes da revisão: fixtures passam pelo parser, campos editáveis, parciais e
  incertezas vazios, confirmação bloqueada até correção, data de captura preservada
  e confirmação final em memória. Imports acidentais de writers/auth falham na suíte.
- Ligação Android ao hook/revisão verificada com porta simulada e linhas separadas;
  isso não executa ML Kit, CameraX nem comprova hardware/privacidade nativa.
- Lint, TypeScript raiz e três clientes de avaliação aprovados; exports Web das
  demonstrações de revisão e captura aprovados.
- Chromium: demonstração do parser com posições, parcial, números sem rótulos e
  acessórios percorreu a revisão/confirmou em memória/cancelou, sem requisições
  externas ou exceções observadas. Esse percurso usa entradas sintéticas, sem OCR.
- Chromium 154: integração Web com **Tesseract real** repetida sobre o cartão
  sintético da TASK-08, candidatos 120/80/72 e confirmação em memória. Dois workers
  criados/encerrados, buffer destacado/canvas limpo; nenhuma requisição externa,
  escrita HTTP ou exceção observada. Mesmos limites de privacidade da TASK-08:
  origem sem IndexedDB/Cache API/SW/local/sessionStorage ao final não comprova todo
  armazenamento do navegador/SO. Câmera física indisponível.

Não há taxa de acerto do OCR, corpus reservado, meta/p50/p95 ou benchmark novo.
Casos sintéticos são de desenvolvimento/regressão; não são avaliação final das
TASK-16/20/22 nem validação de dispositivos das TASK-04/06/07/08.

## Executar e demonstrar

```bash
# Na raiz:
npm test -- --runInBand src/domain/interpret-photo.test.ts src/components/bp/PhotoReadingReview.test.tsx src/features/assisted-entry/useAndroidPhotoReview.test.ts
npm run lint
npm run typecheck

cd demos/photo-review
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 ../../node_modules/.bin/expo export --platform web
node serve.mjs
```

Abra **http://localhost:8096**, modalidade fotografia. Os botões de rótulos/números
separados, acessórios, parcial e números sem rótulos executam o parser; não abrem
câmera nem OCR. Edite/cancele/recapture/confirme; confirmar só demonstra estado em
memória. Teste inválido/incerto sem corrigir: confirmação permanece desabilitada.
Dependências da raiz precisam estar instaladas; no PowerShell defina as variáveis
EXPO_OFFLINE/EXPO_NO_TELEMETRY antes do comando de export.

Para o OCR real do cartão sintético, use o cliente e roteiro da
[TASK-08](task-08-captura-web.md) em localhost:8098 e seu verificador
`demos/web-capture/checks/browser-runtime.mjs`. Para CameraX/ML Kit, siga a
[TASK-07](task-07-captura-android.md); compilação/aparelho continuam pendentes.

## Pendências e próxima tarefa

Validar rótulos/caixas/layouts das saídas reais nos aparelhos/navegadores, com
casos acadêmicos próprios rotulados e separação de ajuste/avaliação; não registrar
mídia ou resultados clínicos do produto. Registrar falha de OCR separadamente da
falha de associação. TASK-10/11 continuam pendentes para integração clínica segura;
nenhuma escrita remota foi validada/habilitada nesta tarefa.

Recomenda-se verificar TASK-04/06/07/08 em dispositivo e iniciar TASK-16 com pelo
menos dois modelos de aparelho, antes da comparação TASK-20. Sem Firebase de
produção, regras publicadas, commit, push ou deploy. Nenhuma dependência nova,
serviço/build pago ou gasto contratado; horas/despesas/saldo global não informados.
