# Plano de Correções — BP Tracker

> Documento de diagnóstico. **Nenhuma correção foi aplicada ainda** — este arquivo lista o que
> está quebrado, por que está quebrado e como pretendo consertar, para revisão antes da execução.
>
> Data da análise: 2026-08-13 · Branch: `claude/bp-tracker-delete-bug-dkfioa` · Base: `4d4c679`

---

## 0. Verificação de ambiente

Rodado com as dependências reais instaladas (`npm install` a partir do `package-lock.json`):

| Checagem | Comando | Resultado |
|---|---|---|
| Tipos | `npx tsc --noEmit` | ✅ **0 erros** |
| Lint | `npm run lint` | ✅ **0 erros, 0 avisos** |
| Testes | `npm test` | ✅ **6 suítes, 53 testes, todos passando** |

**Conclusão importante:** as três ferramentas estão limpas. Nenhum dos bugs abaixo é detectável por
`tsc`, ESLint ou pela suíte atual — todos são falhas de **integração em runtime**, e a maioria só se
manifesta **na plataforma web**. É exatamente por isso que passaram batido até agora. Isso também
significa que o plano de correção precisa incluir testes novos, senão a mesma classe de bug volta.

---

## 1. Diagnóstico do bug relatado: o botão "Excluir" do histórico

### 1.1 Rastreamento completo do fluxo

Segui a cadeia inteira, do gesto até o Firestore:

| # | Camada | Arquivo | Status |
|---|---|---|---|
| 1 | Gesto de swipe abre a ação | `src/components/bp/ReadingRow.tsx:75` (`<Swipeable>`) | ✅ OK |
| 2 | Botão "Excluir" renderizado | `ReadingRow.tsx:58-72` (`renderRightActions` → `RectButton`) | ✅ OK |
| 3 | `onPress` do botão | `ReadingRow.tsx:53-56` (`handleDeletePress`) | ✅ OK |
| 4 | Callback sobe para a tela | `ReadingRow.tsx:55` → `onRequestDelete(id)` — o `id` **é** passado corretamente | ✅ OK |
| 5 | Tela pede confirmação | `app/(app)/history.tsx:104-115` (`handleRequestDelete` → **`Alert.alert`**) | ❌ **QUEBRA AQUI** |
| 6 | Hook de exclusão | `src/features/readings/useDeleteReading.ts:21` | ⛔ nunca alcançado |
| 7 | Repositório / Firestore | `src/features/readings/readings.repo.ts:61` (`deleteDoc`) | ⛔ nunca alcançado |
| 8 | Security rule de delete | `firestore.rules:74` (`allow delete: if isOwner(uid)`) | ✅ OK (permite) |
| 9 | Lista se atualiza sozinha | `useReadings.ts:70` (`onSnapshot`) | ✅ OK (atualizaria) |

### 1.2 Causa raiz

**`Alert.alert()` não faz absolutamente nada no `react-native-web`.** Não é um bug de
configuração nem de versão: é a implementação oficial do pacote, um método vazio.

Evidência direta, extraída de `node_modules/react-native-web/dist/exports/Alert/index.js`
(versão instalada: `react-native-web@0.21.x`):

```js
class Alert {
  static alert() {}
}
export default Alert;
```

O corpo do método é literalmente `{}`. Ele não abre diálogo, não lança erro, não retorna nada, não
imprime aviso no console. É um buraco negro silencioso.

**Consequência exata no app:** ao tocar em "Excluir", `handleRequestDelete` é chamado corretamente,
com o `readingId` correto, e invoca `Alert.alert(...)`. O array de botões — incluindo o
`onPress: () => { void deleteReading(readingId) }` — é **passado como argumento para uma função que
descarta seus argumentos**. O diálogo de confirmação nunca aparece, o `onPress` do botão "Excluir"
do diálogo nunca é executado, `deleteReading` nunca é chamado, nenhuma requisição sai para o
Firestore e nenhum estado muda. **O clique não faz nada** — precisamente o sintoma relatado.

### 1.3 Escopo do defeito

- **Web (Vercel / `npx expo start --web`): 100% quebrado.** Impossível excluir uma medição.
- **Android (Dev Client / build de produção): funcionando.** No nativo o `Alert` é real, o diálogo
  aparece, e o restante da cadeia (itens 6 a 9) está correto — inclusive a atualização automática da
  lista via `onSnapshot`, que já cobre o "a tela não atualiza".

Ou seja: **o bug é exclusivo da web.** Vale confirmar em qual plataforma você reproduziu — se foi no
Android, o problema é outro e eu preciso do erro/console para seguir. Como o projeto tem deploy web
configurado (`vercel.json`, `web.output: 'single'`, e um commit anterior corrigindo tela branca na
web), assumi a web como o ambiente do relato.

### 1.4 O mesmo defeito atinge outros três pontos do app

`Alert.alert` é usado em mais quatro lugares, todos igualmente mortos na web:

| Local | O que deixa de funcionar na web |
|---|---|
| `settings.tsx:107` | **"Excluir minha conta" não faz nada.** A exclusão de conta (obrigação LGPD) é inalcançável na web. |
| `settings.tsx:116` | Segunda confirmação da exclusão de conta — idem. |
| `settings.tsx:128` | Confirmação de "Conta excluída" nunca é exibida. |
| `settings.tsx:147` | Falha ao abrir a política de privacidade não avisa nada ao usuário. |

Este é o item mais grave da varredura depois do bug relatado: o caminho de exclusão de conta está
morto na web, e ele existe para cumprir a LGPD.

---

## 2. Varredura proativa — demais problemas encontrados

Ordenados por severidade. Cada item traz **onde**, **causa raiz** e **estratégia de correção**.

---

### 🔴 BUG-01 — `Alert.alert` é um no-op na web (o bug relatado)

- **Onde:** `app/(app)/history.tsx:105` · `app/(app)/settings.tsx:107,116,128,147`
- **Causa raiz:** ver §1.2. API só-nativa usada em código compartilhado com a web.
- **Impacto:** excluir medição e excluir conta são impossíveis na web; erros silenciosos.
- **Estratégia de correção:**
  1. Criar `src/components/ui/ConfirmDialog.tsx` — diálogo próprio construído sobre o `Modal` do
     React Native, que **tem** implementação real no `react-native-web`. Props:
     `visible`, `title`, `message`, `confirmLabel`, `isDestructive`, `onConfirm`, `onCancel`.
  2. Criar `src/store/useConfirmDialog.ts` (ou um hook local `useConfirm`) para a chamada ficar tão
     curta quanto o `Alert.alert` era, sem espalhar estado de visibilidade por cada tela.
  3. Substituir as 5 chamadas de `Alert.alert` pelo novo componente. Remover o import de `Alert`.
  4. O diálogo nasce acessível por construção (§4.7): `accessibilityViewIsModal`, foco inicial no
     botão de cancelar, alvos de 48dp, `accessibilityRole="button"` nas ações, sem informação
     transmitida só por cor.
- **Alternativa considerada e descartada:** `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)`.
  É menor, mas (a) espalha `Platform.OS` pelo código de tela, contra o §3.3 do CLAUDE.md, (b) o
  `window.confirm` é um diálogo do navegador, sem estilo, sem controle de acessibilidade e bloqueante,
  e (c) não resolve o `Alert.alert` informativo de "Conta excluída", que não é uma confirmação.
- **Teste que acompanha a correção:** teste RNTL que renderiza o histórico, dispara a ação de
  excluir, confirma no diálogo e verifica que `deleteReading` foi chamado com o ID correto. Esse
  teste falha hoje e passa depois — é o teste de regressão pedido pelo §4.6.

---

### 🔴 BUG-02 — `DateTimePicker` renderiza `null` na web: impossível editar horários

- **Onde:** `app/(app)/index.tsx:147-154` (horário da medição) · `app/(app)/settings.tsx:241-253` (horários de lembrete)
- **Causa raiz:** exatamente a mesma classe do BUG-01. O `@react-native-community/datetimepicker`
  não tem implementação web; o arquivo padrão (`src/datetimepicker.js`, usado quando não existe
  `.android.js`/`.ios.js`) é:

  ```js
  export default function DateTimePicker(_props) {
    React.useEffect(() => {
      console.warn(`DateTimePicker is not supported on: ${Platform.OS}`);
    }, []);
    return null;
  }
  ```

  Ele **renderiza `null`** e só avisa no console.
- **Impacto na web (dois botões mortos, no caminho principal do app):**
  1. **Registrar:** tocar no carimbo de data/hora não abre nada — é impossível registrar uma medição
     com horário retroativo.
  2. **Ajustes:** tocar num horário de lembrete não abre nada — é impossível editar os horários,
     que é o recurso central do produto ("fazer o usuário medir 3x ao dia sem esquecer").
  3. **Efeito colateral:** como `onChange` nunca dispara, `isPickerOpen` fica preso em `true` e
     `openSlotIndex` fica preso no índice para sempre. O estado nunca é limpo.
- **Estratégia de correção:** criar `src/components/ui/DateTimeField` com extensão de plataforma
  (`DateTimeField.native.tsx` / `DateTimeField.web.tsx`), do jeito que o §3.3 do CLAUDE.md manda —
  diferença de plataforma por arquivo, não por `if (Platform.OS)`. O `.native` embrulha o
  `DateTimePicker` atual; o `.web` usa `<input type="datetime-local">` / `<input type="time">`, que
  é nativo do navegador, acessível por teclado e por leitor de tela. As duas telas passam a
  consumir o mesmo componente, com a mesma assinatura (`value: Date`, `onChange: (date: Date) => void`).

---

### 🟠 BUG-03 — Ação de excluir é inalcançável por leitor de tela e por teclado

- **Onde:** `src/components/bp/ReadingRow.tsx:58-80`
- **Causa raiz:** o botão "Excluir" só existe **dentro do `renderRightActions` do `Swipeable`**, ou
  seja, só é montado quando a linha já foi arrastada. Um gesto de arrastar não é executável por quem
  navega com TalkBack/VoiceOver nem por quem usa teclado na web. Não existe nenhuma outra
  affordance de exclusão na tela.
- **Impacto:** viola o §4.7 do CLAUDE.md (todo elemento interativo precisa ser alcançável e
  anunciado) — e o público-alvo declarado do app inclui pessoas idosas. Na web, some também a
  descoberta: sem um botão visível, o usuário não tem como saber que o swipe existe.
- **Estratégia de correção:** manter o swipe como **atalho** e adicionar um caminho explícito:
  1. `accessibilityActions={[{ name: 'delete', label: 'Excluir medição' }]}` + `onAccessibilityAction`
     na `View` da linha — resolve o leitor de tela sem poluir o visual.
  2. Um botão-ícone de lixeira persistente na linha (48×48dp, `accessibilityLabel="Excluir medição"`),
     alcançável por toque e por teclado.
  - Como o item 2 mexe no desenho da linha, que passou por auditoria visual recente (`43f40fd`),
    proponho decidir isso junto com você antes de implementar.

---

### 🟠 BUG-04 — Em produção, `logError` descarta todos os erros silenciosamente

- **Onde:** `src/lib/logger.ts:50,157` — `setCrashReporter` **nunca é chamado em lugar nenhum do projeto**
  (confirmado por busca em `app/` e `src/`).
- **Causa raiz:** `crashReporter` permanece `null` para sempre. Em `__DEV__` o `logError` imprime no
  console; **em produção ele executa `crashReporter?.recordError(...)` num `null` e não faz nada.**
- **Impacto:** todo o esforço de tratamento de erro do app (repositórios, listeners, parse de
  documentos) não produz nenhum sinal observável em produção. Se este bug de exclusão tivesse
  acontecido no nativo, não haveria nenhum rastro para diagnosticar. Contraria o §4.5 ("todo `catch`
  faz algo") e o §4.3.
- **Estratégia de correção:** decidir e registrar o destino do log em produção. Duas saídas honestas:
  (a) chamar `setCrashReporter` no bootstrap do `app/_layout.tsx` com um coletor real; ou
  (b) se o Crashlytics ainda não faz parte do escopo, documentar explicitamente no `logger.ts` que
  produção hoje é no-op e abrir a pendência no `RELEASE_CHECKLIST.md`, para não ficar parecendo que
  o app tem telemetria de erro quando não tem. Recomendo (b) agora e (a) antes do lançamento.

---

### 🟠 BUG-05 — App Check nunca é inicializado (código morto)

- **Onde:** `src/services/firebase/appCheck.web.ts` / `appCheck.native.ts` — a função `initAppCheck`
  **não é importada nem chamada em nenhum lugar** (confirmado por busca).
- **Causa raiz:** `src/services/firebase/index.ts` só reexporta `app`, `auth` e `firestore`. O módulo
  de App Check ficou órfão.
- **Impacto:** o §4.4 do CLAUDE.md afirma que "o que protege os dados são as Security Rules + App
  Check". Hoje só as rules estão de pé. Além disso o próprio comentário do arquivo avisa que a
  inicialização "precisa rodar ANTES da primeira chamada a Firestore/Auth" — hoje não roda nunca.
- **Estratégia de correção:** chamar `initAppCheck()` no bootstrap, antes do primeiro acesso ao
  Firestore/Auth (topo de `src/services/firebase/index.ts` ou início do `app/_layout.tsx`). A função
  já retorna `null` sem lançar quando a site key não está configurada, então ligá-la é seguro mesmo
  antes de o App Check existir no Console.

---

### 🟡 BUG-06 — Exclusão de medição sem feedback e sem trava de duplo toque

- **Onde:** `app/(app)/history.tsx:96` — `const { deleteReading, error: deleteError } = useDeleteReading()`
- **Causa raiz:** o hook expõe `isDeleting`, mas a tela **não o consome**. Não há indicador de
  progresso nem bloqueio de repetição enquanto a exclusão está em voo.
- **Impacto:** offline ou com rede ruim, o usuário toca em excluir, nada visível acontece, e ele
  repete a ação. Baixo risco de dano (deletar duas vezes o mesmo documento é idempotente), mas é
  ruído no caminho de uma ação destrutiva.
- **Estratégia de correção:** consumir `isDeleting` e desabilitar a ação / mostrar indicador na linha
  em exclusão. Como o hook é compartilhado pela lista inteira, guardar também o `id` em exclusão,
  para o indicador aparecer só na linha certa.

---

### 🟡 BUG-07 — Erro de exclusão aparece fora da vista do usuário

- **Onde:** `app/(app)/history.tsx:191-195` — `deleteError` é renderizado dentro do `ListHeaderComponent`
- **Causa raiz:** o cabeçalho da `FlashList` fica no **topo absoluto** da lista, acima do gráfico de
  tendência. Se a exclusão falhar (ex.: `permission-denied`) numa linha que está a três rolagens de
  distância, a mensagem é escrita num ponto da tela que o usuário não está vendo.
- **Impacto:** contraria o §4.3, que exige mensagem clara do que aconteceu em falha de operação
  destrutiva. Na prática, a falha vira silêncio.
- **Estratégia de correção:** exibir o erro num container fixo, ancorado ao rodapé da tela
  (fora da `FlashList`) — um toast/banner discreto. Vale aplicar o mesmo tratamento ao `exportError`,
  que hoje tem o mesmo problema.

---

### 🟡 BUG-08 — Web sem persistência offline do Firestore

- **Onde:** `src/services/firebase/firebase.web.ts:22` — `getFirestore(app)` sem cache persistente
- **Causa raiz:** o SDK web só ativa cache em IndexedDB se for pedido explicitamente
  (`initializeFirestore(app, { localCache: persistentLocalCache() })`). O comentário no arquivo trata
  só de persistência de **Auth**, que de fato é automática na web — a de **Firestore** não é.
- **Impacto:** o CLAUDE.md define o banco como "offline-first". Na web, escritas pendentes vivem só
  na memória da aba: um reload antes da sincronização perde a medição. O selo "Pendente de
  sincronização" da `ReadingRow` também não sobrevive ao reload.
- **Estratégia de correção:** trocar por `initializeFirestore` com `persistentLocalCache` +
  `persistentMultipleTabManager` no `firebase.web.ts`. Isolado ao arquivo de plataforma, sem tocar
  em código de aplicação.

---

### 🟡 BUG-09 — Salvar horários de lembrete na web sempre exibe erro, mesmo tendo salvo

- **Onde:** `src/features/reminders/localReminders.ts:38` chamado por `useReminderSettings.ts:74-80`
- **Causa raiz:** terceira ocorrência da mesma classe de bug. Na web, o
  `NotificationScheduler` do `expo-notifications` é apenas
  `{ addListener: () => {}, removeListeners: () => {} }` — sem
  `getAllScheduledNotificationsAsync`. A chamada falha, o `catch` de `syncLocalReminders` converte
  qualquer coisa em `GENERIC_MESSAGE` e o hook joga isso em `error`.
- **Impacto:** na web, salvar horários **grava corretamente no Firestore** e mesmo assim mostra
  "Não foi possível agendar os lembretes neste aparelho". O usuário conclui que falhou. Falso negativo.
- **Estratégia de correção:** dar a `localReminders` extensões de plataforma
  (`localReminders.native.ts` / `localReminders.web.ts`), como já foi feito em `registerPushToken`.
  A versão web vira um no-op explícito e comentado — lembrete local não existe na web, e o
  `registerPushToken.web.ts` já recusa push por lá.

---

### 🔵 BUG-10 — "Salvar horários" não confirma sucesso

- **Onde:** `app/(app)/settings.tsx:161-168`
- **Causa raiz:** `handleSaveTimes` só propaga erro; em caso de sucesso não há retorno visual algum
  além do `loading` sumir.
- **Estratégia:** mensagem discreta de confirmação ("Horários salvos"), no mesmo componente de
  feedback do BUG-07.

---

### 🔵 BUG-11 — `key={index}` na lista de horários

- **Onde:** `app/(app)/settings.tsx:208`
- **Causa raiz:** chave de lista pelo índice. Hoje é inofensivo (a lista tem tamanho fixo 3 e não
  reordena), mas o §3.4 do CLAUDE.md proíbe a prática e ela quebra silenciosamente no dia em que
  `MAX_REMINDER_TIMES` virar dinâmico.
- **Estratégia:** usar o horário do slot como chave, ou um id estável no `DEFAULT_SLOTS`.

---

### 🔵 BUG-12 — URL da política de privacidade é um placeholder

- **Onde:** `app/(app)/settings.tsx:27`
- **Causa raiz:** placeholder deliberado (`https://SUBSTITUIR-...exemplo`), já sinalizado em comentário.
- **Impacto:** não é bug de código, é bloqueador de publicação — a Play Store exige política de
  privacidade válida em app que trata dado de saúde.
- **Estratégia:** apenas garantir que está no `RELEASE_CHECKLIST.md`. Não mexo no código.

---

## 3. O que eu verifiquei e está correto

Para você saber onde **não** precisa olhar:

- ✅ **Nenhum handler vazio ou comentado** (`onPress={() => {}}`) em todo o `app/` e `src/`.
- ✅ **Nenhum `console.log`** em código de produção — só o `console.error` autorizado dentro do
  `logger.ts`, protegido por `__DEV__`.
- ✅ **Nenhum `catch` vazio** engolindo erro em silêncio; todo `catch` produz mensagem amigável em
  português ou loga com contexto.
- ✅ **`e.preventDefault()` não se aplica:** o app não usa `<form>` HTML em lugar nenhum — os
  formulários são compostos por `TextInput` + `Pressable` do React Native, que não têm submit nativo,
  logo não existe o risco de recarregamento de página.
- ✅ **Atualização de tela após criar/excluir está correta:** tudo passa por `onSnapshot`
  (`useReadings`, `subscribeReminderSettings`), com `unsubscribe` devolvido no cleanup do `useEffect`
  em todos os casos. Não há listener vazando nem lista que precise ser filtrada na mão.
- ✅ **Todas as chamadas assíncronas ao Firebase estão em `try/catch`** com mensagem em português e
  tratamento dos códigos `permission-denied` / `unavailable` — o padrão é consistente entre
  `readings.repo`, `reminders.repo`, `auth.repo` e `deleteAccount`.
- ✅ **O ID da medição é passado corretamente** por toda a cadeia (`docSnapshot.id` → `ReadingListItem.id`
  → `keyExtractor` → `onRequestDelete`). Esta hipótese foi investigada e descartada.
- ✅ **`firestore.rules` permite o delete** (`allow delete: if isOwner(uid)`, linha 74) — não é
  `permission-denied`.
- ✅ **`firestore-paths.ts` monta o caminho certo** e é a fonte única, sem string literal espalhada.
- ✅ **Não há erro de CORS possível:** o cliente fala com o Firestore pelo SDK, não há API própria.
- ✅ **Cloud Functions:** `onUserDelete`, `onUserSettingsWrite` e `dispatchReminders` tratam erro,
  logam com `logger` do `firebase-functions` e **relançam** de propósito para acionar retry/alerta.
  Sem problemas encontrados.
- ✅ **`FlashList` com `stickyHeaderIndices` e `getItemType`** é suportado na versão 2.3.2 instalada
  (verificado no pacote). Não é fonte do bug.

---

## 4. Ordem de execução proposta

Se você autorizar, executo nesta ordem, **um commit atômico por item** (Conventional Commits, §4.2),
rodando `npm run lint && npm run typecheck && npm test` antes de cada commit:

| Passo | Item | Commit previsto |
|---|---|---|
| 1 | Teste de regressão que **falha** hoje (exclusão não chama `deleteReading`) | `test(readings): cobrir exclusão de medição na confirmação` |
| 2 | BUG-01 — `ConfirmDialog` + troca das 5 chamadas de `Alert.alert` | `fix(ui): substituir Alert.alert por diálogo próprio compatível com a web` |
| 3 | BUG-02 — `DateTimeField` com extensão de plataforma | `fix(ui): tornar seleção de data e hora funcional na web` |
| 4 | BUG-09 — `localReminders` por plataforma | `fix(reminders): não reportar erro falso ao salvar horários na web` |
| 5 | BUG-07 + BUG-06 + BUG-10 — feedback ancorado e estado de exclusão | `fix(readings): exibir progresso e erro de exclusão onde o usuário vê` |
| 6 | BUG-05 — ligar o App Check | `fix(security): inicializar App Check no bootstrap do app` |
| 7 | BUG-04 — resolver o destino do log de produção | `fix(logger)` ou `docs(logger)`, conforme a decisão |
| 8 | BUG-08 — persistência offline na web | `fix(firebase): ativar cache persistente do Firestore na web` |
| 9 | BUG-11 — chave de lista | `refactor(reminders): usar chave estável nos slots de horário` |
| 10 | BUG-03 — acessibilidade da exclusão | `fix(a11y): tornar exclusão alcançável sem gesto de swipe` |

**Duas decisões que preciso de você antes de começar:**

1. **BUG-03** mexe no visual da `ReadingRow`, que passou por auditoria recente — botão persistente,
   só `accessibilityActions`, ou deixar para depois?
2. **BUG-04** — o Crashlytics entra no escopo agora, ou documento a pendência e sigo?

**Fora do escopo desta varredura** (não investiguei, me avise se quiser): as `firestore.rules` sob
emulador (`npm run test:rules` exige o emulador rodando), o pipeline de push fim-a-fim, e a
performance da lista com histórico grande.
