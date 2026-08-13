# Prompts de Correção — BP Tracker

> Um prompt autocontido por item do [`plano_de_correcoes.md`](./plano_de_correcoes.md), na ordem de
> execução proposta lá. Cada prompt pode ser colado direto numa sessão nova do Claude Code — não
> depende de memória de conversa anterior, só do estado do repositório nesta branch.
>
> Duas decisões de design que o plano deixou em aberto foram resolvidas aqui, com a justificativa
> registrada no próprio prompt (§10 e §7), para os prompts serem executáveis sem parar para
> perguntar. Se você discordar de alguma, é só editar o prompt correspondente antes de rodar.
>
> Convenção comum a todos: seguir `CLAUDE.md` (TypeScript estrito, sem `any`, Zod para dado do
> Firestore, `@/` em vez de `../../../`, exports nomeados, mudanças cirúrgicas, um commit semântico
> por item, rodar `npm run lint && npm run typecheck && npm test` antes de cada commit).

---

## Modelo recomendado por prompt

Critério: **Opus** onde o custo de um erro sutil é alto (o bug relatado em si, conversão de
data entre plataformas, API do Firestore sensível a versão) — vale pagar o raciocínio extra.
**Haiku** onde a tarefa é mecânica e de baixo risco (split de arquivo, refactor trivial,
documentação sem tocar em runtime). **Sonnet** no meio: mudanças de UI/estado de complexidade
média, sem ambiguidade arquitetural.

| # | Prompt | Bug | Modelo | Por quê |
|---|---|---|---|---|
| 1 | Teste de regressão da exclusão | — | **Sonnet 5** | Monta mocks de RNTL corretamente; mecânico, mas exige atenção a detalhe. |
| 2 | `Alert.alert` não funciona na web | BUG-01 | **Opus 5** | O bug relatado pelo usuário. Componente de UI + acessibilidade novo, usado em 5 lugares — maior exigência de correção. |
| 3 | `DateTimePicker` não funciona na web | BUG-02 | **Opus 5** | Conversão Date ↔ string entre nativo e web é fonte clássica de bug sutil de fuso/formato. |
| 4 | Horários de lembrete reportam erro falso na web | BUG-09 | **Haiku 4.5** | Puro split de arquivo por plataforma (`.native`/`.web`), mesmo padrão já existente no repo. |
| 5 | Feedback de exclusão e de salvar horários | BUG-06/07/10 | **Sonnet 5** | Três bugs relacionados, estado por linha na lista — complexidade média, não arquitetural. |
| 6 | App Check nunca é inicializado | BUG-05 | **Sonnet 5** | Um ponto de chamada, mas precisa avaliar ordem de import/circularidade com cuidado. |
| 7 | `logError` descarta tudo em produção | BUG-04 | **Haiku 4.5** | Só documentação — nenhuma mudança de comportamento em runtime. |
| 8 | Sem persistência offline do Firestore na web | BUG-08 | **Opus 5** | API do SDK sensível à versão instalada; erro aqui quebra o offline-first silenciosamente. |
| 9 | Chave de lista por índice em settings | BUG-11 | **Haiku 4.5** | Refactor trivial e isolado, sem ambiguidade. |
| 10 | Exclusão inalcançável sem gesto de swipe | BUG-03 | **Sonnet 5** | Adiciona UI de acessibilidade num componente já auditado — precisa de cuidado de layout, não de arquitetura nova. |

---

## Prompt 1 — Teste de regressão da exclusão (vai antes da correção)

**Modelo recomendado:** Sonnet 5 — teste com mocks é mecânico, mas precisa isolar os hooks certos sem raciocínio arquitetural extra.

```
Contexto: no BP Tracker (React Native/Expo), o botão "Excluir" de uma medição no histórico
(app/(app)/history.tsx → src/components/bp/ReadingRow.tsx) não funciona na web porque
Alert.alert é um no-op no react-native-web. A correção ainda não foi aplicada — este passo é
só o teste que comprova o bug antes de mexer em código de produção (CLAUDE.md §4.6: "Corrigiu
um bug? Escreva o teste que falha antes da correção").

Tarefa:
1. Crie um teste com @testing-library/react-native que renderize a tela de histórico
   (app/(app)/history.tsx) com pelo menos uma medição mockada — mocke useReadings,
   useReadingsTrend, useExportCsv e useDeleteReading (ou só o repositório que useDeleteReading
   chama, se for mais simples de isolar).
2. Dispare a ação de excluir do jeito que o usuário real dispara: acione o botão/ação de
   exclusão da linha (ReadingRow), depois confirme no diálogo de confirmação que deveria
   aparecer.
3. Afirme que a função de exclusão (deleteReading do repositório, ou o mock equivalente) foi
   chamada exatamente uma vez, com o id correto da medição.
4. Rode `npm test` e confirme que ESSE teste falha agora (porque Alert.alert não abre nada na
   web/jsdom) — não altere nenhum arquivo de produção neste passo.
5. Não corrija o bug aqui. Só adicione o teste, num arquivo novo
   (ex.: app/(app)/history.test.tsx ou src/components/bp/ReadingRow.test.tsx — escolha o local
   que melhor isola a asserção).

Commit (não faça push ainda, isso será parte de uma série):
test(readings): cobrir exclusão de medição na confirmação
```

---

## Prompt 2 — BUG-01: `Alert.alert` não funciona na web (o bug relatado)

**Modelo recomendado:** Opus 5 — é o bug relatado pelo usuário; componente novo de UI + acessibilidade usado em 5 pontos, vale o raciocínio extra para não introduzir uma regressão na correção.

```
Contexto: no BP Tracker, Alert.alert é usado em 5 lugares para confirmar ações destrutivas e
mostrar mensagens — mas react-native-web implementa Alert.alert como um método vazio
(`static alert() {}`). Na web, nenhum desses diálogos aparece, e o array de botões (que carrega
o onPress real da ação) é descartado silenciosamente. Isso quebra:
- app/(app)/history.tsx:105 — confirmar exclusão de medição (o bug relatado pelo usuário)
- app/(app)/settings.tsx:107 — confirmar exclusão de conta (1ª confirmação)
- app/(app)/settings.tsx:116 — confirmar exclusão de conta (2ª confirmação)
- app/(app)/settings.tsx:128 — avisar que a conta foi excluída
- app/(app)/settings.tsx:147 — avisar falha ao abrir a política de privacidade

Se existir um teste em app/(app)/history.test.tsx (ou onde tiver sido criado) cobrindo a
exclusão e falhando por causa deste bug, ele deve passar a passar depois desta correção.

Tarefa:
1. Crie src/components/ui/ConfirmDialog.tsx — um diálogo de confirmação construído sobre o
   Modal do React Native (que TEM implementação real em react-native-web, ao contrário de
   Alert). Props sugeridas: visible, title, message, confirmLabel, cancelLabel (default
   "Cancelar"), isDestructive (troca a cor do botão de confirmar para a paleta de perigo, sem
   depender só de cor — mantenha o texto do botão explícito), onConfirm, onCancel.
   - Siga o design system do projeto: Card/Button/Text de src/components/ui, tokens de
     src/theme, alvos de toque ≥48dp, accessibilityRole="button" nas ações,
     accessibilityViewIsModal no container, foco inicial num botão seguro (cancelar) quando
     for ação destrutiva.
   - Também precisa cobrir o caso "só avisar" (sem botão de cancelar, só um "OK") — é o uso de
     settings.tsx:128 e :147.
2. Nas duas telas, importe ConfirmDialog e o estado local necessário (useState) para abrir/
   fechar o diálogo, substituindo as 5 chamadas de Alert.alert. Remova o import de Alert de
   ambos os arquivos.
3. Preserve o comportamento existente linha a linha:
   - history.tsx: mesmo texto ("Excluir medição?" / "Essa ação não pode ser desfeita."), mesma
     ação no confirm (deleteReading(readingId)).
   - settings.tsx: preserve a DUPLA confirmação da exclusão de conta (é deliberada, ver
     comentário em handleDeleteAccount) — dois diálogos em sequência, não um só.
4. Rode npm run lint && npm run typecheck && npm test. O teste de exclusão do Prompt 1 (se
   existir) deve passar agora.
5. Se não existir ainda um teste cobrindo a exclusão via este novo fluxo, adicione um (RNTL:
   renderiza a tela, abre a exclusão, confirma no ConfirmDialog, afirma que a função de
   exclusão foi chamada com o id certo).

Commit:
fix(ui): substituir Alert.alert por diálogo próprio compatível com a web
```

---

## Prompt 3 — BUG-02: `DateTimePicker` não funciona na web

**Modelo recomendado:** Opus 5 — conversão de Date entre `<input>` web e o picker nativo é fonte clássica de bug sutil de fuso/formato; dois pontos de consumo dependem de acertar essa fronteira.

```
Contexto: no BP Tracker, @react-native-community/datetimepicker não tem implementação web — o
arquivo padrão usado fora de Android/iOS (src/datetimepicker.js do pacote) renderiza `null` e
só imprime um console.warn. Isso deixa dois pontos do app mortos na web:
- app/(app)/index.tsx:147-154 — tocar no carimbo de data/hora da medição não abre nada; é
  impossível registrar com horário retroativo.
- app/(app)/settings.tsx:241-253 — tocar num horário de lembrete não abre nada; é impossível
  editar os horários de lembrete (o recurso central do produto).
Efeito colateral: como o onChange nunca dispara na web, isPickerOpen (index.tsx) e
openSlotIndex (settings.tsx) ficam presos no estado "aberto" para sempre depois do toque.

Tarefa:
1. Crie um componente de campo de data/hora com extensão por plataforma, seguindo
   CLAUDE.md §3.3 (diferença de plataforma por arquivo, nunca por `if (Platform.OS)` espalhado):
   - src/components/ui/DateTimeField.native.tsx — embrulha o DateTimePicker atual do
     @react-native-community/datetimepicker, preservando o comportamento hoje usado em cada
     tela (modo "datetime" com maximumDate em index.tsx; modo "time" com minuteInterval={15}
     em settings.tsx — pode expor `mode` e `minuteInterval` como props opcionais do wrapper).
   - src/components/ui/DateTimeField.web.tsx — usa um <input type="datetime-local"> (para o
     modo "datetime") ou <input type="time"> (para o modo "time") do próprio navegador, que é
     acessível por teclado e leitor de tela nativamente. Converta entre o valor do input
     (string) e Date na fronteira do componente — o resto do app continua só lidando com Date.
   - Assinatura comum aos dois arquivos: value: Date, mode: 'datetime' | 'time',
     onChange: (date: Date) => void, e o necessário para maximumDate/minuteInterval conforme o
     uso de cada tela. Sem export default fora de rotas do Expo Router — export nomeado.
2. Troque o uso de DateTimePicker por DateTimeField em app/(app)/index.tsx e
   app/(app)/settings.tsx, adaptando o onChange (hoje é (_event, date) => void; o novo
   componente só precisa do Date, então simplifique a chamada).
3. Corrija o efeito colateral: garanta que isPickerOpen/openSlotIndex sejam fechados
   corretamente tanto no fluxo nativo quanto no web após a escolha (ou cancelamento, se o
   <input> web tiver esse conceito).
4. Rode npm run lint && npm run typecheck && npm test.
5. Não é obrigatório, mas se for simples, adicione um teste do DateTimeField.web.tsx
   confirmando que onChange recebe um Date correto a partir do valor do <input>.

Commit:
fix(ui): tornar seleção de data e hora funcional na web
```

---

## Prompt 4 — BUG-09: horários de lembrete reportam erro falso na web

**Modelo recomendado:** Haiku 4.5 — puro split de arquivo por plataforma (`.native`/`.web`), repetindo um padrão que já existe no repositório (`registerPushToken`).

```
Contexto: no BP Tracker, src/features/reminders/localReminders.ts chama
Notifications.getAllScheduledNotificationsAsync() (expo-notifications) para reagendar
lembretes locais. Na web, o NotificationScheduler do pacote é só
`{ addListener: () => {}, removeListeners: () => {} }` — sem essa função. A chamada falha, o
catch de syncLocalReminders converte qualquer erro em GENERIC_MESSAGE, e
useReminderSettings.ts (linhas 74-80) propaga isso para o campo `error` da tela. Resultado: na
web, salvar horários GRAVA CORRETAMENTE no Firestore e mesmo assim mostra "Não foi possível
agendar os lembretes neste aparelho" — falso negativo que já tem precedente resolvido no mesmo
projeto: src/features/reminders/registerPushToken.web.ts já faz exatamente esse tipo de recusa
explícita e comentada para push na web.

Tarefa:
1. Renomeie src/features/reminders/localReminders.ts para
   src/features/reminders/localReminders.native.ts, mantendo o conteúdo e comportamento
   idênticos.
2. Crie src/features/reminders/localReminders.web.ts com um syncLocalReminders(times: string[])
   que seja um no-op explícito — comente por que (lembrete local via expo-notifications não
   tem suporte na web, no mesmo espírito de registerPushToken.web.ts), e resolva sem lançar
   erro nenhum, para não voltar a poluir o campo `error` de useReminderSettings.
3. Confira que todo import de `./localReminders` continua funcionando sem mudança (o Metro
   resolve pela extensão de plataforma automaticamente) — não deve haver import literal de
   `.native` ou `.web` em nenhum arquivo consumidor.
4. Rode npm run lint && npm run typecheck && npm test.
5. Adicione um teste (se a suíte já tiver algo equivalente para registerPushToken.web.ts, siga
   o mesmo padrão) confirmando que localReminders.web.ts resolve sem erro para uma lista de
   horários não vazia.

Commit:
fix(reminders): não reportar erro falso ao salvar horários na web
```

---

## Prompt 5 — BUG-06 + BUG-07 + BUG-10: feedback de exclusão e de salvar horários

**Modelo recomendado:** Sonnet 5 — três bugs relacionados e estado por linha na lista; complexidade média de UI/estado, sem decisão arquitetural nova.

```
Contexto: três problemas relacionados de feedback ao usuário no BP Tracker:

(a) BUG-06 — app/(app)/history.tsx:96 desestrutura `deleteReading` e `error` de
useDeleteReading(), mas IGNORA `isDeleting`. Não há indicador de progresso nem trava de duplo
toque durante a exclusão.

(b) BUG-07 — o erro de exclusão (`deleteError`, history.tsx:191-195) e o erro de exportação
(`exportError`, history.tsx:185-189) são renderizados dentro do ListHeaderComponent da
FlashList — ou seja, no TOPO ABSOLUTO da lista. Se o usuário excluir uma linha que está várias
rolagens abaixo, o erro aparece fora da área visível.

(c) BUG-10 — app/(app)/settings.tsx: handleSaveTimes (linhas 161-168) só trata erro; ao salvar
com sucesso não há nenhuma confirmação visual além do `loading` sumir.

Tarefa:
1. Crie um componente de feedback compartilhado (ex.: src/components/ui/InlineFeedback.tsx ou
   reaproveite/estenda um existente) para mensagens curtas de erro/sucesso, ancorado de forma
   visível independente de scroll — ex.: uma faixa fixa perto do botão de ação que a originou,
   fora de qualquer ScrollView/FlashList que role para longe dela.
2. Em app/(app)/history.tsx:
   - Consuma `isDeleting` de useDeleteReading. Desabilite a ação de excluir (ou mostre um
     indicador na própria ReadingRow) enquanto uma exclusão está em voo. Como o hook é
     compartilhado por toda a lista, identifique QUAL linha está sendo excluída (guarde o id
     junto do isDeleting, ou derive isso na própria tela) para o indicador aparecer só na linha
     certa, não na lista inteira.
   - Mova a exibição de deleteError e exportError para fora do ListHeaderComponent, num local
     que permaneça visível (ex.: ancorado à SafeAreaView, fora da FlashList).
3. Em app/(app)/settings.tsx: adicione um estado de sucesso curto ("Horários salvos") exibido
   com o mesmo componente de feedback, disparado quando updateReminderTimes resolve `true`.
4. Todo texto de erro/sucesso continua em português, sem expor error.message cru
   (CLAUDE.md §4.3).
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(readings): exibir progresso e erro de exclusão onde o usuário vê
```

*(Se preferir, este prompt pode ser dividido em três commits menores — um por sub-bug — mas o
plano original os agrupou por serem a mesma causa: feedback que não chega ao usuário no momento
certo.)*

---

## Prompt 6 — BUG-05: App Check nunca é inicializado

**Modelo recomendado:** Sonnet 5 — um único ponto de chamada, mas exige avaliar ordem de inicialização/import circular com cuidado antes de escolher onde encaixar.

```
Contexto: no BP Tracker, src/services/firebase/appCheck.web.ts e appCheck.native.ts exportam
initAppCheck(), mas a função não é importada nem chamada em NENHUM lugar do projeto (confirmado
por busca em app/ e src/). O comentário do próprio arquivo diz que ela "precisa rodar ANTES da
primeira chamada a Firestore/Auth" — hoje isso nunca acontece, e o CLAUDE.md §4.4 descreve a
proteção dos dados como "Security Rules + App Check", quando hoje só as rules estão de pé.

Tarefa:
1. Decida o ponto de chamada mais cedo possível no bootstrap, antes de qualquer uso de
   firestore/auth — o candidato natural é o topo de src/services/firebase/index.ts (que hoje só
   reexporta app/auth/firestore) ou o topo de app/_layout.tsx, ANTES da montagem de
   SessionProvider. Prefira services/firebase/index.ts se isso não criar import circular com
   ./firebase (app precisa existir primeiro — confirme a ordem).
2. Chame initAppCheck() lá. A função já retorna null sem lançar quando a site key não está
   configurada (extra?.appCheck?.recaptchaSiteKey ausente) — não precisa de tratamento de erro
   adicional no ponto de chamada, só não ignore silenciosamente um retorno inesperado
   (ex.: logue com logError se quiser rastrear ausência de inicialização em produção, mas isso
   é opcional — a função já loga sozinha via logError('appCheck.init', ...) quando falha).
3. Confirme que isto NÃO quebra os testes existentes: appCheck.native.ts/appCheck.web.ts podem
   precisar de mock em jest.setup.js se initializeAppCheck tocar em algo que o ambiente de
   teste não tem (ex.: window.recaptcha na web, Play Integrity no nativo). Rode npm test e
   ajuste o mock necessário se algo quebrar.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(security): inicializar App Check no bootstrap do app
```

---

## Prompt 7 — BUG-04: `logError` descarta tudo em produção (decisão: documentar por ora)

**Modelo recomendado:** Haiku 4.5 — só documentação, nenhuma mudança de comportamento em runtime.

```
Contexto: no BP Tracker, src/lib/logger.ts define setCrashReporter() para conectar um coletor
de erro (Crashlytics ou equivalente) em produção, mas essa função NUNCA é chamada em lugar
nenhum do projeto. Em produção (quando __DEV__ é false), logError executa
`crashReporter?.recordError(...)` sobre um crashReporter que é sempre null — ou seja, hoje TODO
erro de produção do app é descartado silenciosamente, apesar de o resto do código seguir à
risca o padrão de "todo catch faz algo" (CLAUDE.md §4.5).

Decisão tomada para este prompt: NÃO integrar o Crashlytics agora. O motivo é que
@react-native-firebase/crashlytics é uma dependência nativa nova, que CLAUDE.md §4.1 pede para
não adicionar sem justificar peso de bundle e compatibilidade com Expo antes — isso merece uma
decisão à parte, não embutida numa correção de bug. Este prompt só torna o estado atual honesto
e rastreável, para não parecer que o app tem telemetria de erro em produção quando não tem.

Tarefa:
1. Em src/lib/logger.ts, adicione um comentário claro acima de setCrashReporter (ou do bloco de
   produção dentro de logError) documentando que, até este ponto, NENHUM coletor foi conectado
   em nenhuma parte do app — logError em produção é hoje um no-op silencioso — e aponte
   setCrashReporter como o ponto de extensão para quando isso for resolvido.
2. Abra a pendência no RELEASE_CHECKLIST.md (procure a seção mais próxima de observabilidade/
   monitoramento; se não houver uma, crie um item claro) descrevendo: "logError não envia nada
   em produção hoje — setCrashReporter() precisa ser chamado no bootstrap com um coletor real
   (ex.: @react-native-firebase/crashlytics) antes do lançamento." Não implemente a integração
   em si.
3. Não altere nenhum comportamento de runtime — este é um passo de documentação, não de código
   funcional. Ainda assim rode npm run lint && npm run typecheck && npm test para garantir que
   nada quebrou.

Commit:
docs(logger): registrar pendência de conectar coletor de erro em produção
```

---

## Prompt 8 — BUG-08: sem persistência offline do Firestore na web

**Modelo recomendado:** Opus 5 — API do SDK do Firestore sensível à versão instalada; um erro aqui quebra o offline-first de forma silenciosa, difícil de notar em revisão superficial.

```
Contexto: no BP Tracker, src/services/firebase/firebase.web.ts inicializa o Firestore com
getFirestore(app), sem cache persistente. O SDK web só ativa cache em IndexedDB quando pedido
explicitamente via initializeFirestore com localCache — getFirestore sozinho usa só memória.
CLAUDE.md descreve o banco como "offline-first" e o app já mostra um selo de "Pendente de
sincronização" (hasPendingWrites em ReadingRow) que pressupõe esse comportamento. Na web hoje,
uma escrita pendente que ainda não sincronizou se perde num reload da aba.

Tarefa:
1. Em src/services/firebase/firebase.web.ts, troque getFirestore(app) por initializeFirestore
   com persistentLocalCache({ tabManager: persistentMultipleTabManager() }) do pacote
   firebase/firestore (SDK modular já em uso no projeto — confira a versão instalada de
   `firebase` no package.json e a API correspondente de initializeFirestore/persistentLocalCache/
   persistentMultipleTabManager, que mudou de nome entre versões do SDK).
   - Use persistentMultipleTabManager (não persistentSingleTabManager) porque o app pode ficar
     aberto em múltiplas abas.
   - Trate o caso de falha de inicialização do cache (ex.: navegador sem suporte a IndexedDB,
     modo privado) — a API lança em alguns cenários; decida entre deixar propagar (o app já
     trata erro de bootstrap do Firebase lançando no módulo, como no caso de firebaseConfig
     ausente) ou fazer fallback para getFirestore(app) sem cache, registrando com logError. Se
     optar pelo fallback, documente por quê no comentário.
2. Não altere firebase.native.ts — a persistência ali já é tratada à parte (AsyncStorage só
   cobre Auth; confirme se o Firestore nativo já tem cache por padrão via SQLite — se sim, não
   mexa nesse arquivo neste commit).
3. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(firebase): ativar cache persistente do Firestore na web
```

---

## Prompt 9 — BUG-11: chave de lista por índice em settings

**Modelo recomendado:** Haiku 4.5 — refactor trivial e isolado, sem ambiguidade de design.

```
Contexto: no BP Tracker, app/(app)/settings.tsx:208 usa `key={index}` ao mapear os 3 slots de
horário de lembrete (slots.map((slot, index) => ...)). CLAUDE.md §3.4 proíbe key por índice em
listas — hoje é inofensivo porque a lista tem tamanho fixo (3) e nunca reordena, mas quebra
silenciosamente no dia em que isso deixar de ser verdade.

Tarefa:
1. Dê a cada slot um identificador estável. Como DEFAULT_SLOTS (app/(app)/settings.tsx) é uma
   lista fixa hoje sem id próprio, adicione um campo `id` a ReminderSlot (ex.: o índice fixo do
   slot na constante DEFAULT_SLOTS, ou um valor descritivo como 'morning' | 'afternoon' |
   'evening' — escolha o que ficar mais claro dado que os defaults já são horários fixos
   08:00/14:00/20:00) e propague esse id por slotsFromReminderTimes.
2. Troque key={index} por key={slot.id} no map de renderização.
3. Confirme que handleToggleSlot e handleChangeSlotTime, que hoje indexam por posição
   (slotIndex === index), continuam corretos — o id é só para a key de React, a lógica de
   estado pode continuar por índice se for mais simples, desde que a key deixe de ser o índice.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
refactor(reminders): usar chave estável nos slots de horário
```

---

## Prompt 10 — BUG-03: exclusão inalcançável sem gesto de swipe (decisão: botão persistente)

**Modelo recomendado:** Sonnet 5 — adiciona UI de acessibilidade num componente já auditado; precisa de cuidado de layout, não de arquitetura nova.

```
Contexto: no BP Tracker, src/components/bp/ReadingRow.tsx só expõe a ação de excluir dentro de
renderRightActions do Swipeable (linhas 58-80) — ou seja, o botão "Excluir" só é montado quando
a linha já foi arrastada. Isso é inalcançável por gesto de swipe para quem navega com
TalkBack/VoiceOver ou por teclado na web, e não há nenhuma outra affordance de exclusão na tela
— violando CLAUDE.md §4.7 (todo elemento interativo alcançável e anunciado; alvos ≥48dp) para um
público que inclui pessoas idosas.

Decisão tomada para este prompt: adicionar um botão de lixeira PERSISTENTE e visível na própria
linha (não só dentro do swipe), em vez de só accessibilityActions. Motivo: accessibilityActions
resolve leitor de tela, mas não resolve a DESCOBERTA na web (sem gesto de swipe funcional em
mouse, sem um botão visível o usuário não sabe que dá para excluir) nem o acesso por teclado. Um
botão visível resolve os três casos de uma vez. Se depois disso o peso visual do botão incomodar
no design, ajustar estilo é mais barato do que reabrir a arquitetura da interação.

Tarefa:
1. Em src/components/bp/ReadingRow.tsx, adicione um botão-ícone de lixeira (48×48dp mínimo,
   accessibilityRole="button", accessibilityLabel="Excluir medição") na área da linha (fora do
   conteúdo que só aparece no swipe) que também chama onRequestDelete(id) — pode reaproveitar
   handleDeletePress. Posicione com bom senso de layout dentro da grade existente (ex.: um
   ícone discreto ao lado do BpCategoryBadge, ou substituindo o padding final da linha) —
   priorize não quebrar o layout de 48dp de toque nem sobrepor outros elementos tocáveis.
2. Mantenha o swipe-to-delete como atalho adicional (não remova o Swipeable) — os dois caminhos
   coexistem.
3. Complementarmente, adicione accessibilityActions={[{ name: 'delete', label: 'Excluir
   medição' }]} e onAccessibilityAction correspondente na View acessível da linha (linha 81-83
   hoje), para leitores de tela que preferem esse padrão a navegar até um botão extra.
4. Nenhuma informação da nova affordance pode depender só de cor — o ícone de lixeira já cumpre
   isso ao ser um símbolo reconhecível, mas confirme que o accessibilityLabel deixa a ação
   explícita em texto.
5. Rode npm run lint && npm run typecheck && npm test. Se o teste de exclusão criado no
   Prompt 1/2 disparava a ação via swipe, considere adicionar um segundo caso disparando pelo
   novo botão persistente, para os dois caminhos ficarem cobertos.

Commit:
fix(a11y): tornar exclusão alcançável sem gesto de swipe
```

---

## Como usar

- Rode os prompts **na ordem** — vários dependem do estado deixado pelo anterior (ex.: o Prompt 2
  espera o teste do Prompt 1 já existir; o Prompt 5 assume o ConfirmDialog do Prompt 2 no ar).
- Cada prompt termina em UM commit. Depois do último, revise o diff acumulado e faça `git push`
  para `claude/bp-tracker-delete-bug-dkfioa` (ou peça para eu fazer).
- Se quiser paralelizar em sessões/agentes separados, os únicos pares seguros para rodar em
  paralelo (sem conflito de arquivo) são: {Prompt 4, Prompt 6, Prompt 8, Prompt 9} entre si — os
  demais tocam em `history.tsx`, `settings.tsx` ou `ReadingRow.tsx` e devem ser sequenciais.
- O modelo indicado em cada prompt (tabela em "Modelo recomendado por prompt") é o ponto de
  partida ao abrir a sessão — troque com `/model` no Claude Code CLI antes de colar o prompt.
  São recomendações, não requisitos: se preferir rodar tudo num único modelo por simplicidade,
  Sonnet 5 é o piso seguro para qualquer um dos dez.
