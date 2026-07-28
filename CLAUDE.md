# CLAUDE.md — Manual de Instruções do Repositório

> Instruções permanentes para o Claude ao trabalhar neste repositório.
> O plano de desenvolvimento completo (modelagem, security rules, pipeline de lembretes, fases) está em [`PLAN.md`](./PLAN.md) — consulte-o antes de tomar decisões de arquitetura.

---

## 1. Visão Geral do Projeto

**BP Tracker** — aplicativo de registro de pressão arterial cujo objetivo central é **fazer o usuário medir 3x ao dia sem esquecer**.

| Camada | Tecnologia |
|---|---|
| App (Android + Web) | React Native via **Expo** (Expo Router, Dev Client, EAS Build) |
| Autenticação | **Firebase Auth** — login com Google, provedor único |
| Banco de dados | **Cloud Firestore** (offline-first, `onSnapshot` para realtime) |
| Backend serverless | **Cloud Functions v2** + **Cloud Scheduler** + **FCM** |
| Estilo | **NativeWind v4** (tokens compartilhados entre nativo e web) |

**Princípio de arquitetura:** o cliente fala **direto** com o Firestore — não existe API intermediária. O backend serverless existe para **uma única coisa**: disparar lembretes push. Todo o resto (CRUD, histórico, export CSV) é client-side, protegido por Security Rules.

**Objetivo de UX (norteia toda decisão de interface):**
- Registrar uma medição em **≤ 10 segundos e 4 toques**. A home **é** o formulário — nunca introduza um passo "toque no + para adicionar".
- A notificação abre direto no formulário via deep link (`bptracker://record`).
- Interface calma e clínica. **Teal é a cor primária, não vermelho** — alarme constante em app de pressão gera ansiedade e abandono. Vermelho fica reservado ao badge de classificação.
- O app **registra**, não diagnostica. Nunca gere linguagem alarmista automatizada nem texto que soe como orientação médica.

---

## 2. Comandos Principais

### Desenvolvimento
```bash
npm install                      # instalar dependências (raiz)
npx expo start --dev-client      # app em dev (Android via Dev Client)
npx expo start --web             # app no navegador
npx expo start -c                # limpar cache do Metro (1º recurso em bug estranho de bundle)
```

> ⚠️ **Não use Expo Go.** Google Sign-In nativo e FCM exigem código nativo — sempre `--dev-client`.

### Firebase
```bash
firebase emulators:start                       # Auth + Firestore + Functions locais
firebase deploy --only firestore:rules         # publicar security rules
firebase deploy --only firestore:indexes       # publicar índices
firebase deploy --only functions               # publicar Cloud Functions

npm --prefix functions install                 # dependências das Functions
npm --prefix functions run build               # compilar TS das Functions
```

### Qualidade — rode antes de qualquer commit
```bash
npm run lint                     # ESLint
npm run typecheck                # tsc --noEmit
npm test                         # Jest (jest-expo)
npm test -- --watch              # modo watch durante o desenvolvimento
```

### Build e distribuição
```bash
eas build --profile development --platform android   # Dev Client
eas build --profile production --platform android    # AAB para a Play Store
npx expo export -p web                               # bundle web estático
firebase deploy --only hosting                       # publicar web
```

**Regra:** ao adicionar um script novo ao `package.json`, atualize esta seção no mesmo commit.

---

## 3. Regras de Arquitetura e Estilo de Código

### 3.1 TypeScript estrito — obrigatório
- `"strict": true` no `tsconfig.json`. Não relaxe nenhuma flag.
- **`any` é proibido.** Use `unknown` + narrowing, ou tipe corretamente. Se `any` for inevitável, comente o porquê na linha.
- **Nunca** `@ts-ignore`. Se precisar suprimir, use `@ts-expect-error` com justificativa.
- Dados vindos do Firestore são `unknown` até serem validados. **Todo documento passa por um schema Zod** antes de virar tipo do domínio — o Firestore não garante o formato só porque as rules validam na escrita.
- Tipos de domínio ficam em `src/types/models.ts`; schemas Zod ficam junto da feature (`*.schema.ts`).

### 3.2 Organização de pastas

```
app/                        # rotas (Expo Router) — SÓ composição, zero lógica de negócio
  (auth)/ (app)/            # grupos: fluxo de login e app autenticado

src/
  components/ui/            # primitivos sem domínio: Button, Card, Text, Field, Screen
  components/bp/            # componentes de domínio: BpNumberInput, BpCategoryBadge, ReadingRow
  screens/                  # composições de tela pesadas, importadas pelas rotas de app/
  features/                 # 1 pasta por funcionalidade: hooks + repositório + schema
    auth/ readings/ export/ reminders/
  services/firebase/        # inicialização e acesso ao Firebase (ver 3.3)
  domain/                   # lógica PURA, sem I/O: bp-classification.ts
  lib/                      # utilitários: datetime.ts, file.ts, firestore-paths.ts
  store/                    # Zustand (estado de UI apenas)
  theme/                    # tokens.ts, colors.ts
  types/                    # models.ts

functions/src/              # Cloud Functions (projeto TS isolado)
  scheduler/ triggers/ lib/
```

**Regras invioláveis:**
1. **`app/` nunca importa `firebase/*` diretamente.** Rotas consomem hooks de `src/features/`.
2. **Nenhum caminho de coleção como string literal.** Tudo passa por `src/lib/firestore-paths.ts` — fonte única de verdade.
3. **`src/domain/` e `src/lib/` são puros** (sem I/O, sem React). É o que se testa sem emulador — mantenha assim.
4. Fluxo de dependência: `app/` → `features/` → `services/` → `lib/`. Nunca ao contrário.
5. Toda escrita/leitura do Firestore acontece em um **repositório** da feature (`*.repo.ts`). Componentes nunca chamam `getDocs`/`setDoc` diretamente.

### 3.3 Firebase
- `src/services/firebase/` centraliza `initializeApp`, `auth`, `firestore` e `messaging`.
- Diferenças de plataforma via extensão de arquivo (`firebase.native.ts` / `firebase.web.ts`), **não** via `if (Platform.OS === ...)` espalhado pelo código.
- No nativo, auth **precisa** de `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` — sem isso o usuário desloga a cada cold start.
- Ao alterar o modelo de dados, atualize **no mesmo commit**: schema Zod, tipo em `models.ts`, `firestore.rules` e `firestore.indexes.json`.

### 3.4 React
- **Apenas Functional Components + Hooks.** Nada de class components.
- Um componente exportado por arquivo; o arquivo tem o nome do componente.
- Hooks customizados começam com `use` e ficam na feature correspondente — não em `components/`.
- **Componente burro, hook esperto:** a lógica mora no hook, o componente renderiza. Se um componente tem `useEffect` com regra de negócio dentro, extraia.
- `useEffect` só para sincronizar com sistemas externos (listener do Firestore, permissão de notificação). Não use para derivar estado — derive no render.
- Todo listener `onSnapshot` **deve** retornar seu `unsubscribe` na função de cleanup.
- Listas usam `FlashList` com `keyExtractor` estável (o ID do documento, nunca o índice).
- Memoize (`useMemo` / `useCallback` / `memo`) apenas com motivo — em lista longa ou prop de componente memoizado. Não por reflexo.

### 3.5 Nomenclatura e importações

| Elemento | Convenção | Exemplo |
|---|---|---|
| Componentes e seus arquivos | `PascalCase` | `BpCategoryBadge.tsx` |
| Hooks | `camelCase` com `use` | `useReadings.ts` |
| Variáveis, funções, props | `camelCase` | `measuredAt`, `handleSave` |
| Tipos e interfaces | `PascalCase`, sem prefixo `I` | `Reading`, `ReminderSettings` |
| Constantes de módulo | `SCREAMING_SNAKE_CASE` | `MAX_REMINDER_TIMES` |
| Arquivos utilitários / não-componentes | `kebab-case` | `bp-classification.ts` |
| Rotas do Expo Router | `kebab-case` | `app/(app)/history.tsx` |
| Booleanos | prefixo `is` / `has` / `should` | `isSyncing`, `hasReminders` |
| Handlers | `handle*` no componente, `on*` na prop | `onPress={handleSave}` |

**Importações — ordem, separadas por linha em branco:**
1. Externas (`react`, `react-native`, `firebase/*`)
2. Internas via alias `@/` (`@/features/readings`, `@/components/ui`)
3. Relativas (`./styles`)

Use o alias `@/` para tudo dentro de `src/`. **Proibido** `../../../`. Nunca use `export default` fora das rotas do Expo Router (que o exigem) — exports nomeados sempre.

---

## 4. Práticas de Desenvolvimento e Interação com IA

### 4.1 Mudanças incrementais
- Faça alterações **pequenas, focadas e testáveis**. Uma preocupação por vez.
- **Nunca reescreva um arquivo inteiro** se a tarefa pedia uma alteração pontual. Prefira edições cirúrgicas.
- Não refatore código não relacionado "de passagem" — proponha e espere aprovação.
- Não adicione dependências sem justificar antes: peso do bundle e compatibilidade com Expo importam.
- Não crie arquivos além do necessário. Não gere README/docs a menos que solicitado.
- Entregue o escopo pedido — nem menos, nem mais. Se algo ficar bloqueado, diga explicitamente o quê e por quê.

### 4.2 Commits semânticos (Conventional Commits)

```
<tipo>(<escopo opcional>): <descrição no imperativo, minúscula, sem ponto final>
```

| Tipo | Uso |
|---|---|
| `feat:` | nova funcionalidade para o usuário |
| `fix:` | correção de bug |
| `refactor:` | mudança de código sem alterar comportamento |
| `perf:` | melhoria de performance |
| `style:` | formatação, sem efeito em lógica |
| `test:` | adição ou correção de testes |
| `docs:` | documentação |
| `chore:` | build, dependências, configuração |

Escopos usuais: `auth`, `readings`, `export`, `reminders`, `functions`, `rules`, `ui`.

```
feat(reminders): agendar próximo lembrete via trigger de settings
fix(readings): impedir measuredAt no futuro
chore(deps): atualizar expo-notifications para 0.29
```

- Commits atômicos: uma mudança lógica por commit.
- Rode `npm run lint && npm run typecheck && npm test` **antes** de commitar.
- Commite apenas quando solicitado. Nunca faça push para um branch diferente do designado sem permissão explícita.

### 4.3 Tratamento de erros
- **Toda** interação com Firebase/API vem embrulhada em `try/catch`. Sem exceção.
- Erro sempre produz **feedback amigável em português** — nunca exponha `error.message` cru nem código do Firebase ao usuário.
- Trate os códigos que realmente acontecem: `auth/network-request-failed`, `auth/popup-closed-by-user`, `permission-denied`, `unavailable`.
- **Offline não é erro.** O Firestore enfileira escritas; mostre um indicador discreto de "pendente de sincronização", jamais um alerta de falha.
- Erro em operação destrutiva (excluir medição, excluir conta) exige confirmação e mensagem clara do que aconteceu.
- Todo `catch` faz **algo** — logar e engolir silenciosamente é proibido.

```ts
try {
  await addReading(payload);
} catch (error) {
  logError('readings.add', error, { uid });
  showToast('Não foi possível salvar sua medição. Tente novamente.');
}
```

### 4.4 Segurança
- **Nunca** coloque configuração do Firebase, chaves de API, VAPID key ou qualquer segredo direto no código-fonte. Sempre `.env.local` (gitignored), lido via `app.config.ts` → `expo-constants`.
- Mantenha o `.env.example` atualizado com os nomes das variáveis (**sem valores**) sempre que adicionar uma.
- Segredos das Functions ficam no **Secret Manager** (`defineSecret`), nunca em variáveis versionadas.
- A config web do Firebase é **pública por design** — o que protege os dados são as **Security Rules + App Check**, não escondê-la. Nunca sugira o contrário.
- **Toda alteração no modelo de dados exige revisão das `firestore.rules`**, com caso negativo coberto por teste (`@firebase/rules-unit-testing`).
- `schedules/{uid}` é **exclusivo do Admin SDK** — nunca escreva nele pelo cliente.
- Dado de pressão arterial é **dado sensível de saúde (LGPD)**: não logue valores de medição, não envie para serviços de terceiros, não inclua em relatórios de crash.
- Nunca commite `.env.local`, `google-services.json`, `serviceAccountKey.json` ou credenciais do EAS.

### 4.5 Logs
- **Nenhum `console.log` em código de produção.** Use durante a depuração e remova antes de commitar.
- Para erros, use o logger estruturado (`src/lib/logger.ts`), que encaminha ao Crashlytics em produção:
  ```ts
  logError(scope: string, error: unknown, context?: Record<string, unknown>): void
  ```
- Contexto de log nunca inclui valores de medição, e-mail, token FCM ou qualquer PII/dado de saúde. `uid` é aceitável.
- Nas Functions, use o `logger` do `firebase-functions` (`logger.error` / `logger.info`) — nunca `console`.

### 4.6 Testes
- Obrigatório para: `src/domain/` (classificação de PA), `lib/csv.ts`, `functions/src/lib/nextRun.ts` e as `firestore.rules`.
- Sempre cubra as **bordas**: 119/79 vs 120/80, 139/89, 180/120; horário de verão e virada de dia no `nextRun`; usuário A tentando ler dados de B.
- Corrigiu um bug? Escreva o teste que falha antes da correção.
- Não teste implementação de UI — teste comportamento via `@testing-library/react-native`.

### 4.7 Acessibilidade — critério de aceite, não polimento
- Alvos de toque ≥ 48×48dp; corpo de texto ≥ 16px.
- **Nunca** desative `allowFontScaling`. O público inclui pessoas idosas.
- Todo ícone-botão tem `accessibilityLabel`; todo elemento interativo tem `accessibilityRole`.
- **Nenhuma informação transmitida apenas por cor** — categoria de pressão sempre acompanha texto e forma.
- Leitores de tela devem anunciar "120 por 80", não "120 barra 80".
- Contraste mínimo WCAG AA (4.5:1) em texto; valide light e dark mode.
