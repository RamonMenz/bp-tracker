# Prompts de Desenvolvimento — Segunda Medição (AHA) e Onboarding de Técnica

> Prompts autocontidos para dois itens de [`roadmap_futuro.md`](./roadmap_futuro.md) — Sugestão de
> Produto #5 ("Duas medições consecutivas por sessão — protocolo clínico AHA") e Sugestão de
> Produto #7 ("Onboarding com orientação de como medir corretamente"). Cada prompt pode ser colado
> direto numa sessão nova do Claude Code — não depende de memória de conversa anterior, só do
> estado do repositório nesta branch. Mesma convenção dos demais `prompts_*.md`: seguir
> `CLAUDE.md` (TypeScript estrito, sem `any`, `@/` em vez de `../../../`, exports nomeados,
> componente burro/hook esperto, mudanças cirúrgicas, um commit semântico por prompt, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit).
>
> **Por que o item 5 roda ANTES do item 7, mesmo os dois sendo independentes no código:** o
> onboarding (item 7, já parcialmente construído — ver `prompts_onboarding.md`, mesclado) ganha um
> passo novo aqui explicando a técnica de medição, e o texto desse passo referencia a sugestão de
> segunda medição do item 5 ("o app vai te sugerir medir de novo em cerca de 1 minuto"). Se o
> onboarding for escrito primeiro, esse texto descreveria uma funcionalidade que ainda não existe —
> melhor implementar o comportamento real primeiro e documentá-lo depois.
>
> **Escopo do item 5, decidido aqui para não ficar em aberto em cada prompt:**
> - **Sem mudança de modelo de dados.** As duas medições da sessão continuam sendo salvas como
>   duas `readings` normais e independentes — mesmo schema Zod, mesmas `firestore.rules`, sem
>   campo novo de "sessão" ou "vínculo entre leituras". A média das duas é calculada e mostrada só
>   no CLIENTE, na hora, e nunca persistida. Isso é o que o roadmap já pedia ("pequena extensão de
>   UX... não uma reescrita") e evita todo o custo de CLAUDE.md §3.3/§4.4 (revisão de rules e
>   índices) que uma mudança de modelo exigiria.
> - **Nunca bloqueia.** O contador de ~1 minuto entre as duas medições é uma SUGESTÃO visual, não
>   um bloqueio — o botão de salvar a segunda medição funciona a qualquer momento, mesmo com o
>   contador ainda rodando. Travar o formulário até o tempo passar contrariaria o objetivo central
>   do app (registro em ≤10s, CLAUDE.md §1) para quem só quer uma medição rápida de qualquer jeito.
> - **Opt-in, nunca automático.** A segunda medição só acontece se o usuário tocar em "Medir
>   novamente" depois de salvar a primeira. Ignorar a sugestão (ou tocar em "Não, obrigado") deixa
>   o app exatamente como está hoje — um usuário que nunca reparar nessa funcionalidade não muda
>   nada no fluxo dele.
>
> | Modelo | Quando usar aqui |
> |---|---|
> | **Claude Sonnet 5** | Lógica bem especificada (função pura, máquina de estados) sem decisão de
> UX em aberto — o "o quê" já está fechado no prompt, falta só o "como". |
> | **Claude Opus 5** | Composição visual nova na tela (banner, contador, card de resumo) ou texto
> de orientação clínica que precisa manter o tom "registra, não diagnostica" do app. |

---

## Item 5 — Duas medições consecutivas por sessão

### Prompt 5.1 — Função pura `computeSessionAverage`

```
Contexto: no BP Tracker, vamos permitir uma segunda medição opcional logo após a primeira (protocolo
AHA: duas medições com 1-2 min de intervalo, reportando a média). Este prompt cobre só o cálculo —
uma função pura, sem I/O, sem React — que os prompts seguintes vão usar. Ver roadmap_futuro.md,
Sugestão de Produto #5.

Tarefa:
1. Crie src/domain/session-average.ts (CLAUDE.md §3.2: src/domain/ é lógica pura, testável sem
   emulador, mesmo lugar de bp-classification.ts):
   export interface SessionReading {
     systolic: number;
     diastolic: number;
     pulse: number | null;
   }
   export function computeSessionAverage(first: SessionReading, second: SessionReading): SessionReading
   - systolic/diastolic: média das duas, arredondada com Math.round — MESMA regra de arredondamento
     já usada em src/features/readings/useReadingsTrend.ts (função average() local daquele
     arquivo); não invente uma regra nova.
   - pulse: só calcula a média se OS DOIS tiverem pulso registrado (nenhum dos dois é null).
     Se qualquer um dos dois for null, o resultado é null — não faz sentido "completar" um pulso
     que não foi medido com o valor do outro. Documente essa decisão no comentário da função, é
     fácil alguém "corrigir" isso sem entender o motivo.
2. Teste src/domain/session-average.test.ts, cobrindo: média exata sem arredondamento (ex.: 120 e
   130 → 125), média que EXIGE arredondamento (ex.: 120 e 121 → deve arredondar, confirme para
   qual lado com Math.round — 120.5 arredonda para 121), pulso presente nos dois, pulso ausente em
   um dos dois (resultado null), pulso ausente nos dois (resultado null), ordem dos argumentos não
   importa (o resultado é o mesmo com first/second trocados, já que é uma média simples).
3. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): calcular a média de uma sessão de duas medições
```

**Modelo recomendado:** Claude Sonnet 5 — função matemática pequena com regras já fechadas no
prompt (arredondamento, tratamento de pulso ausente), sem decisão de projeto em aberto.

---

### Prompt 5.2 — Hook `useSecondMeasurementFlow` (máquina de estados)

```
Contexto: no BP Tracker, o Prompt 5.1 já criou computeSessionAverage. Este prompt cria o hook que
orquestra o fluxo de "sugerir uma segunda medição" — SEM nenhuma UI ainda, só o estado. A tela
(Prompt 5.3) vai consumir este hook. Ver roadmap_futuro.md, Sugestão de Produto #5, e o cabeçalho
deste arquivo de prompts para as decisões de escopo já tomadas (sem bloqueio, opt-in, sem mudança
de modelo de dados).

Tarefa:
1. Crie src/features/readings/useSecondMeasurementFlow.ts:
   export type SecondMeasurementState = 'idle' | 'offer' | 'measuring' | 'summary';
   export interface UseSecondMeasurementFlowResult {
     state: SecondMeasurementState;
     /** Segundos restantes da sugestão de espera, nunca negativo. Só é relevante em 'offer' e
      *  'measuring' — é 0 nos outros dois estados. NUNCA usado para desabilitar nada; é só o texto
      *  do contador. */
     secondsRemaining: number;
     /** Preenchido a partir de 'summary' em diante (computeSessionAverage do Prompt 5.1); null nos
      *  outros estados. */
     average: SessionReading | null;
     /** Chame depois de qualquer medição salva com sucesso, com os valores JÁ CONVERTIDOS para
      *  número (a tela snapshot os campos do formulário ANTES do submit assíncrono, porque
      *  useReadingForm limpa os campos para '' assim que salva com sucesso — ver Prompt 5.3). Esta
      *  função decide sozinha o que fazer com o estado atual: em 'idle', vira a primeira medição da
      *  sessão (idle→'offer', dispara o contador); em 'measuring', vira a segunda (calcula a média,
      *  measuring→'summary'); em qualquer outro estado (a UI não deveria chamar nesses casos, mas
      *  não lance) é NO-OP.
      */
     handleReadingSaved: (reading: SessionReading) => void;
     /** offer→'measuring'. Não reinicia o contador — ele já está rodando desde a primeira medição,
      *  o tempo "sugerido" é entre as duas medições, não entre o toque no botão e a segunda. */
     acceptSecondMeasurement: () => void;
     /** De 'offer' OU 'measuring' de volta para 'idle', descartando tudo (a primeira medição já
      *  está salva no Firestore de qualquer forma — só o ESTADO DA SESSÃO no cliente é
      *  descartado). Disponível nos dois estados: o usuário pode desistir depois de já ter aceito. */
     decline: () => void;
     /** 'summary'→'idle'. Fecha o card de resumo depois que o usuário já viu a média. */
     dismissSummary: () => void;
   }
   export function useSecondMeasurementFlow(): UseSecondMeasurementFlowResult
2. Constante no topo do arquivo:
   /** Sugestão de intervalo entre as duas medições — piso da faixa "1-2 minutos" do protocolo AHA,
    *  para não testar a paciência de quem só queria uma segunda leitura rápida. NUNCA bloqueia
    *  (ver cabeçalho de prompts_segunda_medicao_e_onboarding_tecnica.md) — é só o texto do
    *  contador. */
   const SUGGESTED_INTERVAL_SECONDS = 60;
3. O contador roda com setInterval de 1s dentro de um useEffect, ativo enquanto state for 'offer'
   OU 'measuring' — pare e limpe o interval (retorno do useEffect, CLAUDE.md §3.4: todo listener
   precisa de cleanup) ao sair dos dois, e nunca deixe secondsRemaining passar de 0 para negativo
   (Math.max(0, ...) a cada tick).
4. Guarde a primeira medição (recebida em handleReadingSaved durante 'idle') num state interno só
   para poder calcular a média quando a segunda chegar — não precisa ser exposta no resultado do
   hook.
5. Teste src/features/readings/useSecondMeasurementFlow.test.ts (@testing-library/react-hooks ou
   o padrão de teste de hook já usado no projeto — confira como useReminderSettings.ts ou outro
   hook com estado interno é testado hoje e siga o mesmo utilitário). Use jest.useFakeTimers()
   para controlar o contador sem esperar de verdade. Cubra:
   - idle → handleReadingSaved(A) → state vira 'offer', secondsRemaining começa em 60.
   - offer → acceptSecondMeasurement() → state vira 'measuring', secondsRemaining NÃO reinicia
     (continua contando de onde estava, não volta para 60).
   - measuring → handleReadingSaved(B) → state vira 'summary', average é
     computeSessionAverage(A, B) — teste com valores que tornem o resultado esperado óbvio de
     conferir.
   - avançar o tempo com jest.advanceTimersByTime além de 60s → secondsRemaining fica em 0, nunca
     negativo, e o estado não muda sozinho (o contador chegar a zero não força transição nenhuma).
   - decline() a partir de 'offer' e a partir de 'measuring' → os dois voltam para 'idle', com
     secondsRemaining voltando a 0 e o contador parando de rodar (nenhum "vazamento" de interval
     entre sessões — teste que um handleReadingSaved(A) depois de um decline anterior recomeça
     limpo em 60, não continua de onde parou).
   - dismissSummary() a partir de 'summary' → volta para 'idle', average volta a null.
   - handleReadingSaved chamado em 'offer' ou em 'summary' (estado em que não deveria fazer nada)
     não lança e não muda o estado.
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): criar máquina de estados da sugestão de segunda medição
```

**Modelo recomendado:** Claude Sonnet 5 — a máquina de estados está inteiramente especificada
neste prompt (estados, transições, o que cada uma faz); é implementação mecânica de uma spec
fechada, não desenho de UX.

---

### Prompt 5.3 — UI: banner de sugestão, contador e card de resumo na Home

```
Contexto: no BP Tracker, os Prompts 5.1 e 5.2 já criaram computeSessionAverage e
useSecondMeasurementFlow. Este prompt liga isso à tela de registro (app/(app)/index.tsx), a
mesma tela que já usa ReadingForm e LastReadingCard. Ver roadmap_futuro.md, Sugestão de Produto #5,
e o cabeçalho deste arquivo de prompts para o tom (calmo, nunca bloqueia, "Medical Clean").

Tarefa:
1. Crie src/components/bp/SecondMeasurementCard.tsx (componente burro, CLAUDE.md §3.4 — só
   recebe props e desenha; nenhum estado de sessão mora aqui, isso é do hook do Prompt 5.2):
   export interface SecondMeasurementCardProps {
     state: SecondMeasurementState; // de useSecondMeasurementFlow, importe o tipo, não duplique
     secondsRemaining: number;
     average: SessionReading | null;
     onAccept: () => void;
     onDecline: () => void;
     onDismissSummary: () => void;
   }
   Três variações dentro do mesmo Card (siga a paleta calma do CLAUDE.md §1 — sem vermelho, sem
   linguagem de alarme):
   - state === 'offer': título curto (ex. "Quer confirmar com uma segunda medição?"), uma linha
     explicando o motivo em tom informativo, não prescritivo (ex.: "O protocolo clínico sugere
     medir de novo em cerca de 1 minuto, para reduzir a variação da primeira leitura" — NÃO
     prometa precisão médica, o app registra, não diagnostica). Mostre o contador só como texto de
     apoio (ex. "Sugestão: aguarde mais {secondsRemaining}s" enquanto > 0, e algo como "Pode medir
     quando quiser" quando chegar a 0 — nunca "Aguarde..." sozinho, que soa como bloqueio). Dois
     botões: "Medir novamente" (variant="secondary", onPress={onAccept}) e "Não, obrigado"
     (variant="ghost", onPress={onDecline}).
   - state === 'measuring': mesmo card, mas o título muda para algo como "Medição 2 de 2" e some o
     botão "Medir novamente" (já foi aceito) — mantém só "Cancelar" (variant="ghost",
     onPress={onDecline}) e o mesmo texto de contador de apoio. ReadingForm continua sendo a MESMA
     instância de sempre (ver item 3 abaixo) — este card só se soma a ela, não a substitui.
   - state === 'summary': título "Média das duas medições", os valores de `average` no MESMO
     estilo do valor grande de LastReadingCard (variant="metric", reaproveite o padrão visual, não
     invente um terceiro jeito de exibir sistólica/diastólica), BpCategoryBadge calculado com
     classifyBloodPressure(average.systolic, average.diastolic), e um texto pequeno deixando claro
     que as duas medições já foram salvas individualmente no histórico (ex.: "As duas medições já
     estão no seu histórico — este resumo não é salvo à parte"). Botão "Concluir"
     (onPress={onDismissSummary}).
   - state === 'idle': o componente não deveria nem ser montado neste estado — na tela (item 3),
     só renderize <SecondMeasurementCard /> quando state !== 'idle'; não implemente um caso 'idle'
     dentro do componente.
   accessibilityRole/accessibilityLabel em cada botão, alvo de toque ≥48dp (os componentes Button/
   Card já garantem isso — não desenhe Pressable cru aqui).
2. Teste SecondMeasurementCard.test.tsx (comportamental, CLAUDE.md §4.6): cada estado mostra o
   texto/botões certos, onAccept/onDecline/onDismissSummary disparam ao tocar o botão certo.
3. Em app/(app)/index.tsx (RecordScreen):
   - Chame useSecondMeasurementFlow() ao lado dos outros hooks já existentes (useReadingForm,
     useLastReading).
   - No handler de submit atual (hoje `onSubmit={() => void form.submit()}`), ANTES de chamar
     form.submit(), tire um retrato dos valores validados:
     const snapshot: SessionReading = {
       systolic: Number(form.systolic),
       diastolic: Number(form.diastolic),
       pulse: form.pulse === '' ? null : Number(form.pulse),
     };
     ISSO TEM QUE SER FEITO ANTES do await — useReadingForm limpa os campos para '' assim que o
     submit tem sucesso (modo criação), então ler form.systolic DEPOIS do await pegaria string
     vazia. Só chame flow.handleReadingSaved(snapshot) se form.submit() resolver true.
   - Renderize <SecondMeasurementCard ... /> entre o ReadingForm e o LastReadingCard (ou onde
     ficar visualmente melhor sem empurrar o formulário para fora da primeira dobra em 'idle' — em
     'idle' o card não existe, então isso só importa quando ele já apareceu) quando
     flow.state !== 'idle', passando os props do hook direto.
4. NÃO mexa em src/components/bp/ReadingForm.tsx nem em useReadingForm.ts — a mesma instância de
   sempre serve para a segunda medição também (os campos já nascem vazios de novo depois do
   primeiro save). O único ponto de mudança é a orquestração em index.tsx.
5. Confirme manualmente o fluxo (ou cubra num teste de integração leve de
   __tests__/app/(app)/index.test.tsx se esse arquivo já existir): salvar 1ª medição → aparece o
   card 'offer' → "Medir novamente" → card vira 'measuring', formulário continua editável e vazio
   → salvar 2ª medição → card vira 'summary' com a média certa → "Concluir" → tudo some, formulário
   pronto para uma medição comum de novo.
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): sugerir e resumir uma segunda medição na tela de registro
```

**Modelo recomendado:** Claude Opus 5 — composição visual nova (três variações de um card dentro
do fluxo mais visitado do app) com risco real de contradizer o tom "calmo, não alarmista" do
CLAUDE.md §1 se o texto ficar prescritivo demais; exige julgamento de produto, não só seguir uma
spec de estados já fechada.

---

## Item 7 — Onboarding: novo passo de técnica de medição

### Prompt 7.1 — Passo "Como medir corretamente" no onboarding

```
Contexto: no BP Tracker, src/screens/OnboardingScreen.tsx já existe e tem 3 passos (bem-vindo(a) +
funcionalidades, categorias, pronto para começar — ver prompts_onboarding.md, já mesclado). Falta o
conteúdo que deu nome ao item original do roadmap: orientação de COMO MEDIR corretamente (repouso,
postura, braço). Depois do item 5 (Prompts 5.1-5.3, já rodados antes deste), o app agora sugere uma
segunda medição — o texto deste passo pode e deve mencionar isso, já que descreve um comportamento
real do app, não uma promessa futura. Ver roadmap_futuro.md, Sugestão de Produto #7.

Tarefa:
1. Em src/screens/OnboardingScreen.tsx:
   - Troque TOTAL_STEPS de 3 para 4 e STEP_NUMBERS para [1, 2, 3, 4].
   - IMPORTANTE: o bloco do passo final ("Pronto para começar") está hoje condicionado a
     `step === 3` (literal, não `step === TOTAL_STEPS`) — troque para `step === TOTAL_STEPS` (o
     bloco do RODAPÉ com os botões finais já usa `step === TOTAL_STEPS` corretamente; só o bloco de
     CONTEÚDO do passo 3 está com o número fixo — são dois lugares diferentes no arquivo,
     confirme os dois antes de considerar terminado).
   - Insira o novo passo como o PASSO 2 (entre "bem-vindo(a) + funcionalidades" e "categorias"),
     empurrando o antigo passo 2 (categorias) para 3 e o antigo passo 3 (pronto para começar) para
     4 — troque as condições `step === 2` → `step === 3` no bloco de categorias existente.
   - Conteúdo do novo `step === 2`: título curto (ex. "Como medir corretamente"), e uma lista de 4
     orientações curtas, cada uma com um ícone (reaproveite ActivityIcon ou outro já existente em
     components/ui/icons.ts que fizer sentido semanticamente — não importe um ícone novo sem
     necessidade real) + uma frase objetiva, SEM linguagem prescritiva/médica (CLAUDE.md §1: o app
     registra, não diagnostica — estas são orientações práticas de uso do aparelho, não indicação
     clínica):
     1. Descanse 5 minutos sentado(a) e em silêncio antes de medir.
     2. Apoie o braço na altura do coração, com a palma da mão para cima.
     3. Mantenha os pés apoiados no chão, sem cruzar as pernas.
     4. Se for medir de novo, espere cerca de 1 minuto — o app sugere isso automaticamente depois
        da primeira medição.
     Use o MESMO Card único com gap entre itens que o passo 1 (FEATURES) já usa — não invente um
     layout novo; é a mesma estrutura (ícone em pastilha + título + descrição), então reaproveite o
     padrão, idealmente extraindo o item de lista repetido (ícone + título + descrição) para um
     componente interno pequeno do próprio arquivo se isso evitar duplicar JSX entre os dois passos
     (CLAUDE.md §3.2 não permite duplicar estrutura visual repetida sem necessidade) — mas SEM
     misturar os dois arrays de conteúdo (FEATURES continua só do passo 1).
2. Em src/screens/OnboardingScreen.test.tsx:
   - Ajuste os testes que hoje assumem 3 passos (ex.: "avança do passo 1 ao 3 tocando 'Próximo'
     duas vezes" precisa virar três toques até o passo 4; o texto esperado no passo final
     precisa continuar sendo "Pronto para começar", agora no passo 4).
   - Ajuste o teste "não oferece 'Voltar' no passo 3" (que hoje testa o ÚLTIMO passo) para o passo
     4, já que o último passo mudou de número.
   - Adicione um teste cobrindo que o novo passo 2 mostra as 4 orientações (ou pelo menos os
     textos-chave de cada uma) e que ele fica entre o passo 1 e o antigo passo de categorias
     (agora passo 3).
3. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(onboarding): adicionar passo de técnica de medição correta
```

**Modelo recomendado:** Claude Opus 5 — mexe numa tela já publicada com risco real de regressão
(renumeração de passos, dois lugares diferentes com a condição do passo final) e escreve conteúdo
de orientação clínica que precisa manter o tom não-prescritivo do CLAUDE.md §1 — mesmo critério do
Prompt 2 original de `prompts_onboarding.md`.

---

## Ordem de execução

1. **Prompt 5.1** (Sonnet 5) → **Prompt 5.2** (Sonnet 5) → **Prompt 5.3** (Opus 5) — sequenciais,
   cada um depende do anterior (função pura → hook que a usa → tela que usa o hook).
2. **Prompt 7.1** (Opus 5) — só depois que o item 5 estiver completo (os 3 prompts acima rodados),
   porque o texto do novo passo do onboarding menciona a sugestão automática de segunda medição.
   Rodar 7.1 antes deixaria essa frase descrevendo uma funcionalidade que ainda não existe.

Nenhuma mudança em `firestore.rules`, schema Zod ou `firestore.indexes.json` é necessária em
nenhum dos quatro prompts — os dois itens são inteiramente client-side, sobre dado que já existe.

Cada prompt termina em UM commit. Depois de rodar os que quiser, revise o diff acumulado e faça
`git push` (ou peça para eu fazer) — não faço push automático de nenhum destes sem você pedir.
