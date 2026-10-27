# TASK-11 — preparação local de origens e confirmação

27/10/2026. Branch `feature/task-11-assisted-persistence`, sobre a base `staging`
`7d72cb3`, preservando o trabalho local não commitado das TASK-14 e TASK-10.
**Entrega parcial: não habilita reconhecimento ou gravação assistida no aplicativo.**

## Alterações coordenadas

| Parte | Preparação local |
|---|---|
| Tipos | `ReadingSource = manual / photo / voice`, usado por `Reading` e `ReadingInput` |
| Zod | Enum das três origens; escrita rejeita chaves extras; leituras de sessão rejeitam extras. Faixas, inteiros, datas, nota, campos opcionais e registros antigos com `sessionReadings` ausente/null preservados |
| Security Rules | Aceitam as três origens, mantendo proprietário/provedor Google, campos permitidos, faixas, `createdAt` do servidor/imutável e validação da sessão. `source` também é imutável após criação |
| Repositório | Criação/atualização passam por validação antes do SDK; criação mantém `serverTimestamp`; atualização omite `source` e `createdAt`, preservando ambos no documento existente |
| Confirmação assistida | `createAssistedConfirmation` separa preparação de revisão da única ação que pode invocar escrita, `confirmAndSave`. `prepareAssistedReadingWriter` compõe essa porta com o `addReading` existente, carregado somente ao confirmar |
| Manual e demonstração | Hook manual continua construindo `source: manual`. A demonstração da TASK-10 não importa nem monta a porta clínica; seu resultado continua apenas em memória |
| Índices | `firestore.indexes.json` revisado e mantido: consultas existentes ordenam/filtram por `measuredAt`, sem filtro por origem e sem novo índice composto necessário |

O contrato local conserva **a origem da primeira criação confirmada**. Não reclassifica
o documento durante edição manual de valores/nota/data ou média de duas leituras.
`source` não descreve cada número ou cada leitura da sessão e não constitui auditoria.
Essa é a opção conservadora para a pendência P01 da
[TASK-02](https://github.com/RamonMenz/bp-tracker/blob/7fbe13784afd6b8aee0fea2aa8122150836f1028/docs/revisao-specs.md#p01-origem)
nesta preparação local; não adiciona proveniência por leitura ou migração.
Uma mudança futura dessa semântica exigiria revisar tipos/schema/rules/testes antes
de habilitar a integração. A regra legada que remove `sessionReadings` quando os
números são corrigidos continua no formulário; edição só de nota/data os preserva.

## Confirmação e proteção dos dados

`createAssistedConfirmation` materializa a porta proposta pela TASK-03 sem importar
Firebase ou reconhecedores. É uma instância por fluxo/revisão, com três etapas:

1. `begin(source, provenance)`: associa modalidade e contexto atual à tentativa.
   Só `recognition` é elegível; `synthetic` é bloqueado, mesmo em contexto habilitado.
2. `revise(attemptId, draft)`: revalida os valores editados, copia a data e devolve
   um ticket efêmero da revisão. Não carrega writer nem escreve. Edição inválida
   também invalida qualquer ticket anterior. Só campos clínicos explicitamente
   selecionados entram no retrato; origem vem da modalidade, não do texto do motor.
3. `confirmAndSave(ticket)`: deve ser chamado exclusivamente pelo handler explícito
   de “Confirmar e salvar medição”. Ticket fabricado/repetido/antigo é recusado.
   A trava síncrona precede o primeiro await. Confere UID, identidade da epoch,
   consentimento e habilitação antes e depois da carga do writer; revalida o
   payload antes da chamada ao repositório, sem outro await entre a última checagem
   e a invocação da escrita.

O contexto deve ser fornecido pela futura feature autenticada: `uid`, `epoch`,
`hasConsent` e `persistenceEnabled`. A epoch precisa mudar em logout, novo login
mesmo com UID igual e mudanças/revogação de consentimento. Sem UID, aceite ou
habilitação, a tentativa é recusada. **Nenhuma tela monta essa composição hoje**;
não há ligação a auth/consentimento real nesta entrega. Na homologação futura,
manter `persistenceEnabled=false` até verificar o ambiente e os gates reais.

O chamador deve invocar `cancel()` ao abandonar/recapturar/desmontar o fluxo ou
interrompê-lo em segundo plano. Tickets não são prova criptográfica de gesto;
Security Rules validam acesso/formato, não observam interação humana. A UI futura
não pode confirmar por efeito, resultado final, silêncio ou confiança do motor.

Depois de invocar `addReading`, cancelar ou trocar de conta **não desfaz uma escrita
já enviada ou enfileirada**. A porta suprime ACK da sessão antiga e não muda o UID
original. Uma Promise pendente fica bloqueada para novos envios do mesmo ticket;
não há retry por timeout/reconexão. Em rejeição, um novo envio exige nova revisão
e confirmação explícita. Não há garantia de idempotência após encerrar o processo,
nem comprovação de persistência offline em Android nesta preparação.

Somente sistólica/diastólica/pulso, data, nota digitada, origem e detalhes de sessão
válidos são elegíveis ao documento; criação assistida inicia sessão única (`null`).
Imagem, áudio, transcrição, texto bruto, confiança, candidatos e ticket não são
persistidos. O schema de escrita e as rules rejeitam campos extras; a porta
seleciona campos sem espalhar objetos de reconhecimento. Erros da porta têm
códigos fixos; o repositório não encaminha erro bruto de atualização ao logger.

## Verificações locais executadas

```bash
npm run typecheck
npm run lint
node node_modules/typescript/bin/tsc --noEmit -p demos/photo-review/tsconfig.json
npm test -- --runInBand
```

- **498 testes em 51 suítes aprovados**, incluindo os 454 anteriores e 44 novos.
  Lint, TypeScript da raiz/demo e `git diff --check` aprovados. Locks preservados;
  nenhuma dependência nova.
- Casos cobrem as três origens, documentos antigos, sessões, origem inválida,
  campos extras, projeção no SDK, preservação por omissão no update, manual
  continuando manual, ausência de escrita antes da confirmação, tickets antigos/
  fabricados, edição inválida, duplo toque, cancelamento, troca de UID/epoch,
  consentimento/habilitação, Promise sem ACK, erro seguro e nova confirmação.
- SDK/repositório são substituídos por doubles nos testes que precisam de escrita.
  Isso comprova o comportamento local, **não autorização real de Firestore**.
  Não houve gravação em Firebase remoto.
- Demonstração Web recompilada offline e preservada. Seus testes proíbem importar
  o writer assistido/auth. O bundle exportado não precisa da raiz autenticada.
  Percurso sintético repetido no Chromium 154: cenários, correção, confirmação em
  memória, recaptura e cancelamento aprovados; quatro requisições locais, zero
  externas e zero exceções JavaScript, sem overflow horizontal no viewport móvel.

### Emulador e regras: não executados

Foi tentado executar o Firestore Emulator com Java 21, cache temporário e projeto
fictício explícito `demo-aferi-task11`, sem usar o alias Firebase `staging`:

```bash
FIREBASE_EMULATORS_PATH=/tmp/aferi-emulators FIREBASE_CLI_DISABLE_TELEMETRY=1 \
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec \
  --only firestore --project demo-aferi-task11 \
  "node node_modules/jest/bin/jest.js --config jest.rules.config.js --runInBand"
```

O CLI identificou o projeto demo, mas falhou no download de
`cloud-firestore-emulator-v1.21.0.jar` de `storage.googleapis.com`. As rules
**não foram carregadas/compiladas/executadas pelo emulador**, e seus aceites não
estão comprovados. Não se contornou a restrição de rede.

A suíte foi ampliada com 34 cenários de origem/isolamento/imutabilidade/campos
extras, incluindo criação e update, mídia em sessões, acesso cruzado e anônimo.
TypeScript conferiu os testes, mas isso não valida a linguagem das Security Rules.
`npm run test:rules` agora fixa o projeto `demo-aferi-task11`; quando o JAR puder
ser baixado com segurança, esse é o comando reproduzível. Nada publica regras.

## Integração remota ainda não validada

| Item | Estado e condição para avançar |
|---|---|
| Regras no emulador | Bloqueadas pelo download; executar toda a suíte antes de habilitar |
| Regras/índices remotos | Não publicados, não consultados e não homologados nesta tarefa |
| Auth/consentimento/App Check | Nenhuma ligação real à porta; conferir gates/epoch e projeto isolado |
| Captura/OCR/STT e telas clínicas | Não conectados ao writer; dependem de TASK-04–10/12–15 e habilitação comprovada |
| Confirmação real/ACK/offline | Somente testes isolados; verificar ambiente seguro e dispositivos |
| Preservação do legado em runtime | Regressão automatizada aprovada; ensaio autenticado em Android/Web continua pendente |

TASK-11 permanece aberta, assim como as integrações de TASK-10/TASK-15. A próxima
tarefa recomendada é liberar o download do emulador pelo fluxo de configuração do
ambiente ou executar `npm run test:rules` em uma máquina com acesso permitido,
registrando o resultado antes de conectar qualquer salvamento assistido real.

Para demonstração ao professor, continuar usando o
[roteiro isolado e sintético da TASK-10](./task-10-revisao-fotografia.md), sem writer.
Não houve commit, push, deploy, publicação de regras ou contratação; horas/despesas
reais acumuladas e saldo do teto global de R$300 continuam não informados.
