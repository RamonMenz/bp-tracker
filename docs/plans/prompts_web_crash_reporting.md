# Prompts de Desenvolvimento — Coletor de Erros em Produção na Web

> Prompts autocontidos para o item "Coletor de erros em produção na Web" de
> [`roadmap_futuro.md`](./roadmap_futuro.md) (Planejado na Documentação #3). Cada prompt pode ser
> colado direto numa sessão nova do Claude Code — não depende de memória de conversa anterior, só
> do estado do repositório nesta branch. Mesma convenção de
> [`prompts_de_funcionalidades.md`](./prompts_de_funcionalidades.md): seguir `CLAUDE.md`
> (TypeScript estrito, sem `any`, `@/` em vez de `../../../`, exports nomeados, mudanças
> cirúrgicas, um commit semântico por prompt, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit).
>
> **Contexto que os dois prompts partilham:** `src/lib/logger.ts` já expõe `setCrashReporter` e
> `src/services/firebase/index.ts` já injeta o coletor certo por plataforma fora de `__DEV__` — a
> metade nativa está resolvida desde `feat(observability): conectar Crashlytics como coletor de
> erro em produção (nativo)`. `src/services/crashReporter.web.ts` hoje é só um no-op declarado
> (`IS_WEB_CRASH_REPORTING_GAP`). Fechar esse gap é só trocar o CONTEÚDO desse arquivo — nenhum
> outro ponto do app muda, porque `logger.ts`/`firebase/index.ts` já dependem só da interface
> `CrashReporter`, não de Crashlytics especificamente.
>
> **Decisão de dependência, já tomada aqui** (a mesma decisão que o CLAUDE.md §4.1 pede para
> justificar por escrito antes de somar uma lib nova):
> - **`@sentry/browser`, não `@sentry/react`.** Não há Error Boundary nem instrumentação de
>   componente React sendo pedida — toda captura de erro do app já passa por `logError` em
>   `try/catch` explícito (CLAUDE.md §4.3), não por um boundary. `@sentry/browser` é o SDK vanilla,
>   sem as integrações React que o app não usa — menos peso de bundle web pelo mesmo resultado.
> - **Não é `@sentry/react-native`.** Essa é a opção certa para cobrir o Android também, mas o
>   nativo já tem Crashlytics funcionando; trocar de coletor no nativo não está em escopo aqui e
>   duplicaria a decisão tomada no Prompt 5.1 de `prompts_de_funcionalidades.md` sem necessidade.
> - **Instalação:** `@sentry/browser` é JS puro (sem código nativo) — `npm install`, não `npx expo
>   install` (esse comando é para pacotes com parte nativa, que precisam de versão pareada ao
>   Expo SDK; não é o caso aqui).
> - **LGPD (CLAUDE.md §4.4):** Sentry é um processador de dados a mais recebendo stack traces de um
>   app de saúde. O Prompt 1 já inclui a configuração mínima de privacidade que isso exige
>   (`sendDefaultPii: false`, sem tracing de performance, sem `setUser`) — não é uma etapa
>   opcional, é parte do que torna essa integração aceitável.
>
> | Modelo | Quando usar aqui |
> |---|---|
> | **Claude Opus 5** | Decisão de arquitetura (dependência nova) + implementação do adapter com
> exigência de privacidade que não pode ser relaxada por engano. |
> | **Claude Haiku 4.5** | Sincronizar documentação de estado já resolvido, sem lógica nova. |

---

## Prompt 1 — Adapter `crashReporter.web.ts` real, com Sentry

```
Contexto: no BP Tracker, src/services/crashReporter.web.ts hoje é um no-op declarado
(IS_WEB_CRASH_REPORTING_GAP = true) — logError descarta todo erro de produção na web. O lado
nativo já está resolvido (src/services/crashReporter.native.ts usa
@react-native-firebase/crashlytics) e segue o mesmo contrato CrashReporter de src/lib/logger.ts:
recordError(scope: string, error: unknown, context: Record<string, unknown>) => void. Ver
roadmap_futuro.md, item "Coletor de erros em produção na Web", e o cabeçalho deste arquivo de
prompts para a decisão de dependência já tomada (@sentry/browser).

Tarefa:
1. Adicione @sentry/browser ao package.json (npm install @sentry/browser — é JS puro, sem parte
   nativa, então NÃO use npx expo install). Confirme que a versão instalada não introduz peer
   dependency conflitante com o restante do projeto.
2. Em app.config.ts, siga EXATAMENTE o padrão já usado para appCheck.recaptchaSiteKey (linhas ao
   redor de "const appCheck = { recaptchaSiteKey: optionalEnv(...) }"):
   - Adicione `const sentry = { dsn: optionalEnv('EXPO_PUBLIC_SENTRY_DSN') };` — use a função
     optionalEnv já existente no arquivo (não crie uma segunda versão dela). Comente, como o
     appCheck faz, que a DSN do Sentry é pública por design (é para ir no bundle client-side, não é
     segredo) e que é opcional enquanto o projeto Sentry ainda não existe — sem ela, o adapter só
     não inicializa, sem quebrar o app.
   - Adicione `sentry` ao objeto `extra` (junto de `firebase`, `googleWebClientId`, `appCheck`).
3. Em .env.example, adicione EXPO_PUBLIC_SENTRY_DSN= com um comentário no mesmo estilo dos outros
   blocos do arquivo (ex.: o de EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY) explicando onde conseguir
   o valor (Sentry → Settings → Projects → seu projeto → Client Keys (DSN)) e que é opcional.
4. Reescreva src/services/crashReporter.web.ts por completo:
   - Leia a DSN de Constants.expoConfig?.extra (mesmo padrão de appCheck.web.ts: tipe o extra
     localmente, ex. `{ sentry?: { dsn?: string } }`).
   - Inicialize o Sentry de forma PREGUIÇOSA e memoizada na primeira chamada de recordError — mesmo
     desenho de crashReporter.native.ts (`let cached` + função `getSentryClient()` que inicializa
     uma vez só) — não inicialize no top-level do módulo, para não rodar Sentry.init() incondicio-
     nalmente ao importar o arquivo (inclusive em teste).
   - Se a DSN estiver ausente, NÃO chame Sentry.init(): registre isso com logError('crashReporter.
     web.init', new Error('Sentry DSN ausente')) uma única vez (não a cada recordError — cacheie
     que já avisou) e daí em diante recordError vira no-op silencioso, mesmo padrão de
     appCheck.init() quando a site key falta.
   - Sentry.init options obrigatórias (não são opcionais, fazem parte do requisito de LGPD do
     CLAUDE.md §4.4): `dsn`, `sendDefaultPii: false` (não deixe o Sentry capturar IP, cookies ou
     headers automaticamente), `tracesSampleRate: 0` (sem tracing de performance — não precisamos
     e é custo/dado a mais saindo do dispositivo), `autoSessionTracking: false` (idem, não é o que
     esta integração pede). NÃO chame Sentry.setUser em nenhum ponto — o app não tem um uid
     disponível na assinatura de recordError, e não é para inventar um jeito de passar; a
     integração nativa também não identifica o usuário no Crashlytics, mantenha paridade.
   - recordError(scope, error, context): chame Sentry.captureException, passando `error` embrulhado
     do mesmo jeito que o nativo faz (valor não-Error vira `new Error(...)` — reaproveite a MESMA
     lógica de toError() de crashReporter.native.ts; extraia para um util compartilhado, ex.
     src/lib/toError.ts, se isso não forçar nenhuma outra mudança de import complicada — CLAUDE.md
     §3.2 não permite duplicar lógica pura entre arquivos de plataforma). Passe `scope` como tag
     (Sentry.captureException(err, { tags: { scope }, extra: context })) — `context` já chega
     sanitizado por logError, então não sanitize de novo aqui.
   - Envolva a chamada ao SDK do Sentry em try/catch que engole o erro, com o MESMO comentário de
     justificativa que crashReporter.native.ts já tem para o próprio catch vazio (as duas saídas
     normais estão fechadas: logError recursaria, console é proibido fora de logger.ts).
   - Remova IS_WEB_CRASH_REPORTING_GAP e o bloco de comentário "GAP CONHECIDO E DECLARADO" — deixou
     de ser verdade. Escreva um comentário novo no topo do arquivo explicando a escolha de
     @sentry/browser (resumo do cabeçalho deste arquivo de prompts) para quem ler o código sem
     ter visto este prompt.
5. Teste src/services/crashReporter.web.test.ts, espelhando a estrutura de
   crashReporter.native.test.ts (mock do módulo @sentry/browser via jest.mock, helper
   loadAdapter() com jest.isolateModules para recarregar o módulo memoizado a cada teste). Cubra:
   - Com DSN configurada: recordError chama Sentry.init uma única vez mesmo com vários erros
     reportados (memoização), e captureException recebe o Error e { tags: { scope }, extra:
     context }.
   - Valor não-Error lançado vira Error, sem serializar o conteúdo do valor na mensagem (mesmo
     teste de PII do lado nativo, adaptado).
   - Sem DSN configurada: recordError não lança, não chama Sentry.init/captureException, e
     logError é chamado (ou o efeito equivalente) exatamente uma vez mesmo com vários recordError
     em sequência — não uma vez por chamada.
   - Sentry.init/captureException lançando (simule): recordError não propaga o erro.
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(observability): conectar Sentry como coletor de erro em produção (web)
```

**Modelo recomendado:** Claude Opus 5 — soma uma dependência nova (decisão que o CLAUDE.md §4.1
pede para justificar) com um requisito de privacidade que não pode ser relaxado por engano (dado
de saúde saindo para um processador terceiro, CLAUDE.md §4.4) — mais julgamento de projeto do que
os outros itens já prontos deste app.

---

## Prompt 2 — Sincronizar a documentação com o gap fechado

```
Contexto: no BP Tracker, o Prompt 1 já implementou o coletor de erro web de verdade
(src/services/crashReporter.web.ts usando @sentry/browser). Três documentos ainda descrevem o
estado ANTERIOR (gap aberto) e precisam ser atualizados para não desinformar quem ler depois —
nenhuma mudança de código nesta tarefa, só prosa.

Tarefa:
1. Em src/lib/logger.ts, no comentário de setCrashReporter (bloco "ESTADO ATUAL"), troque a linha
   sobre a WEB: hoje diz que é gap conhecido e no-op; atualize para descrever que a web também
   está conectada (Sentry via crashReporter.web.ts), no mesmo padrão de frase usado para a linha do
   NATIVO logo acima. Não reescreva o parágrafo inteiro — só a parte que ficou desatualizada.
2. Em RELEASE_CHECKLIST.md, seção "Observabilidade — coletor de erro em produção": troque o item
   "⚠️ Web: gap conhecido, permanece aberto" por um item resolvido, no mesmo formato do item
   "✅ Nativo: resolvido" logo acima (checkbox marcado, referência ao arquivo/dependência usada).
   Se a DSN do Sentry ainda depender de um projeto criado pelo usuário em sentry.io (credencial
   que este prompt não pode inventar), adicione um item 🔴 separado para isso — só o código está
   pronto, a conta/projeto Sentry em si é decisão de fora do repositório, mesmo padrão já usado
   para o Play Integrity do App Check nesse mesmo arquivo.
3. Em roadmap_futuro.md, marque o item 3 ("Coletor de erros em produção na Web") como resolvido —
   siga o padrão já usado no próprio histórico deste repositório para itens fechados (título
   riscado com `~~texto~~` seguido de "— ✅ Resolvido", parágrafo curto dizendo o que foi feito e
   o que ainda depende do usuário, se houver). Atualize também a tabela de resumo executivo no fim
   do arquivo.
4. NÃO edite plano_de_funcionalidades.md nem prompts_de_funcionalidades.md — são registros
   históricos de auditorias já fechadas, não documentação viva do estado atual (diferente de
   RELEASE_CHECKLIST.md e roadmap_futuro.md, que são).
5. Rode npm run lint && npm run typecheck && npm test (nenhum destes deveria quebrar — é só
   documentação — mas confirme mesmo assim).

Commit:
docs(observability): atualizar checklist e roadmap após fechar o gap de crash reporting na web
```

**Modelo recomendado:** Claude Haiku 4.5 — sincronizar prosa com um estado de código que já existe
e está correto, sem nenhuma decisão nova.

---

## Como usar

- Rode o Prompt 1 primeiro — o Prompt 2 só faz sentido depois que `crashReporter.web.ts` de fato
  usa Sentry (ele documenta um estado que ainda não existe até lá).
- Depois do Prompt 1, o app funciona normalmente MESMO sem uma conta Sentry criada — a DSN ausente
  vira log único de aviso, nunca erro visível ao usuário (mesmo espírito de App Check: enforcement
  desligado no Console não derruba o app). Criar o projeto em sentry.io e preencher
  `EXPO_PUBLIC_SENTRY_DSN` no `.env.local`/secrets do EAS é um passo 🔴 seu, fora do código —
  o Prompt 2 já deixa isso registrado no `RELEASE_CHECKLIST.md`.
- Cada prompt termina em UM commit. Depois de rodar os que quiser, revise o diff acumulado e faça
  `git push` (ou peça para eu fazer) — não faço push automático de nenhum destes sem você pedir.
