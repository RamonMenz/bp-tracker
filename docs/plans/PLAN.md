# BP Tracker — Plano de Desenvolvimento

Aplicativo de registro de pressão arterial. Objetivo central: **fazer o usuário medir 3x ao dia sem esquecer**, com registro em menos de 10 segundos.

**Stack:** Expo (React Native + Web) · Firebase Auth (Google) · Cloud Firestore · Cloud Functions v2 + Cloud Scheduler + FCM.

**Princípio de arquitetura:** o cliente fala direto com o Firestore (sem API intermediária). O backend serverless existe para **uma única coisa**: disparar lembretes. Tudo o mais (CRUD, histórico, export) é client-side protegido por Security Rules.

---

## 1. Arquitetura e Estrutura de Pastas

### 1.1 Decisões de base

| Decisão | Escolha | Motivo |
|---|---|---|
| Navegação | **Expo Router v3+** (file-based) | Gera rotas reais na web (`/history`, `/settings`), deep-link no Android de graça, e `_layout` é o lugar natural para o auth gate. |
| Estado do servidor | **Listeners `onSnapshot` do Firestore** encapsulados em hooks | O Firestore já é cache + realtime + offline. Adicionar TanStack Query por cima duplica cache e cria bugs de sincronia. |
| Estado global de UI | **Zustand** (1 store pequena: sessão + preferências) | Leve, sem boilerplate, funciona igual em web e nativo. |
| Linguagem | **TypeScript strict** | Modelo de dados de saúde precisa de tipos. |
| Validação | **Zod** | Um schema por entidade, reutilizado no form, no parse do Firestore e nas Functions. |
| Build nativo | **Expo Dev Client + EAS Build** | Google Sign-In nativo e FCM não rodam no Expo Go (ver §1.3). |

### 1.2 Estrutura de pastas

```
bp-tracker/
├─ app/                                 # rotas (Expo Router) — só composição, sem lógica
│  ├─ _layout.tsx                       # providers globais + auth gate + fontes
│  ├─ index.tsx                         # redirect: logado → /(app), senão → /(auth)/sign-in
│  ├─ (auth)/
│  │  ├─ _layout.tsx
│  │  └─ sign-in.tsx                    # tela única de login
│  └─ (app)/
│     ├─ _layout.tsx                    # Tabs (Registrar | Histórico | Ajustes)
│     ├─ index.tsx                       # HOME: registrar medição
│     ├─ history.tsx                     # lista + export CSV
│     └─ settings.tsx                    # horários de lembrete, conta, excluir dados
│
├─ src/
│  ├─ components/
│  │  ├─ ui/                            # primitivos: Button, Card, Sheet, Text, Field, Toast
│  │  └─ bp/                            # domínio: BpNumberInput, BpCategoryBadge, ReadingRow, ReadingListEmpty
│  │
│  ├─ features/                         # 1 pasta por funcionalidade = hooks + serviços + schemas
│  │  ├─ auth/          useSession.ts · signInWithGoogle.ts · authGate.tsx
│  │  ├─ readings/      useReadings.ts · useAddReading.ts · reading.schema.ts · readings.repo.ts
│  │  ├─ export/        useExportCsv.ts · csv.ts (puro, testável)
│  │  └─ reminders/     useReminderSettings.ts · registerPushToken.ts · reminders.repo.ts
│  │
│  ├─ lib/
│  │  ├─ firebase.ts                    # initializeApp + auth/firestore/messaging (splits .web.ts/.native.ts)
│  │  ├─ firestore-paths.ts             # ÚNICA fonte de verdade dos caminhos de coleção
│  │  ├─ datetime.ts                    # wrappers Luxon (timezone, formatação)
│  │  └─ file.ts                        # salvar/compartilhar arquivo (impl. web vs nativa)
│  │
│  ├─ domain/
│  │  └─ bp-classification.ts           # regra pura: (sys, dia) → categoria AHA. 100% testável
│  │
│  ├─ store/          session.store.ts
│  ├─ theme/          tokens.ts · colors.ts
│  └─ types/          models.ts
│
├─ functions/                            # Cloud Functions (projeto TS isolado, package.json próprio)
│  └─ src/
│     ├─ index.ts
│     ├─ scheduler/ dispatchReminders.ts
│     ├─ triggers/  onUserSettingsWrite.ts · onUserDelete.ts
│     └─ lib/       nextRun.ts (puro, testável) · fcm.ts
│
├─ public/
│  └─ firebase-messaging-sw.js           # service worker do FCM (web push)
│
├─ firestore.rules · firestore.indexes.json · firebase.json
├─ app.config.ts · tailwind.config.js · eas.json
└─ .env.local (gitignored) · .env.example
```

**Regras de ouro da estrutura:**
1. `app/` nunca importa `firebase/firestore` diretamente — só hooks de `src/features/`.
2. Nenhum componente monta um caminho de coleção com string literal; tudo passa por `firestore-paths.ts`.
3. Lógica pura (classificação de PA, geração de CSV, cálculo do próximo lembrete) fica isolada de I/O — é o que você consegue testar sem emulador.

### 1.3 Armadilhas de plataforma (resolva no dia 1, não na véspera do lançamento)

- **Google Sign-In:** duas implementações reais.
  - **Nativo:** `@react-native-google-signin/google-signin` → `GoogleAuthProvider.credential(idToken)` → `signInWithCredential`. **Não funciona no Expo Go** — exige Dev Client.
  - **Web:** `signInWithPopup(auth, new GoogleAuthProvider())`.
  - Alternativa se quiser continuar no Expo Go durante o protótipo: `expo-auth-session/providers/google`. Funciona, mas a UX nativa é pior (abre browser). Recomendo ir direto para Dev Client.
- **Auth persistente no RN:** `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`. Sem isso, o usuário desloga a cada cold start.
- **FCM na web** exige `public/firebase-messaging-sw.js` + VAPID key. No Android, `expo-notifications` + permissão `POST_NOTIFICATIONS` (obrigatória a partir do Android 13).
- **Config do Firebase no cliente é pública por design** — não é segredo. O que protege seus dados são as Security Rules + App Check, não esconder a apiKey.

---

## 2. Modelagem de Dados e Segurança

### 2.1 Estrutura das coleções

```
users/{uid}                                  ← perfil + preferências (documento único)
   └─ readings/{readingId}                   ← subcoleção: histórico de medições
   └─ devices/{tokenHash}                    ← subcoleção: tokens FCM por dispositivo

schedules/{uid}                              ← ÍNDICE DE DISPARO — só o Admin SDK acessa
```

**Por que subcoleção `readings` e não uma coleção raiz com `userId`?**
Segurança e custo. Com subcoleção, o `uid` está **no caminho** — a regra é `request.auth.uid == uid`, impossível de vazar por query mal formada. Numa coleção raiz, toda query precisa carregar `where('userId','==',uid)` e uma regra de `list` mais frágil. Além disso, o export vira uma varredura de subcoleção, naturalmente isolada por usuário.

**Por que `schedules/{uid}` separado do perfil?**
Essa é a otimização central do §3. O cron precisa perguntar *"quem está vencido agora?"*. Se essa consulta rodar em `users/`, ela lê documentos grandes de todos os candidatos. `schedules/` é uma coleção rasa e desnormalizada (4 campos) mantida por trigger — o cron lê **apenas os N usuários vencidos**, nunca a base inteira.

#### `users/{uid}`
```ts
{
  displayName: string | null,
  email: string | null,
  photoURL: string | null,
  timezone: string,                  // IANA, ex: "America/Sao_Paulo"
  reminderTimes: string[],           // ["08:00","14:00","20:00"] — hora LOCAL, máx. 8
  notificationsEnabled: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

#### `users/{uid}/readings/{readingId}`
```ts
{
  systolic: number,                  // int 50..300
  diastolic: number,                 // int 30..200
  pulse: number | null,              // int 20..250
  measuredAt: Timestamp,             // quando o usuário mediu (editável)
  createdAt: Timestamp,              // quando o registro entrou no banco (auditoria)
  note: string | null,               // máx. 280 chars
  source: 'manual',                  // reservado p/ integrações futuras
}
```
> **Não persista a categoria** (Normal/Elevada/Estágio 1…). Ela é função pura de `(systolic, diastolic)`; guardá-la cria dados inconsistentes se a tabela de referência mudar. Calcule no cliente via `domain/bp-classification.ts`.

#### `users/{uid}/devices/{tokenHash}`
```ts
{ token: string, platform: 'android'|'web'|'ios', lastSeenAt: Timestamp }
```
Doc ID = hash do token (evita duplicatas e IDs gigantes no caminho).

#### `schedules/{uid}` — **server-only**
```ts
{
  nextRunAt: Timestamp,              // ÚNICO campo consultado pelo cron
  timezone: string,
  reminderTimes: string[],
  tokens: string[],                  // desnormalizado: evita ler devices/ no disparo
  lastSentAt: Timestamp | null,
}
```
Se o usuário desliga as notificações, o **documento é apagado** (não marcado como inativo). Isso mantém a query do cron como um filtro de campo único — sem índice composto, sem custo de leitura de usuários inativos.

### 2.2 Índices (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "readings",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "measuredAt", "order": "DESCENDING" }]
    }
  ],
  "fieldOverrides": []
}
```
`schedules.nextRunAt` usa o índice de campo único automático — nada a declarar.

### 2.3 Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null && request.auth.token.firebase.sign_in_provider == 'google.com';
    }
    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }
    function intBetween(v, lo, hi) {
      return v is int && v >= lo && v <= hi;
    }

    // ---------- PERFIL ----------
    match /users/{uid} {
      function validProfile(d) {
        return d.keys().hasOnly([
                 'displayName','email','photoURL','timezone',
                 'reminderTimes','notificationsEnabled','createdAt','updatedAt'
               ])
            && d.keys().hasAll(['timezone','reminderTimes','notificationsEnabled'])
            && d.timezone is string && d.timezone.size() <= 64
            && d.notificationsEnabled is bool
            && d.reminderTimes is list && d.reminderTimes.size() <= 8
            && d.updatedAt is timestamp;
      }

      allow get:    if isOwner(uid);
      allow list:   if false;                       // ninguém enumera usuários
      allow create: if isOwner(uid) && validProfile(request.resource.data);
      allow update: if isOwner(uid) && validProfile(request.resource.data)
                    && request.resource.data.createdAt == resource.data.createdAt;
      allow delete: if isOwner(uid);                // exclusão de conta (LGPD)

      // ---------- MEDIÇÕES ----------
      match /readings/{readingId} {
        function validReading(d) {
          return d.keys().hasOnly([
                   'systolic','diastolic','pulse','measuredAt',
                   'createdAt','note','source'
                 ])
              && d.keys().hasAll(['systolic','diastolic','measuredAt','createdAt'])
              && intBetween(d.systolic, 50, 300)
              && intBetween(d.diastolic, 30, 200)
              && d.systolic > d.diastolic
              && (d.pulse == null || intBetween(d.pulse, 20, 250))
              && d.measuredAt is timestamp
              && d.measuredAt <= request.time + duration.value(5, 'm')   // sem futuro
              && d.createdAt is timestamp
              && (d.note == null || (d.note is string && d.note.size() <= 280))
              && d.source == 'manual';
        }

        allow read:   if isOwner(uid);              // get + list (o export usa list)
        allow create: if isOwner(uid) && validReading(request.resource.data)
                      && request.resource.data.createdAt == request.time;
        allow update: if isOwner(uid) && validReading(request.resource.data)
                      && request.resource.data.createdAt == resource.data.createdAt;
        allow delete: if isOwner(uid);
      }

      // ---------- TOKENS DE PUSH ----------
      match /devices/{tokenId} {
        function validDevice(d) {
          return d.keys().hasOnly(['token','platform','lastSeenAt'])
              && d.token is string && d.token.size() <= 512
              && d.platform in ['android','web','ios']
              && d.lastSeenAt is timestamp;
        }
        allow read, delete: if isOwner(uid);
        allow write:        if isOwner(uid) && validDevice(request.resource.data);
      }
    }

    // ---------- ÍNDICE DE DISPARO: exclusivo do Admin SDK ----------
    match /schedules/{uid} {
      allow read, write: if false;
    }

    // ---------- NEGAÇÃO EXPLÍCITA ----------
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Pontos que essas regras garantem:**
- Isolamento total por `uid` — inclusive no **export**, que é apenas um `list` da própria subcoleção.
- `allow list: if false` em `users` impede enumeração de contas.
- `hasOnly([...])` bloqueia injeção de campos arbitrários (um cliente comprometido não infla seus documentos nem grava campos que a Function possa interpretar).
- `systolic > diastolic` e os ranges rejeitam lixo **no servidor**, não só no formulário.
- `createdAt == request.time` impede falsificação de auditoria.
- O Admin SDK **ignora** as rules — as Functions continuam escrevendo em `schedules/` normalmente.

**Complementos obrigatórios (rules não cobrem tudo):**
1. **App Check** (Play Integrity + reCAPTCHA Enterprise na web) — sem ele, qualquer um com a config pública fala com seu Firestore usando uma conta Google própria. Ative em modo *enforce* antes do lançamento.
2. **Teste as rules** com `@firebase/rules-unit-testing` + emulador. Escreva os casos negativos: usuário A lendo readings de B, sistólica 999, campo extra `isAdmin`.
3. **LGPD (dado de saúde = dado sensível):** botão de exclusão de conta em Ajustes, que apaga `readings`, `devices`, `schedules/{uid}` e o usuário do Auth. Implemente como Function `onUserDelete` para garantir limpeza completa.

---

## 3. Estratégia do Backend Serverless

### 3.1 O problema a evitar

A implementação ingênua é: *cron a cada minuto → lê todos os usuários → compara `reminderTimes` com a hora atual*. Com 10 mil usuários isso são **14,4 milhões de leituras/dia** — quase tudo desperdiçado, e o custo cresce linearmente com a base ociosa.

### 3.2 A solução: índice de vencimento pré-calculado

Inverta a pergunta. Em vez de *"que horas é para cada usuário?"*, o cron pergunta *"quem está vencido agora?"* — e a resposta é uma query indexada que retorna **apenas os usuários que realmente precisam de notificação**.

```
Usuário salva horários em users/{uid}
              │
              ▼
   [Trigger onDocumentWritten]  ── calcula nextRunAt (UTC) a partir de
   onUserSettingsWrite             reminderTimes + timezone + tokens
              │
              ▼
      schedules/{uid} { nextRunAt, timezone, reminderTimes, tokens }
              │
              ▼
[Cloud Scheduler: */15 * * * *] ──▶ [Function dispatchReminders]
                                          │
                                          ├─ query: schedules
                                          │    .where('nextRunAt','<=', now)
                                          │    .where('nextRunAt','>=', now - 2h)   ← janela anti-spam
                                          │    .orderBy('nextRunAt').limit(500)
                                          │
                                          ├─ FCM sendEachForMulticast (lotes de 500)
                                          │
                                          └─ BulkWriter: nextRunAt = próximo horário
                                                         lastSentAt = now
                                                         remove tokens inválidos
```

**Custo real:** o cron faz **1 query** por execução (~2.880/mês) e lê apenas os docs vencidos. Um usuário com 3 lembretes/dia gera 3 leituras + 3 escritas por dia. O custo passa a ser proporcional aos **usuários ativos**, não à base total — que era exatamente o objetivo.

### 3.3 Detalhes de implementação

**Granularidade do cron.** `*/15 * * * *` (a cada 15 min) restringe os horários a múltiplos de 15 no seletor da UI — o que é bom para a UX (roda de horário mais simples) e mantém o custo baixo. Se quiser minuto a minuto, use `* * * * *`; a query continua barata, mas são 43.200 invocações/mês (ainda dentro do free tier de 2M).

**Timezone é a parte que mais dá bug.** Nunca guarde `nextRunAt` em hora local. Guarde `reminderTimes` como `"HH:mm"` local + a IANA timezone, e derive o `nextRunAt` em UTC com Luxon:

```ts
// functions/src/lib/nextRun.ts — função PURA, teste com horário de verão e viradas de dia
import { DateTime } from 'luxon';

export function computeNextRun(
  times: string[], zone: string, from: Date = new Date()
): Date | null {
  const now = DateTime.fromJSDate(from, { zone });
  const candidates = times.flatMap((t) => {
    const [h, m] = t.split(':').map(Number);
    const today = now.set({ hour: h, minute: m, second: 0, millisecond: 0 });
    return [today, today.plus({ days: 1 })];
  });
  const next = candidates.filter((d) => d > now).sort((a, b) => a.toMillis() - b.toMillis())[0];
  return next?.toUTC().toJSDate() ?? null;
}
```

**A janela `nextRunAt >= now - 2h` é essencial.** Se a Function ficar fora do ar por meio dia, sem essa janela o usuário recebe um lembrete das 08h às 20h — irrelevante e irritante. Melhor pular do que notificar fora de hora.

**A Function de disparo (esqueleto):**

```ts
// functions/src/scheduler/dispatchReminders.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { computeNextRun } from '../lib/nextRun';

export const dispatchReminders = onSchedule(
  { schedule: '*/15 * * * *', timeZone: 'UTC', region: 'southamerica-east1',
    memory: '256MiB', retryConfig: { retryCount: 1 } },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();
    const floor = Timestamp.fromMillis(now.toMillis() - 2 * 60 * 60 * 1000);

    const due = await db.collection('schedules')
      .where('nextRunAt', '<=', now)
      .where('nextRunAt', '>=', floor)
      .orderBy('nextRunAt')
      .limit(500)
      .get();

    if (due.empty) return;

    const writer = db.bulkWriter();

    await Promise.all(due.docs.map(async (doc) => {
      const s = doc.data();
      const tokens: string[] = s.tokens ?? [];

      // 1) Reagenda ANTES de enviar → um retry nunca duplica a notificação
      writer.update(doc.ref, {
        nextRunAt: computeNextRun(s.reminderTimes, s.timezone),
        lastSentAt: now,
      });
      if (tokens.length === 0) return;

      // 2) Envia
      const res = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: 'Hora de medir sua pressão',
                        body: 'Leva 10 segundos. Toque para registrar.' },
        data: { deeplink: 'bptracker://record' },
        android: { priority: 'high', notification: { channelId: 'reminders' } },
        webpush: { fcmOptions: { link: 'https://SEU-APP.web.app/' } },
      });

      // 3) Poda tokens mortos — sem isso a lista cresce para sempre
      const dead = res.responses.flatMap((r, i) =>
        r.error?.code === 'messaging/registration-token-not-registered' ? [tokens[i]] : []
      );
      if (dead.length) {
        writer.update(doc.ref, { tokens: tokens.filter((t) => !dead.includes(t)) });
      }
    }));

    await writer.close();
  }
);
```

**Idempotência.** Reagendar antes de enviar é deliberado: se a Function falhar no meio e o Scheduler reexecutar, o `nextRunAt` já avançou e ninguém recebe dois pushes. Notificação duplicada é pior que notificação perdida — a próxima chega em algumas horas.

**Trigger de sincronização:**

```ts
// functions/src/triggers/onUserSettingsWrite.ts
export const onUserSettingsWrite = onDocumentWritten('users/{uid}', async (event) => {
  const after = event.data?.after.data();
  const ref = getFirestore().doc(`schedules/${event.params.uid}`);

  // desligou notificações / apagou a conta → remove do índice (query do cron fica limpa)
  if (!after?.notificationsEnabled || !after.reminderTimes?.length) {
    await ref.delete(); return;
  }
  const tokens = (await getFirestore()
    .collection(`users/${event.params.uid}/devices`).get())
    .docs.map((d) => d.get('token'));

  await ref.set({
    nextRunAt: computeNextRun(after.reminderTimes, after.timezone),
    timezone: after.timezone,
    reminderTimes: after.reminderTimes,
    tokens,
    lastSentAt: null,
  }, { merge: true });
});
```
Um trigger análogo em `users/{uid}/devices/{tokenId}` mantém `tokens` sincronizado.

### 3.4 Por que o export de CSV **não** é uma Function

Tentador, mas errado aqui. Uma Function de export precisaria de Storage, URL assinada, expiração e limpeza — e criaria um caminho de saída de dados de saúde para fora das Security Rules. Como o histórico de um usuário é pequeno (3 medições/dia ≈ 1.100/ano), gerar o CSV **no cliente** é mais rápido, mais barato e mais seguro: o dado nunca sai do dispositivo por outro canal.

```ts
// nativo: expo-file-system + expo-sharing
const uri = FileSystem.documentDirectory + `pressao-${today}.csv`;
await FileSystem.writeAsStringAsync(uri, csv, { encoding: 'utf8' });
await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });

// web: Blob + <a download>
```
Cabeçalho: `data,hora,sistolica,diastolica,pulso,categoria,observacao`. Use **BOM UTF-8 (`﻿`)** e considere `;` como separador — sem isso, o Excel em pt-BR abre tudo numa coluna só e com acentos quebrados. Escape aspas duplicando-as.

### 3.5 Redundância recomendada: notificações locais

FCM não garante entrega — Doze mode, otimização de bateria agressiva de fabricantes (Xiaomi, Samsung) e usuário offline derrubam pushes. Para um app cuja **razão de existir** é o lembrete, agende também notificações locais com `expo-notifications` (`DailyTriggerInput`) espelhando os mesmos horários. FCM vira a camada de reforço (funciona na web, sobrevive à reinstalação do agendamento local); a notificação local é a garantia offline. Use uma `identifier` estável por horário para não duplicar visualmente.

---

## 4. Guia de UI/UX

### 4.1 Biblioteca de componentes — recomendação

| Opção | Veredito |
|---|---|
| **NativeWind v4** ✅ **recomendado** | Tokens no `tailwind.config.js` compartilhados entre Android e Web, dark mode com `dark:`, zero runtime relevante na web. Você constrói ~8 primitivos e o app fica com identidade própria. |
| Shopify Restyle | Excelente type-safety de tema, mas verboso e sem paridade natural com web. Bom para design system grande — overkill aqui. |
| React Native Paper | Acessibilidade e componentes prontos de graça, ótimo para velocidade. Contra: visual Material 3 genérico e bundle pesado para um app de 3 telas. |

**Recomendação:** NativeWind v4 + primitivos próprios em `components/ui/`. Se a prioridade for **lançar em uma semana**, Paper é a escolha pragmática — mas aceite o visual padrão. Não misture os dois.

Complementos: `react-native-reanimated` (micro-interações), `@gorhom/bottom-sheet` (input de medição), `react-native-gifted-charts` ou `victory-native` (tendência), `expo-haptics` (feedback tátil ao salvar).

### 4.2 Paleta de cores

A cor precisa fazer **dois trabalhos independentes** — não os misture:

**Cores de marca** (calma, clínica, confiável — evite vermelho como cor primária num app de pressão: alarme constante gera ansiedade e abandono):

```js
primary:   '#0E7C86'   // teal profundo — ações principais
primaryFg: '#FFFFFF'
bg:        '#F7F9FA'   // cinza-azulado quase branco
surface:   '#FFFFFF'
border:    '#E3E8EC'
text:      '#0F1A1C'   // 15.8:1 sobre bg — AAA
muted:     '#5A6B70'   //  5.1:1 sobre bg — AA
```

**Dark mode:**
```js
bg: '#0D1416', surface: '#141F22', border: '#26343A',
text: '#E8F0F2', muted: '#9BAAB0', primary: '#3FB6C0'  // clareado p/ contraste em fundo escuro
```

**Cores semânticas de classificação** (referência AHA — use **apenas** no badge da leitura, nunca como fundo de tela inteira):

| Categoria | Sistólica / Diastólica | Cor |
|---|---|---|
| Normal | < 120 e < 80 | `#1B8A5A` |
| Elevada | 120–129 e < 80 | `#B8860B` |
| Hipertensão E1 | 130–139 ou 80–89 | `#C2610E` |
| Hipertensão E2 | ≥ 140 ou ≥ 90 | `#C0392B` |
| Crise | > 180 ou > 120 | `#7D1F1F` |

> **Acessibilidade:** ~8% dos homens têm deficiência de visão de cores — verde e laranja podem colidir. Sempre acompanhe a cor de **texto** ("Normal", "Elevada") e de forma/ícone. Nunca comunique estado só por cor.
>
> **Ético:** o app **registra**, não diagnostica. Rotule categorias como referência e inclua um aviso discreto em Ajustes: *"Não substitui avaliação médica."* Evite linguagem alarmista automatizada.

### 4.3 Tipografia

**Inter** via `expo-font` (ou `@expo-google-fonts/inter`), com **numerais tabulares** (`fontVariant: ['tabular-nums']`) em toda exibição numérica — sem isso os números "dançam" na lista de histórico.

| Papel | Tamanho / Peso |
|---|---|
| Display (o número da medição) | 56 / Bold, tabular |
| Título de tela | 28 / SemiBold |
| Cabeçalho de seção | 20 / SemiBold |
| Corpo | 16 / Regular |
| Legenda / metadados | 13 / Medium, cor `muted` |

Mínimo de 16px para corpo (público-alvo inclui idosos e hipertensos). Respeite `allowFontScaling` — **não** desative escala de fonte do sistema. Alvos de toque ≥ 48×48dp.

### 4.4 Decisões de UX que decidem o sucesso do app

1. **A home É o formulário.** Nada de "toque no + para adicionar". Ao abrir o app o cursor já está na sistólica. Meta: **registro em ≤ 10 segundos, 4 toques**.
2. **Teclado numérico grande, não `TextInput` pequeno.** `keyboardType="number-pad"`, avanço automático de campo ao completar 3 dígitos (sistólica → diastólica → pulso). Alternativa forte: roda/stepper com valores prováveis pré-selecionados a partir da última medição — a pressão de uma pessoa varia pouco entre medições.
3. **Deep link da notificação abre direto no formulário** (`bptracker://record`). Quem tocou no lembrete quer registrar, não navegar.
4. **Confirmação por háptico + badge de categoria**, sem modal. Modal de sucesso é atrito puro.
5. **Estado vazio com propósito:** primeira abertura → um convite claro para configurar os 3 horários. É a ação que ativa o valor central do produto.
6. **Timestamp editável.** Metade dos registros acontece atrasado ("medi de manhã, lancei à noite"). Default = agora, com toque para ajustar.
7. **Histórico agrupado por dia**, com cabeçalhos fixos e média do dia. `FlashList` para performance.
8. **Offline como padrão silencioso.** A persistência do Firestore já enfileira as escritas; mostre um indicador discreto de "pendente de sincronização" em vez de erro.
9. **Acessibilidade:** `accessibilityLabel` em todo ícone-botão, `accessibilityRole`, e leitura de leitura por extenso ("120 por 80, normal") — não deixe o leitor de tela anunciar "120 barra 80".

---

## 5. Plano de Ação Passo a Passo

### Fase 0 — Fundação (½ dia)
- [ ] Criar projeto Firebase; ativar **Google** como único provedor no Auth.
- [ ] Firestore em **modo produção**, região `southamerica-east1`.
- [ ] `firebase init` na raiz: Firestore, Functions (TS), Emulators, Hosting.
- [ ] `.env.example` com as chaves públicas do Firebase; `.env.local` no `.gitignore`.
- **Pronto quando:** `firebase emulators:start` sobe Firestore + Auth + Functions.

### Fase 1 — Setup do app (1 dia)
- [ ] `npx create-expo-app -t expo-template-blank-typescript` + Expo Router + NativeWind v4.
- [ ] `theme/tokens.ts` e `tailwind.config.js` com a paleta do §4.2 (light + dark).
- [ ] Primitivos em `components/ui/`: `Button`, `Card`, `Text`, `Field`, `Screen`.
- [ ] Esqueleto de rotas do §1.2 com telas placeholder.
- [ ] `expo-dev-client` + primeiro `eas build --profile development --platform android`.
- **Pronto quando:** o dev build roda no Android e `npx expo start --web` navega entre as 3 abas.

### Fase 2 — Autenticação (1 dia)
- [ ] `lib/firebase.ts` com split `.native.ts` / `.web.ts`; `getReactNativePersistence` no nativo.
- [ ] `signInWithGoogle` nas duas plataformas (§1.3).
- [ ] `useSession` + auth gate no `app/_layout.tsx` (com splash enquanto o estado é indefinido).
- [ ] Criação/merge de `users/{uid}` no primeiro login, com `timezone` detectada do dispositivo.
- [ ] Logout em Ajustes.
- **Pronto quando:** login persiste após matar o app; rota protegida redireciona deslogado.

### Fase 3 — Núcleo: registrar e visualizar (2–3 dias)
- [ ] `reading.schema.ts` (Zod) + `domain/bp-classification.ts` **com testes unitários** (bordas: 119/79, 120/80, 139/89, 180/120).
- [ ] Deploy das `firestore.rules` do §2.3 + testes com `@firebase/rules-unit-testing` (casos negativos obrigatórios).
- [ ] Home: input numérico grande, avanço automático, timestamp editável, badge de categoria, háptico ao salvar.
- [ ] Histórico: `onSnapshot` ordenado por `measuredAt desc`, agrupado por dia, `FlashList`, swipe para excluir, estado vazio.
- **Pronto quando:** o registro leva ≤ 10s; usuário A comprovadamente não lê dados de B no emulador.

### Fase 4 — Export CSV (½ dia)
- [ ] `csv.ts` puro (BOM UTF-8, separador `;`, escape de aspas) + testes.
- [ ] `useExportCsv`: leitura paginada, share nativo e download na web.
- **Pronto quando:** o arquivo abre no Excel pt-BR e no Google Sheets com acentos e colunas corretos.

### Fase 5 — Lembretes (2–3 dias) — *a razão de ser do produto*
- [ ] Ajustes: seletor de horários (default 08:00 / 14:00 / 20:00, múltiplos de 15 min), switch de notificações.
- [ ] Permissão de notificação **pedida no contexto certo** (ao ativar o switch, nunca no primeiro launch), canal Android `reminders`, token salvo em `devices/`.
- [ ] `functions/src/lib/nextRun.ts` + testes (horário de verão, virada de dia, lista vazia).
- [ ] `onUserSettingsWrite` e trigger de `devices/` → mantêm `schedules/{uid}`.
- [ ] `dispatchReminders` + deploy do Cloud Scheduler.
- [ ] Notificações locais espelhadas (§3.5) + deep link `bptracker://record`.
- **Pronto quando:** com `nextRunAt` forçado no passado, o push chega em ~15 min, o `nextRunAt` avança e o toque abre o formulário.

### Fase 6 — Segurança e conformidade (1 dia)
- [ ] **App Check** em enforce (Play Integrity + reCAPTCHA Enterprise).
- [ ] Exclusão de conta em Ajustes + Function de limpeza (`readings`, `devices`, `schedules`, Auth).
- [ ] Política de privacidade (obrigatória na Play Store para dado de saúde) + *Data Safety form*.
- [ ] Aviso "não substitui avaliação médica".
- [ ] Revisão final das rules com foco em `hasOnly` e casos negativos.
- **Pronto quando:** requisição sem App Check é rejeitada; exclusão de conta não deixa órfãos.

### Fase 7 — Polimento e lançamento (2 dias)
- [ ] Dark mode revisado, contraste verificado (AA em texto, AAA no corpo principal).
- [ ] Passada de leitor de tela (TalkBack) nas 4 telas.
- [ ] Gráfico de tendência de 7/30 dias no Histórico (opcional, alto valor percebido).
- [ ] Crashlytics + alerta de erro nas Functions.
- [ ] `eas build --profile production` (Android AAB) + `expo export -p web` → Firebase Hosting.
- **Pronto quando:** app instalado da Play Console interna registra e notifica de ponta a ponta.

---

### Riscos priorizados

| Risco | Impacto | Mitigação |
|---|---|---|
| Push não chega (Doze / OEM agressivo) | **Crítico** — mata a proposta de valor | Notificações locais como camada primária (§3.5) |
| Bug de timezone / horário de verão | Alto — lembrete na hora errada | `nextRun.ts` puro e testado; nunca guardar hora local em UTC |
| Google Sign-In não roda no Expo Go | Bloqueio no dia 1 | Dev Client já na Fase 1 |
| Custo de leituras do cron | Médio | Índice `schedules/` (§3.2) |
| Excel pt-BR quebrando o CSV | Baixo, mas visível | BOM UTF-8 + separador `;` |

### Estimativa

**10–12 dias de desenvolvimento** para um dev sênior em tempo integral. O caminho crítico é a Fase 5 — comece por ela assim que a Fase 3 estiver de pé, porque é o que diferencia o produto.
