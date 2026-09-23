# Prompts de Desenvolvimento — Registrar, Histórico e Ajustes

> Prompts autocontidos para os itens levantados numa auditoria de uso das três abas do app
> (Registrar, Histórico, Ajustes) — dois bugs reais encontrados na investigação (mensagem de erro
> crua ao ativar notificações na web; link "Como usar o app" pouco visível em Ajustes) e quatro
> melhorias de UX (accordion de pulso/observação; segunda medição por pop-up salvando só a média;
> linhas de grade no gráfico; pop-up de range de datas na exportação de CSV). Cada prompt pode ser
> colado direto numa sessão nova do Claude Code — não depende de memória de conversa anterior, só
> do estado do repositório nesta branch. Seguir `CLAUDE.md` (TypeScript estrito, sem `any`, Zod
> para dado do Firestore, `@/` em vez de `../../../`, exports nomeados, componente burro/hook
> esperto, mudanças cirúrgicas, um commit semântico por prompt, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit).
>
> **Escopo decidido de antemão, para não ficar em aberto em cada prompt:**
> - **Segunda medição (Item D): o pop-up NÃO pede horário.** Só sistólica, diastólica e pulso — o
>   horário salvo continua sendo o da primeira leitura da sessão (decisão de produto já tomada,
>   não reabra essa discussão nos prompts 4.x).
> - **Segunda medição: passa a salvar UM documento por sessão, não dois.** Hoje
>   (`useSecondMeasurementFlow.ts`) as duas leituras vão para o Firestore separadamente e a média é
>   só exibida. Isso muda: a segunda medição atualiza (via `updateReading`) o MESMO documento da
>   primeira, substituindo os valores pela média — nunca cria um segundo documento. É mais fiel ao
>   protocolo AHA (que já recomenda reportar a média de duas leituras de uma sessão, não duas
>   leituras independentes) e evita o histórico/gráfico contarem a mesma sessão duas vezes.
> - **Sem dependência nova.** Todos os pop-ups usam `Modal` do React Native, no mesmo molde de
>   `src/components/ui/ConfirmDialog.tsx` — já resolve web e nativo, não precisa de biblioteca de
>   modal/bottom-sheet.
> - **Sem mudança de schema Zod nem de `firestore.rules`.** Nenhum item introduz campo novo no
>   documento `Reading` — a segunda medição SUBSTITUI valores existentes com o mesmo formato de
>   sempre, e o range de export só filtra o que já existe.
>
> | Modelo | Quando usar aqui |
> |---|---|
> | **Claude Sonnet 5** | Mudança de lógica/dados bem especificada neste prompt (contrato de
> função, máquina de estados, query), ou composição visual que replica um padrão já existente no
> app com fidelidade (`ConfirmDialog`, a linha "Política de privacidade", os campos de
> `ReadingForm`) — sem decisão de tom/conteúdo nova. |
> | **Claude Opus 5** | Único caso aqui: o pop-up de segunda medição (Prompt 4.3) mexe no fluxo
> mais visitado do app, muda o texto do card de resumo (que precisa manter o tom "registra, não
> diagnostica" do CLAUDE.md §1) e decide como tratar erro de salvamento numa tela sem precedente
> igual — risco real de regressão de UX, exige julgamento, não só seguir uma spec fechada. |

---

## Item A — Ajustes: mensagem de erro crua ao ativar notificações na web

### Prompt 1 — Cobrir `getMessagingInstance()` pelo try/catch de `registerPushToken.web.ts`

```
Contexto: no BP Tracker, ao tentar ativar notificações (Ajustes → switch "Notificações"), o
usuário às vezes recebe uma mensagem de erro que não é amigável — quebra o CLAUDE.md §4.3 ("nunca
exponha error.message cru"). A causa: em src/features/reminders/registerPushToken.web.ts, a linha
`const messaging = await getMessagingInstance();` (e a leitura de `Constants.expoConfig?.extra`
logo abaixo) rodam ANTES do bloco try/catch da função — se getMessagingInstance() (definida em
src/services/firebase/firebase.web.ts, chama getMessaging(app) internamente) rejeitar por qualquer
motivo além dos dois já tratados (WEB_NOT_SUPPORTED_MESSAGE, VAPID_KEY_MISSING_MESSAGE), a exceção
crua do Firebase escapa direto para useReminderSettings.ts::toggleNotifications, que faz
setError(registerError.message) sem tradução nenhuma.

Tarefa:
1. Em src/features/reminders/registerPushToken.web.ts, mova a chamada a getMessagingInstance() e a
   leitura de Constants.expoConfig?.extra para DENTRO do bloco try já existente (o que hoje começa
   em `await ensureNotificationPermission();`) — a função inteira passa a ter um único try, do
   início ao fim.
2. Mantenha os dois throws de mensagem específica exatamente como estão hoje
   (WEB_NOT_SUPPORTED_MESSAGE quando messaging === null; VAPID_KEY_MISSING_MESSAGE quando
   firebaseConfig/vapidKey estiverem ausentes) — eles continuam sendo re-lançados como Error com a
   MESMA mensagem amigável, só que agora de dentro do try. Qualquer outra exceção (incluindo uma
   rejeição de getMessagingInstance() que hoje escapava crua) deve cair no catch existente e virar
   GENERIC_MESSAGE, exatamente como já acontece com o restante da função.
3. Confirme que PERMISSION_DENIED_MESSAGE continua sendo relançado sem alteração (o catch já tem
   essa checagem — não duplique a lógica, só garanta que ela ainda cobre os throws que agora vêm de
   mais cedo na função).
4. Audite rapidamente src/features/reminders/registerPushToken.native.ts e
   src/features/reminders/reminders.repo.ts::writeReminderSettings — confirme que NÃO têm o mesmo
   padrão (await antes do try) e não precisam do mesmo ajuste. Não mexa neles se já estiverem
   corretos; se encontrar o mesmo problema em algum, corrija do mesmo jeito e mencione no commit.
5. Teste: se já existir um arquivo de teste para registerPushToken.web.ts, adicione um caso
   cobrindo que uma rejeição de getMessagingInstance() (mock lançando um Error com mensagem
   arbitrária, não uma das mensagens conhecidas) resulta na Error final tendo a mensagem
   GENERIC_MESSAGE ('Não foi possível ativar as notificações. Tente novamente.'), nunca a mensagem
   original do mock. Se não existir arquivo de teste para este módulo, crie
   registerPushToken.web.test.ts cobrindo esse caso e os dois throws de mensagem específica
   (mocke firebase/messaging, navigator.serviceWorker.register e Notification do jsdom conforme o
   que for preciso para isolar a função).
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(reminders): não deixar erro cru do Firebase Messaging escapar ao ativar notificações na web
```

**Modelo recomendado:** Claude Sonnet 5 — bug isolado e totalmente especificado (mover código para
dentro de um try existente, sem decisão de projeto nova).

---

## Item B — Ajustes: "Como usar o app" ganha card próprio e mais destaque

### Prompt 2 — Card "Ajuda" em `app/(app)/settings.tsx`

```
Contexto: no BP Tracker, o link "Como usar o app" (reabre o onboarding manualmente) vive hoje
dentro do Card "Conta" em app/(app)/settings.tsx, entre o botão "Sair" e o bloco de "Excluir minha
conta" — um texto simples (Text variant="body", sem cor, sem ícone) espremido entre uma ação de
sessão e um bloco visualmente pesado de exclusão de conta. Isso o torna fácil de não notar ao olhar
rápido para a tela (ao contrário de "Política de privacidade", no Card "Privacidade" logo abaixo,
que já tem destaque: texto azul, negrito, com chevron). Vamos dar a ele um card próprio, na mesma
altura visual de "Política de privacidade".

Tarefa:
1. Em src/components/ui/icons.ts, adicione (seguindo o padrão de import um a um já usado no
   arquivo, ordem alfabética pelo nome exportado):
   export { default as CircleHelpIcon } from 'lucide-react-native/icons/circle-help';
   (confira o nome exato do arquivo do ícone em node_modules/lucide-react-native/icons/ antes de
   escrever o import — use circle-help.js se existir; se o pacote instalado nomear diferente,
   ajuste o caminho e o nome exportado de acordo, mantendo o sufixo Icon.)
2. Em app/(app)/settings.tsx:
   - Remova o Pressable de "Como usar o app" (e o comentário que o acompanha) de dentro do Card
     "Conta" — ele fica só com "Sair" (+ signOutError) e o bloco de excluir conta.
   - Crie um novo <Card className="gap-4"> com <SectionHeader title="Ajuda" icon={CircleHelpIcon} />,
     posicionado depois do Card "Aparência" e antes do Card "Conta" (mesma ordem de import de
     ícones já existente no topo do arquivo — adicione CircleHelpIcon à lista importada de
     '@/components/ui/icons').
   - Dentro do novo card, o mesmo Pressable de antes, mas com o MESMO padrão visual da linha
     "Política de privacidade" do Card "Privacidade" (não o padrão anterior, mais discreto): texto
     em palette.primary, fontWeight 600, ChevronRightIcon também em palette.primary. Mantenha
     accessibilityRole="button", accessibilityLabel="Como usar o app" e onPress={handleOpenOnboarding}
     exatamente como já são hoje — NÃO mude a função handleOpenOnboarding nem a navegação
     (continua router.push('/onboarding'), sem markOnboardingSeen, sem passar por
     useOnboardingGate).
3. NÃO mexa em nenhuma outra lógica da tela (lembretes, tema, exclusão de conta, política de
   privacidade) além de mover este bloco e importar o ícone novo.
4. Em __tests__/app/(app)/settings.test.tsx, o teste existente 'navega para /onboarding ao tocar em
   "Como usar o app"' (describe 'SettingsScreen — atalho para reabrir o onboarding') já localiza o
   elemento por accessibilityRole/name, não por posição — confirme que ele continua passando sem
   alteração. Se algum teste da suíte quebrar por causa da reorganização de Cards, ajuste só o que
   for estritamente necessário para refletir a nova estrutura, sem reescrever testes que não
   dependem da posição do link.
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
refactor(settings): dar destaque próprio ao link "Como usar o app" num card "Ajuda"
```

**Modelo recomendado:** Claude Sonnet 5 — reorganização mecânica que replica com fidelidade um
padrão visual já existente na mesma tela ("Política de privacidade"), sem decisão de UX nova.

---

## Item C — Registrar: accordion para pulso e observação

### Prompt 3 — Trocar o botão "Adicionar pulso e observação" por um disclosure que abre e fecha

```
Contexto: no BP Tracker, src/components/bp/ReadingForm.tsx esconde os campos de pulso e observação
atrás de um Pressable com ícone "+" ("Adicionar pulso e observação") que some assim que tocado —
depois de aberto, não existe mais nenhum controle para fechar os campos de novo. É uma revelação de
mão única disfarçada de botão de ação; o pedido é um accordion de verdade (cabeçalho sempre
visível, abre E fecha).

Tarefa:
1. Em src/components/ui/icons.ts, adicione (ordem alfabética, mesmo padrão de import já usado):
   export { default as ChevronDownIcon } from 'lucide-react-native/icons/chevron-down';
   (confira o nome exato do arquivo em node_modules/lucide-react-native/icons/ antes de escrever o
   import, como no Prompt 2.)
2. Em src/components/bp/ReadingForm.tsx:
   - Troque o Pressable dashed (linhas ~118-130 na versão atual, o que só existe quando
     `!areOptionalFieldsOpen`) por um cabeçalho de disclosure SEMPRE renderizado, aberto ou
     fechado: Pressable com accessibilityRole="button", accessibilityLabel="Pulso e observação"
     (ou similar), accessibilityState={{ expanded: areOptionalFieldsOpen }},
     onPress={() => setAreOptionalFieldsOpen((open) => !open)}, alvo de toque ≥48dp (mesma classe
     min-h-[48px] já usada). Texto "Pulso e observação" (Text variant="body") + ChevronDownIcon à
     direita, que gira 180° quando aberto (style={{ transform: [{ rotate: areOptionalFieldsOpen ?
     '180deg' : '0deg' }] }} no próprio ícone — sem Animated, uma troca de estilo simples já
     resolve; não adicione biblioteca de animação para isso).
   - O bloco de campos (pulso + observação) continua condicionado a `areOptionalFieldsOpen`,
     exatamente como hoje, mas agora renderizado LOGO ABAIXO do cabeçalho de disclosure, que nunca
     desaparece — abrir mostra os campos, tocar de novo (no mesmo cabeçalho) esconde.
   - Mantenha a regra de estado inicial sem alteração: `useState(() => form.pulse !== '' ||
     form.note !== '')` — abre sozinho na edição de uma medição que já tem esses dados.
3. Confirme que nenhum outro teste de src/components/bp/ReadingForm* (se existir) ou de
   __tests__/app/(app)/index.test.tsx dependia do rótulo antigo "Adicionar pulso e observação" —
   ajuste as asserções para o novo rótulo (screen.getByLabelText/getByRole com o texto/label que
   você escolher no item 2, usado de forma consistente nos dois lugares). O teste
   'esconde pulso e observação até o usuário tocar em "Adicionar pulso e observação"' em
   __tests__/app/(app)/index.test.tsx precisa ser atualizado para o novo rótulo e, se fizer
   sentido, para também cobrir que tocar de novo no mesmo controle esconde os campos outra vez
   (adicione essa segunda asserção ao teste em vez de só renomear o rótulo).
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(ui): transformar pulso e observação em accordion que abre e fecha
```

**Modelo recomendado:** Claude Sonnet 5 — comportamento inteiramente especificado neste prompt
(o que abre, o que fecha, o rótulo, o ícone), implementação mecânica sobre um componente existente.

---

## Item D — Registrar: segunda medição por pop-up, salvando só a média

### Prompt 4.1 — `addReading` devolve o id criado; `submit()` devolve `{ success, readingId }`

```
Contexto: no BP Tracker, os Prompts 4.2 e 4.3 (a seguir) vão precisar saber o ID do documento da
PRIMEIRA medição de uma sessão, para depois atualizá-lo com a média da segunda — hoje
src/features/readings/readings.repo.ts::addReading devolve void, e
src/features/readings/useReadingForm.ts::submit() devolve só um boolean. Este prompt muda os dois
contratos, na base da pilha, ANTES de qualquer lógica de segunda medição — os Prompts 4.2/4.3 só
fazem sentido depois deste.

Tarefa:
1. Em src/features/readings/readings.repo.ts:
   - Troque `export async function addReading(uid: string, input: ReadingInput): Promise<void>`
     para `Promise<string>`, devolvendo o id do documento criado:
     `const docRef = await addDoc(collection(firestore, readingsCollectionPath(uid)), payload);
     return docRef.id;` — mantenha o try/catch e as mensagens de erro exatamente como estão.
2. Em src/features/readings/useAddReading.ts:
   - Troque `addReading: (values: ReadingFormValues) => Promise<boolean>` para
     `Promise<string | false>` na interface UseAddReadingResult.
   - No corpo, troque os `return false;`/`return true;` de sucesso: os `return false;` de
     validação/sessão continuam iguais; o `return true;` depois de `await persistReading(...)`
     vira `const readingId = await persistReading(user.uid, input); return readingId;` (persistReading
     é o import local de addReading do repo — confira o nome do import no arquivo atual antes de
     editar).
3. Em src/features/readings/useReadingForm.ts:
   - Troque a assinatura de `submit` na interface UseReadingFormResult:
     `submit: () => Promise<{ success: boolean; readingId: string | null }>;`
     Documente no comentário: `readingId` só é preenchido em modo CRIAÇÃO com sucesso; é `null` em
     modo edição ou em qualquer falha.
   - Reescreva a função `submit()`:
     ```
     async function submit(): Promise<{ success: boolean; readingId: string | null }> {
       const values = { systolic, diastolic, pulse, note, measuredAt };

       if (initialReading !== undefined) {
         const success = await update.updateReading(initialReading.id, values);
         return { success, readingId: null };
       }

       const result = await add.addReading(values);
       const success = result !== false;

       if (success) {
         await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
         setSystolic('');
         setDiastolic('');
         setPulse('');
         setNote('');
         setMeasuredAt(new Date());
       }

       return { success, readingId: success ? result : null };
     }
     ```
     (mantenha o comentário já existente sobre por que só o modo criação limpa os campos.)
4. Atualize os DOIS call sites existentes de `form.submit()`:
   - app/(app)/index.tsx::handleSubmit — troque `if (await form.submit()) { flow.handleReadingSaved(snapshot); }`
     por `const { success } = await form.submit(); if (success) { flow.handleReadingSaved(snapshot); }`
     (o Prompt 4.2 vai voltar a mexer nesta função para também usar `readingId` — não implemente
     isso ainda aqui, só ajuste a desestruturação para não quebrar o build).
   - app/(app)/edit-reading/[id].tsx::EditReadingFormCard::handleSave — troque
     `const success = await form.submit(); if (success) { router.back(); }` por
     `const { success } = await form.submit(); if (success) { router.back(); }`.
5. Atualize os testes que hoje tratam `submit()` como boolean:
   - src/features/readings/useReadingForm.test.ts: TODO teste que faz
     `await result.current.submit()` esperando um boolean direto (ex.: "mantém os campos
     preenchidos depois de salvar", "não limpa nada quando a atualização falha") precisa
     desestruturar `{ success }` do retorno em vez de comparar a promise inteira a
     true/false. Ajuste também o teste "repassa o texto digitado para addReading no submit" e os
     de modo criação/edição — releia cada `await result.current.submit()` do arquivo e ajuste a
     asserção correspondente.
   - __tests__/app/(app)/index.test.tsx: `submitMock` é tipado como
     `jest.fn<Promise<boolean>, []>()` e usa `submitMock.mockResolvedValue(true)`/`(false)` — troque
     o tipo para `jest.fn<Promise<{ success: boolean; readingId: string | null }>, []>()` e os
     mocks para `mockResolvedValue({ success: true, readingId: 'reading-1' })` /
     `{ success: false, readingId: null }` conforme o caso de cada teste.
   - Se existir teste de app/(app)/edit-reading/[id].tsx ou de useAddReading.ts, ajuste da mesma
     forma (retorno agora é string | false, não boolean).
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
refactor(readings): addReading e submit() devolvem o id do documento criado
```

**Modelo recomendado:** Claude Sonnet 5 — mudança de contrato mecânica e totalmente especificada
(assinaturas, corpo das funções, os dois call sites, os testes a ajustar), sem decisão de projeto
nova.

---

### Prompt 4.2 — `useSecondMeasurementFlow` passa a persistir a média (via `updateReading`), não duas leituras

```
Contexto: no BP Tracker, o Prompt 4.1 já fez addReading/submit() devolverem o id da medição criada.
Este prompt reescreve src/features/readings/useSecondMeasurementFlow.ts para, ao receber a segunda
medição, ATUALIZAR o documento da primeira leitura com a média das duas (via useUpdateReading),
em vez de só calcular a média para exibição — hoje as duas leituras continuam salvas separadamente
no Firestore, o que o produto não quer mais (ver decisão de escopo no topo deste arquivo). Ainda
SEM pop-up nesta etapa — isso é o Prompt 4.3, que vai consumir o que este prompt expõe.

Tarefa:
1. Em src/features/readings/useSecondMeasurementFlow.ts:
   - Troque a assinatura de `handleReadingSaved`. Hoje recebe só `SessionReading` (systolic,
     diastolic, pulse); agora precisa também do id do documento e dos campos que serão
     preservados na atualização (note, measuredAt). Crie um tipo novo no mesmo arquivo:
     ```
     export interface FirstMeasurement extends SessionReading {
       /** Id do documento já salvo no Firestore (devolvido por useAddReading/submit() no Prompt 4.1). */
       id: string;
       note: string | null;
       measuredAt: Date;
     }
     ```
     e troque a assinatura para `handleReadingSaved: (reading: FirstMeasurement) => void`. A lógica
     de transição idle→'offer' não muda — só passa a guardar o objeto inteiro (não só os 3 campos
     numéricos) no state interno que hoje se chama `firstReading` (troque o tipo desse state para
     `FirstMeasurement | null`).
   - Remova a transição measuring→'summary' de dentro de `handleReadingSaved` — ela deixa de ser
     chamada com a segunda medição (isso agora é responsabilidade da nova função do item
     seguinte). Deixe `handleReadingSaved` só tratando o caso 'idle' (vira a primeira medição da
     sessão) e permanecendo NO-OP em qualquer outro estado, como hoje.
   - Adicione ao hook (ele já roda dentro de um componente React, pode chamar outros hooks):
     `const update = useUpdateReading();` (import de './useUpdateReading').
   - Adicione uma nova função exposta pelo hook:
     ```
     async function submitSecondMeasurement(second: SessionReading): Promise<boolean> {
       if (state !== 'measuring' || firstReading === null) {
         return false;
       }

       const nextAverage = computeSessionAverage(firstReading, second);

       const success = await update.updateReading(firstReading.id, {
         systolic: String(nextAverage.systolic),
         diastolic: String(nextAverage.diastolic),
         pulse: nextAverage.pulse === null ? '' : String(nextAverage.pulse),
         note: firstReading.note ?? '',
         measuredAt: firstReading.measuredAt,
       });

       if (success) {
         setAverage(nextAverage);
         setState('summary');
       }

       return success;
     }
     ```
     (o objeto passado para updateReading segue o formato ReadingFormValues, o mesmo tipo usado
     por useReadingForm — confira a import correta de './useAddReading' ou de onde
     ReadingFormValues for exportado hoje.)
   - Exponha no retorno do hook: `isSaving: update.isSaving`, `saveError: update.error`, e
     `submitSecondMeasurement` — adicione os três à interface UseSecondMeasurementFlowResult, com
     comentário explicando que `isSaving`/`saveError` só são relevantes durante 'measuring' (a
     tentativa de salvar a segunda medição) e que `saveError` é a mensagem amigável já traduzida
     por useUpdateReading (nunca error.message cru — CLAUDE.md §4.3).
   - `decline()` a partir de 'measuring' continua funcionando igual (descarta o estado da sessão,
     sem desfazer a primeira medição já salva) — nenhuma mudança necessária ali, só confirme que
     ainda reseta `firstReading` para null.
2. Atualize src/features/readings/useSecondMeasurementFlow.test.ts:
   - Ajuste todo teste que hoje chama `handleReadingSaved(reading)` com um objeto de 3 campos —
     passe um FirstMeasurement completo (id, note, measuredAt) na primeira chamada de cada teste.
   - Remova/reescreva o teste que hoje verifica "measuring → handleReadingSaved(B) → summary com a
     média" — essa transição não acontece mais por handleReadingSaved. No lugar, adicione mock de
     useUpdateReading (jest.mock('./useUpdateReading', ...) igual ao padrão já usado para
     useAddReading noutros testes do projeto) e cubra:
     - measuring → submitSecondMeasurement(second) com updateReading mockado resolvendo `true` →
       state vira 'summary', average é computeSessionAverage(firstReading, second), e
       updateReading foi chamado com o id da primeira medição e os valores da média (systolic/
       diastolic/pulse como STRING, note e measuredAt preservados do firstReading original).
     - submitSecondMeasurement com updateReading resolvendo `false` → state permanece 'measuring',
       average continua null, saveError reflete a mensagem do mock.
     - submitSecondMeasurement chamado fora de 'measuring' (ex.: em 'idle' ou 'offer') → não chama
       updateReading, devolve false, não muda o estado.
   - Mantenha os testes que não mudaram (idle→offer, contador, decline, dismissSummary) — só ajuste
     o shape do objeto passado a handleReadingSaved onde for necessário.
3. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): segunda medição atualiza a leitura original com a média, em vez de criar outra
```

**Modelo recomendado:** Claude Sonnet 5 — a máquina de estados e o contrato de
`submitSecondMeasurement` estão inteiramente especificados neste prompt; é implementação mecânica
de uma spec fechada, sem decisão de UX (isso é o Prompt 4.3).

---

### Prompt 4.3 — Pop-up da segunda medição (sistólica/diastólica/pulso) e novo texto do resumo

```
Contexto: no BP Tracker, os Prompts 4.1 e 4.2 já fizeram addReading devolver id e
useSecondMeasurementFlow persistir a média via updateReading (submitSecondMeasurement). Este
prompt é o único deste arquivo que muda a experiência do fluxo mais visitado do app: em vez de
reaproveitar o ReadingForm grande para a segunda medição (o que hoje acontece em
src/components/bp/SecondMeasurementCard.tsx + app/(app)/index.tsx), o estado 'measuring' abre um
pop-up pequeno, só com sistólica/diastólica/pulso (SEM observação, SEM seletor de horário — decisão
de produto já tomada, não reabra essa discussão). Ver a decisão de escopo no topo deste arquivo de
prompts e o tom "calmo, não alarmista, registra-não-diagnostica" do CLAUDE.md §1.

Tarefa:
1. Crie src/components/bp/SecondMeasurementDialog.tsx (componente burro, CLAUDE.md §3.4), no molde
   de src/components/ui/ConfirmDialog.tsx (Card dentro de Modal transparente, mesmo BACKDROP_COLOR,
   mesmo onRequestClose para o botão físico voltar do Android):
   export interface SecondMeasurementDialogProps {
     visible: boolean;
     isSaving: boolean;
     /** Mensagem amigável já traduzida (useSecondMeasurementFlow.saveError) — nunca error.message
      *  cru (CLAUDE.md §4.3). */
     error: string | null;
     onSubmit: (values: { systolic: string; diastolic: string; pulse: string }) => void;
     onCancel: () => void;
   }
   - Três campos BpNumberInput (sistólica, diastólica, pulso — mesmos componentes e mesmas faixas
     visuais de src/components/bp/ReadingForm.tsx, mas SEM DateTimeField nem campo de observação),
     com validação de faixa própria e independente do form principal (reaproveite as constantes
     SYSTOLIC_MIN/MAX, DIASTOLIC_MIN/MAX, PULSE_MIN/MAX de src/features/readings/reading.schema.ts
     e a MESMA lógica de mensagem de erro por campo — não invente uma segunda cópia da regra de
     "sistólica deve ser maior que a diastólica").
   - Botão "Salvar segunda medição" (variant="primary", loading={isSaving}, disabled enquanto os
     campos obrigatórios (sistólica/diastólica) não forem válidos) chamando onSubmit com os 3
     valores em string; botão "Cancelar" (variant="ghost", onPress={onCancel}, disabled enquanto
     isSaving).
   - Se `error` estiver preenchido, mostre com o mesmo padrão de src/components/ui/InlineFeedback.tsx
     (tone="danger") logo acima dos botões — o usuário deve poder tocar "Salvar segunda medição" de
     novo sem perder o que já digitou (o componente NÃO limpa os campos sozinho ao receber um
     `error`; quem decide fechar ou manter aberto é quem consome o componente).
   - accessibilityViewIsModal no Card, mesmo padrão de ConfirmDialog.tsx.
2. Teste SecondMeasurementDialog.test.tsx (comportamental): validação de faixa bloqueia o botão,
   onSubmit recebe os 3 valores corretos, onCancel dispara ao tocar "Cancelar", mensagem de erro
   aparece quando a prop `error` é passada, botão mostra estado de carregamento quando `isSaving`
   é true.
3. Em src/components/bp/SecondMeasurementCard.tsx:
   - O estado 'offer' continua exatamente como está (card com "Medir novamente"/"Não, obrigado").
   - O estado 'measuring' deixa de mostrar o card "Medição 2 de 2" com só um botão "Cancelar" por
     baixo do ReadingForm reaproveitado — em vez disso, monte <SecondMeasurementDialog
     visible isSaving={isSaving} error={saveError} onSubmit={...} onCancel={onDecline} /> (adicione
     `isSaving`, `saveError` e uma nova prop `onSubmitSecondMeasurement` a
     SecondMeasurementCardProps, vindas de useSecondMeasurementFlow — ver Prompt 4.2). Pode manter
     ou remover o card de fundo "Medição 2 de 2" atrás do pop-up, à sua escolha — mas o pop-up é
     quem recebe os valores agora, não o ReadingForm da tela.
   - No estado 'summary' (SessionSummary), troque o texto final de
     "As duas medições já estão no seu histórico — este resumo não é salvo à parte." para algo
     como "A média das duas medições foi salva no seu histórico." — não é mais um resumo à parte,
     é o próprio dado salvo.
4. Em app/(app)/index.tsx (RecordScreen):
   - handleSubmit precisa capturar TAMBÉM note e measuredAt do formulário ANTES do await (mesmo
     motivo já documentado no comentário existente sobre o systolic/diastolic/pulse — os campos são
     limpos assim que o submit tem sucesso). Monte o objeto completo só depois de confirmar
     sucesso, usando o `readingId` devolvido por `form.submit()` (Prompt 4.1):
     ```
     async function handleSubmit(): Promise<void> {
       const snapshot: SessionReading = {
         systolic: Number(form.systolic),
         diastolic: Number(form.diastolic),
         pulse: form.pulse === '' ? null : Number(form.pulse),
       };
       const note = form.note === '' ? null : form.note;
       const measuredAt = form.measuredAt;

       const { success, readingId } = await form.submit();

       if (success && readingId !== null) {
         flow.handleReadingSaved({ ...snapshot, id: readingId, note, measuredAt });
       }
     }
     ```
   - ReadingForm continua sendo a MESMA instância de sempre para a PRIMEIRA medição — não muda
     nada ali. O que muda é só a segunda medição, que agora passa pelo pop-up.
   - Passe `onSubmitSecondMeasurement={(values) => void flow.submitSecondMeasurement({
     systolic: Number(values.systolic), diastolic: Number(values.diastolic), pulse: values.pulse
     === '' ? null : Number(values.pulse) })}` para SecondMeasurementCard (ou onde fizer mais
     sentido pela prop nova do item 3).
5. Atualize __tests__/app/(app)/index.test.tsx — o teste
   'percorre offer → measuring → summary → idle com a média das duas medições' precisa mudar: a
   segunda medição não é mais digitada reaproveitando `buildForm`/"Salvar medição" — é preenchida
   no pop-up novo (mock de useSecondMeasurementFlow com submitSecondMeasurement mockado, ou
   interação real com os campos do SecondMeasurementDialog se ele estiver montado de verdade).
   Ajuste as asserções de texto para "A média das duas medições foi salva no seu histórico." em vez
   do texto antigo. Ajuste também SecondMeasurementCard.test.tsx conforme a nova estrutura de
   'measuring' (props novas: isSaving, error, onSubmitSecondMeasurement).
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(readings): segunda medição por pop-up, sem reaproveitar o formulário grande
```

**Modelo recomendado:** Claude Opus 5 — mexe no fluxo mais visitado do app, reescreve o texto do
card de resumo (tom clínico calmo do CLAUDE.md §1) e decide como comunicar erro de salvamento numa
composição sem precedente exato no código — julgamento de produto, não só seguir uma spec fechada.

---

## Item E — Histórico: linhas de grade no gráfico

### Prompt 5 — Habilitar as `rules` do eixo Y em `TrendChart`

```
Contexto: no BP Tracker, src/components/bp/TrendChart.tsx passa `hideRules` para o LineChart do
react-native-gifted-charts (versão 1.4.77 — confira em package.json), o que desliga as linhas
horizontais de grade que o gráfico já desenharia na mesma altura dos rótulos do eixo Y. O pedido é
mostrar essas linhas, discretas, sem competir com as duas séries de dados (sistólica/diastólica).

Tarefa:
1. Confira em node_modules/react-native-gifted-charts (ou na documentação do pacote, se
   node_modules não estiver disponível no ambiente) os nomes EXATOS das props de "rules" da
   versão 1.4.77 do LineChart — normalmente `rulesColor`, `rulesType` ('solid' | 'dashed'),
   `rulesThickness`, `dashWidth`, `dashGap`. Use os nomes reais da versão instalada; se algum
   divergir do que está listado aqui, adapte.
2. Em src/components/bp/TrendChart.tsx, remova a prop `hideRules` do <LineChart> e adicione, no
   tom discreto (a cor precisa distinguir claramente da cor das duas séries — palette.primary e
   palette.muted já usadas por color/color2):
   - `rulesColor={palette.border}` (mesmo tom já usado em xAxisColor/yAxisColor logo abaixo, para
     as linhas de grade terem o mesmo peso visual dos eixos, não mais forte).
   - Se a versão suportar `rulesType`, use `rulesType="dashed"` para diferenciar visualmente as
     linhas de grade das linhas de dados (que são sólidas); senão deixe sólida mesmo (a cor mais
     clara já basta para não competir com os dados).
3. Confira visualmente (ou por teste de snapshot, se o projeto já usar algum para este componente)
   que as linhas aparecem alinhadas com os rótulos do eixo Y nos dois modos (7 dias / 30 dias) e
   nos dois temas (claro/escuro) — palette.border já varia por tema em src/theme/colors.ts, então
   nenhuma cor precisa ser condicionada manualmente aqui.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(history): mostrar linhas de grade no eixo Y do gráfico de tendência
```

**Modelo recomendado:** Claude Sonnet 5 — ajuste de props de uma biblioteca já integrada, sem
decisão de projeto nova.

---

## Item F — Histórico: pop-up de range de datas para exportar CSV

### Prompt 6.1 — `DateTimeField` ganha `mode="date"` (nativo e web)

```
Contexto: no BP Tracker, src/components/ui/DateTimeField.native.tsx e .web.tsx hoje só suportam
mode: 'datetime' | 'time'. O Prompt 6.3 (pop-up de exportação) precisa de um seletor SÓ DE DATA
(sem hora) para o range de exportação — pedir hora ali seria ruído, já que a exportação filtra por
dia. Este prompt adiciona esse modo aos DOIS arquivos da dupla nativo/web (CLAUDE.md §3.3:
diferença de plataforma por extensão de arquivo, nunca por Platform.OS espalhado).

Tarefa:
1. Em src/components/ui/DateTimeField.native.tsx:
   - Troque `mode: 'datetime' | 'time'` para `mode: 'datetime' | 'time' | 'date'` na interface
     DateTimeFieldProps.
   - `@react-native-community/datetimepicker` já aceita `mode="date"` nativamente — o componente
     hoje só repassa `mode` direto ao <DateTimePicker>, então nenhuma lógica adicional deveria ser
     necessária além do tipo. Confirme que `onValueChange`/`onDismiss` continuam funcionando sem
     alteração (o comentário existente sobre Android fechar sozinho e iOS ser inline vale
     igualmente para o modo `date`).
2. Em src/components/ui/DateTimeField.web.tsx:
   - Troque a mesma união de tipo na interface.
   - Em `toInputValue`: adicione um branch para `mode === 'date'` devolvendo só
     `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` (sem a parte de
     hora).
   - Em `fromInputValue`: adicione um branch para `mode === 'date'` casando
     `/^(\d{4})-(\d{2})-(\d{2})$/` e devolvendo `new Date(Number(match[1]), Number(match[2]) - 1,
     Number(match[3]))` (meia-noite local, sem herdar hora de `reference` — ao contrário do modo
     `time`, aqui não há hora prévia relevante a preservar).
   - No JSX do `<input>`, troque `type={mode === 'time' ? 'time' : 'datetime-local'}` para
     `type={mode === 'time' ? 'time' : mode === 'date' ? 'date' : 'datetime-local'}`.
3. Nenhum consumidor existente de DateTimeField (measuredAt no ReadingForm, horário dos lembretes
   em Ajustes) muda de comportamento — os dois já usam 'datetime'/'time'. Não altere nenhum desses
   call sites neste prompt.
4. Se já existir teste para DateTimeField.web.tsx (confira DateTimeField.web.test.tsx), adicione
   cobertura do modo 'date': toInputValue/fromInputValue com uma data conhecida, e que o input
   nasce com type="date". Não crie teste para a versão nativa se não houver precedente de teste
   para @react-native-community/datetimepicker no projeto (confira antes de decidir).
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(ui): DateTimeField ganha modo somente-data
```

**Modelo recomendado:** Claude Sonnet 5 — extensão mecânica de um componente existente, seguindo
exatamente o padrão já usado pelo modo `time` no mesmo arquivo.

---

### Prompt 6.2 — Range de datas em `getAllReadings`/`useExportCsv`

```
Contexto: no BP Tracker, src/features/export/useExportCsv.ts sempre exporta o histórico inteiro
(getAllReadings sem filtro). O Prompt 6.3 vai adicionar um pop-up para o usuário escolher um range
de datas antes de exportar — este prompt prepara a camada de dados para aceitar esse range, ainda
sem UI.

Tarefa:
1. Em src/features/readings/readings.repo.ts:
   - Importe `where` de 'firebase/firestore' (já importa outras funções do mesmo módulo).
   - Adicione um tipo exportado:
     export interface ReadingDateRange { start: Date; end: Date }
   - Troque a assinatura de getAllReadings para
     `export async function getAllReadings(uid: string, range?: ReadingDateRange): Promise<Reading[]>`.
   - Monte a query condicionalmente:
     ```
     const constraints = [orderBy('measuredAt', 'desc')];
     if (range !== undefined) {
       constraints.push(where('measuredAt', '>=', range.start), where('measuredAt', '<=', range.end));
     }
     const snapshot = await getDocs(query(collection(firestore, readingsCollectionPath(uid)), ...constraints));
     ```
     (o filtro e o orderBy são no MESMO campo, measuredAt — não deve exigir índice composto novo
     em firestore.indexes.json; confirme isso e não adicione índice se não for necessário.)
   - Mantenha o try/catch e as mensagens de erro exatamente como estão.
2. Em src/features/export/useExportCsv.ts:
   - Troque `exportCsv: () => Promise<void>` para `exportCsv: (range?: ReadingDateRange) =>
     Promise<void>` na interface (importe ReadingDateRange de '@/features/readings/readings.repo').
   - Repasse `range` para `getAllReadings(user.uid, range)`.
   - Ajuste `buildFilename()`: quando `range` for fornecido, o nome do arquivo deve refletir o
     período (ex.: `pressao-2026-07-01_a_2026-08-21.csv`, usando os mesmos componentes de data já
     calculados hoje para `pressao-${year}-${month}-${day}.csv`); sem `range` (exportação de tudo),
     mantenha o comportamento atual (data de hoje no nome).
   - Mantenha a mensagem EMPTY_MESSAGE quando o resultado do range vier vazio — o texto atual
     ('Nenhuma medição para exportar ainda.') já serve, mas se quiser diferenciar 'nenhuma medição
     no período' de 'nenhuma medição na conta', pode adicionar uma segunda mensagem
     (EMPTY_RANGE_MESSAGE) usada só quando `range !== undefined` — decisão livre, não é obrigatório.
3. Teste: ajuste/adicione casos em __tests__ (ou onde os testes de useExportCsv já vivem) cobrindo
   exportCsv(range) chamando getAllReadings com o range correto, e o nome do arquivo refletindo o
   período quando um range é passado. Se não houver teste hoje para useExportCsv, crie um mínimo
   cobrindo o caminho sem range (comportamento atual, para não regredir) e o caminho com range.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(export): aceitar range de datas na exportação de CSV
```

**Modelo recomendado:** Claude Sonnet 5 — query e contrato de função totalmente especificados
neste prompt, sem decisão de UX (isso é o Prompt 6.3).

---

### Prompt 6.3 — `ExportCsvDialog` (pop-up de range) e wiring em `history.tsx`

```
Contexto: no BP Tracker, os Prompts 6.1 e 6.2 já prepararam DateTimeField (modo 'date') e
useExportCsv/getAllReadings (aceitam um range). Este prompt cria o pop-up que hoje falta: hoje
app/(app)/history.tsx chama exportCsv() direto ao tocar "Exportar CSV", sem perguntar nada ao
usuário.

Tarefa:
1. Crie src/components/bp/ExportCsvDialog.tsx (componente burro, no molde de
   src/components/ui/ConfirmDialog.tsx — Card dentro de Modal transparente):
   export interface ExportCsvDialogProps {
     visible: boolean;
     isExporting: boolean;
     error: string | null;
     onExport: (range?: { start: Date; end: Date }) => void;
     onCancel: () => void;
   }
   - Atalhos rápidos como um grupo de opções (mesmo padrão visual dos botões segmentados de
     TrendChart.tsx — Pressable com fundo/borda mudando conforme selecionado): "Últimos 7 dias",
     "Últimos 30 dias", "Tudo", "Personalizado". Estado local (useState) para qual atalho está
     selecionado; "Personalizado" revela dois DateTimeField (mode="date", do Prompt 6.1) para
     início e fim.
   - Validação: se "Personalizado" e a data de fim for anterior à de início, mostre erro de campo
     (mesmo padrão de mensagem amigável em vermelho já usado em outros formulários do app) e
     desabilite o botão "Exportar". A data de fim nunca pode ser depois de hoje
     (maximumDate={new Date()} no DateTimeField de fim, mesma prop já suportada).
   - Botão "Exportar" (variant="primary", loading={isExporting}) chamando `onExport(range)` — para
     "Tudo", `range` é `undefined`; para os atalhos de dias, calcule `start`/`end` (hoje) a partir
     de `Date.now()` menos os dias correspondentes; para "Personalizado", os dois valores dos
     DateTimeField.
   - Botão "Cancelar" (variant="ghost", onPress={onCancel}, disabled enquanto isExporting).
   - Se `error` estiver preenchido, mostre com o mesmo padrão de InlineFeedback (tone="danger") já
     usado hoje em history.tsx para exportError.
2. Teste ExportCsvDialog.test.tsx (comportamental): cada atalho de período gera o range esperado ao
   exportar, "Personalizado" exige os dois campos preenchidos e bloqueia data de fim antes da de
   início, "Tudo" chama onExport(undefined), onCancel funciona, erro aparece quando a prop `error`
   é passada.
3. Em app/(app)/history.tsx:
   - Adicione estado local `const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);`.
   - O botão "Exportar CSV" no ListHeaderComponent passa a abrir o diálogo
     (onPress={() => setIsExportDialogOpen(true)}) em vez de chamar exportCsv() direto.
   - Monte <ExportCsvDialog visible={isExportDialogOpen} isExporting={isExporting} error={exportError}
     onExport={(range) => { setIsExportDialogOpen(false); void exportCsv(range); }}
     onCancel={() => setIsExportDialogOpen(false)} /> — feche o diálogo ao iniciar a exportação (o
     feedback de erro/sucesso continua no InlineFeedback já ancorado fora da FlashList, como hoje;
     não duplique a exibição do erro dentro do diálogo E fora dele ao mesmo tempo — se preferir,
     mantenha o diálogo aberto até a exportação terminar e só then feche, à sua escolha, desde que
     o usuário sempre veja o erro em algum lugar).
4. Atualize __tests__/app/(app)/history.test.tsx (se existir) — o teste que hoje dispara
   "Exportar CSV" esperando exportCsv() ser chamado direto precisa mudar: tocar "Exportar CSV" abre
   o diálogo; tocar "Tudo" (ou o atalho equivalente) + "Exportar" dentro do diálogo é quem
   efetivamente chama exportCsv.
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(export): pop-up de período para exportar CSV
```

**Modelo recomendado:** Claude Sonnet 5 — composição nova, mas modelada diretamente sobre
`ConfirmDialog` e os botões segmentados já existentes em `TrendChart`; sem risco de tom/conteúdo
clínico (é um diálogo transacional, não uma tela de produto).

---

## Ordem de execução

**Sequencial (um Claude por vez), da menor superfície de risco para a maior:**

1. **Prompt 1** (Sonnet 5) — bug isolado, sem dependências.
2. **Prompt 2** (Sonnet 5) — sem dependências.
3. **Prompt 3** (Sonnet 5) — sem dependências.
4. **Prompt 5** (Sonnet 5) — sem dependências.
5. **Prompt 6.1** (Sonnet 5) → **Prompt 6.2** (Sonnet 5) → **Prompt 6.3** (Sonnet 5) —
   sequenciais entre si (componente compartilhado → dados → UI).
6. **Prompt 4.1** (Sonnet 5) → **Prompt 4.2** (Sonnet 5) → **Prompt 4.3** (Opus 5) —
   sequenciais entre si (contrato de dados → máquina de estados → UI); deixado por último por ser
   o item de maior risco e superfície de teste.

**Se preferir paralelizar em sessões/agentes separados:** os Prompts 1, 2, 3 e 5 não compartilham
arquivo nenhum entre si nem com as duas cadeias abaixo — podem rodar todos ao mesmo tempo. A cadeia
do Item F (6.1→6.2→6.3) e a cadeia do Item D (4.1→4.2→4.3) também não compartilham arquivo entre
si (uma mexe em DateTimeField/export/history, a outra em readings/index.tsx/SecondMeasurement*) —
podem rodar em paralelo uma com a outra, mas cada uma precisa ser sequencial internamente.

Nenhuma mudança em `firestore.rules`, schema Zod ou `firestore.indexes.json` é necessária em
nenhum destes dez prompts.

Cada prompt termina em UM commit. Depois de rodar os que quiser, revise o diff acumulado e faça
`git push` (ou peça para eu fazer) — não faço push automático de nenhum destes sem você pedir.

---

## Prompt de Consolidação — juntar o trabalho da sessão, corrigir versionamento e abrir PR

> Use este prompt quando os 10 prompts acima (ou parte deles) já tiverem sido rodados numa ÚNICA
> sessão corrida, sem commit/push intermediário e sem PR — o cenário em que é fácil um prompt
> posterior pisar sem querer no resultado de um anterior, ou uma mudança de contrato (ex.: Prompt
> 4.1) não ter se propagado para todo mundo que dependia dela (Prompts 4.2/4.3). Este prompt audita
> o estado real do código contra a spec de cada item, conserta o que estiver inconsistente, organiza
> o histórico em commits limpos e abre o PR.

```
Contexto: no BP Tracker, os 10 prompts de prompts_melhorias_registrar_historico_ajustes.md (Itens
A-F: mensagem de erro do messaging web, "Como usar o app" em card próprio, accordion de pulso/
observação, segunda medição por pop-up salvando a média — Prompts 4.1/4.2/4.3 —, linhas de grade
no gráfico, e pop-up de range de datas no export CSV — Prompts 6.1/6.2/6.3) foram rodados em
sequência, numa mesma sessão, sem nenhum commit nem push intermediário. Não existe PR aberto ainda.
Isso significa duas coisas a checar com cuidado, não a assumir como certas:
(a) um prompt posterior pode ter alterado ou revertido sem querer algo que um prompt anterior já
    tinha deixado pronto (ex.: um contrato mudado no Prompt 4.1 — addReading/submit() devolvendo
    {success, readingId} — precisa estar refletido em TODOS os call sites que os Prompts 4.2/4.3
    dependem dele, não só nos arquivos que o próprio 4.1 listava);
(b) branch remota `claude/app-improvements-plan-kcu88f` já tem um commit que este checkout local
    pode não ter (o arquivo prompts_melhorias_registrar_historico_ajustes.md foi commitado e
    empurrado numa sessão separada, só de planejamento) — NÃO force-push por cima disso.

Tarefa:

1. Reconciliar com a remota ANTES de qualquer outra coisa:
   - `git fetch origin claude/app-improvements-plan-kcu88f`.
   - Confirme em qual branch este checkout está (`git branch --show-current`) e se ele é
     descendente de `origin/claude/app-improvements-plan-kcu88f`. Se NÃO for (a remota tem o
     commit `docs: adicionar prompts de desenvolvimento para Registrar/Histórico/Ajustes` que este
     checkout não tem), faça `git merge origin/claude/app-improvements-plan-kcu88f` para trazê-lo
     para dentro do seu histórico local antes de prosseguir — nunca `git push --force` para
     descartar esse commit, ele é trabalho de outra sessão que já está na remota.
   - Depois de reconciliado, NÃO use `git rebase -i` (não suportado neste ambiente). Para
     reorganizar o histórico em commits limpos, use `git reset --soft
     origin/claude/app-improvements-plan-kcu88f` (ou o commit correspondente após o merge acima) —
     isso devolve TODO o trabalho já commitado nesta sessão para a área de stage, como mudanças não
     commitadas, sem perder nada, e sem tocar no working tree. A partir daí você recomita em pedaços
     limpos (passo 4).

2. Auditar item por item contra a spec (não assuma que "rodou" = "ficou correto"). Para cada um dos
   Itens A, B, C, D (4.1+4.2+4.3), E, F (6.1+6.2+6.3) descritos em
   prompts_melhorias_registrar_historico_ajustes.md, releia a seção "Tarefa" do prompt
   correspondente e confira, no código atual (depois do reset --soft do passo 1, o working tree
   ainda tem TODAS as mudanças, só não commitadas):
   - O arquivo/mudança principal do item existe e faz o que o prompt pedia?
   - Toda mudança de CONTRATO que um item promete (ex.: 4.1 — addReading devolve string|false,
     submit() devolve {success, readingId}; 6.1 — DateTimeField aceita mode: 'date') está
     refletida em TODOS os lugares que dependem dela, inclusive testes? Procure especificamente por
     chamadas ou mocks que ainda assumem o formato ANTIGO (ex.: `if (await form.submit())` tratando
     o retorno como boolean puro, ou `jest.fn<Promise<boolean>, []>()` num teste que deveria ter
     sido atualizado pelo Prompt 4.1) — isso é o sintoma mais provável de "um prompt pisou no
     anterior".
   - Não sobrou nenhum código morto do desenho ANTIGO que o item substituiu (ex.: o Item D removeu
     o reaproveitamento do ReadingForm grande para a segunda medição — confirme que
     SecondMeasurementCard.tsx não ficou com os dois caminhos, o novo pop-up E um resquício do
     antigo, ao mesmo tempo).
   - Não há import não utilizado, tipo duplicado, ou comentário que descreve um comportamento que
     não existe mais (ex.: o comentário "as duas medições já estão no histórico" de
     SecondMeasurementCard.tsx precisa ter sido trocado pelo Prompt 4.3 — confirme que não sobrou a
     versão antiga em nenhum lugar).
   - Se algum item parecer TOTALMENTE ausente (nenhum traço da mudança no código) — não implemente
     do zero por conta própria neste prompt. Anote isso para o relatório final (passo 6) e para a
     descrição do PR (passo 5): é uma decisão do usuário rodar aquele prompt específico depois, não
     algo para "completar" por iniciativa própria aqui, já que o pedido é juntar o que foi feito,
     não inventar o que não foi.
   - Se algum item estiver PARCIAL (ex.: o componente novo existe mas não foi ligado na tela, ou o
     teste não foi atualizado), conserte — isso é exatamente o "erro de versionamento" que este
     prompt existe para resolver, diferente de um item ausente por completo.

3. Depois de corrigir o que precisar de correção, rode `npm run lint && npm run typecheck && npm
   test` e resolva TODOS os erros antes de prosseguir. Não crie o PR com testes vermelhos ou tipo
   quebrado — se algo não for possível resolver com confiança (ex.: exige decisão de produto que
   não está especificada em nenhum dos prompts), pare e explique claramente o que está bloqueado em
   vez de forçar um jeito de fazer passar.

4. Recomite em commits atômicos, na ORDEM abaixo (mesmas mensagens de commit já especificadas em
   cada prompt de prompts_melhorias_registrar_historico_ajustes.md — reutilize-as, não invente
   mensagens novas):
   1. Item A — `fix(reminders): não deixar erro cru do Firebase Messaging escapar ao ativar
      notificações na web`
   2. Item B — `refactor(settings): dar destaque próprio ao link "Como usar o app" num card "Ajuda"`
   3. Item C — `feat(ui): transformar pulso e observação em accordion que abre e fecha`
   4. Item E — `feat(history): mostrar linhas de grade no eixo Y do gráfico de tendência`
   5. Item F — três commits (ou um só, se os arquivos de 6.1/6.2/6.3 estiverem interdependentes
      demais para separar com segurança — use julgamento, mas NUNCA misture Item F com Item D no
      mesmo commit):
      `feat(ui): DateTimeField ganha modo somente-data` →
      `feat(export): aceitar range de datas na exportação de CSV` →
      `feat(export): pop-up de período para exportar CSV`
   6. Item D — três commits (mesma ressalva: pode agrupar 4.1+4.2+4.3 se os arquivos estiverem
      emaranhados demais, mas nunca misturados com outro item):
      `refactor(readings): addReading e submit() devolvem o id do documento criado` →
      `feat(readings): segunda medição atualiza a leitura original com a média, em vez de criar
      outra` →
      `feat(readings): segunda medição por pop-up, sem reaproveitar o formulário grande`
   Use `git add <arquivos do item>` (ou `git add -p` onde um arquivo for tocado por mais de um
   item) para montar cada commit só com o que pertence àquele item — não um `git add -A` genérico
   commitando tudo de uma vez, que é exatamente o problema que motivou este prompt.

5. Depois do último commit, `git push -u origin claude/app-improvements-plan-kcu88f`. Se o push for
   rejeitado por non-fast-forward, NÃO force-push — faça `git fetch` + `git merge` de novo e
   resolva antes de tentar de novo.

6. Abra o PR (procure primeiro `.github/pull_request_template.md`,
   `.github/PULL_REQUEST_TEMPLATE.md` ou `PULL_REQUEST_TEMPLATE.md` na raiz — se existir, siga a
   estrutura dele; senão escreva como abaixo). A descrição precisa:
   - Listar os seis itens (A-F) com uma linha cada do que mudou.
   - Indicar explicitamente, numa seção separada (ex.: "Pendências"), qualquer item que a auditoria
     do passo 2 encontrou AUSENTE por completo (não implementado nesta sessão) — para o usuário
     decidir se roda aquele prompt específico depois, num commit à parte.
   - Confirmar que `npm run lint && npm run typecheck && npm test` passam no estado final.
   Não mescle o PR sozinho — só abra, para revisão humana.

Rode `npm run lint && npm run typecheck && npm test` uma última vez depois de tudo commitado e
antes de abrir o PR, para confirmar que a reorganização em commits não quebrou nada.
```

**Modelo recomendado:** Claude Opus 5 — não é seguir uma spec fechada, é diagnosticar o que
sobreviveu, o que se perdeu e o que ficou inconsistente depois de 10 prompts corridos sem
checkpoint, decidir o que é seguro corrigir versus o que precisa ser reportado em vez de
"completado" por conta própria, e fazer cirurgia de git (reset --soft, recomposição de commits,
reconciliação com a remota) sem perder trabalho — julgamento em várias frentes ao mesmo tempo, não
uma tarefa mecânica.
