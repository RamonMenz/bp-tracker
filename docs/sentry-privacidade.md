# Sentry (Web) — privacidade dos relatórios de falha

## Achado

`Sentry.init` usava as integrações padrão do `@sentry/browser` 10.70.0. A integração `Breadcrumbs`
liga por padrão `dom`, `console`, `fetch`, `xhr`, `history` e `sentry`, e os breadcrumbs
acompanham qualquer erro enviado. As linhas do Histórico têm rótulos como "128 por 82", então um
valor de pressão podia sair do dispositivo junto com um erro (constitution §2; CLAUDE.md §4.4/§4.5).

## Causa (confirmada em `node_modules/@sentry/browser/build/npm/cjs/dev`)

| Fonte | O que carrega |
|---|---|
| `dom` (clique/tecla) | `aria-label`, `name`, `title`, `alt`, `id`, `class` do alvo (o texto do nó não é lido) |
| `console` | argumentos de `console.*` concatenados |
| `fetch` / `xhr` | método e URL (incluindo query) |
| `history` | rota de origem e de destino |
| `sentry` | mensagem da exceção |

Fora dos breadcrumbs, o evento ainda levava `exception.values[].value` (mensagem do erro e das
causas), `request` (URL e referrer) e `message`.

## Correção (`src/services/crashReporter.web.ts`)

- **Desligar** a integração `Breadcrumbs` (em vez de filtrar): o app não usa breadcrumb para
  diagnosticar (todo erro chega com `scope` + stack), e sanitizar seis fontes de texto livre por
  padrão é frágil — um rótulo novo na interface voltaria a vazar. `beforeBreadcrumb: () => null`
  fica como segunda camada.
- `beforeSend` reduz o evento ao essencial: remove `breadcrumbs`, `request`, `user`, `message`,
  `logentry` e troca a mensagem de cada exceção por um texto fixo. Ficam tags (`scope`), tipo e
  stack do erro, `extra` (`uid`/`docId`) e contexto do navegador/SO.
- Preservados: `sendDefaultPii=false`, `tracesSampleRate=0`, sem sessão, sem `setUser`, init preguiçoso.

## Testes

- `src/services/crashReporter.web.privacy.test.ts`: usa o SDK real (jsdom) com um transporte
  espião e procura sentinelas (pressão, observação, e-mail, nome) no envelope serializado, em
  clique, input, navegação, console, fetch, xhr, mensagem de exceção (com `cause`) e valor lançado
  não-Error. Antes da correção, 9 de 10 falhavam; depois, todos passam.
- `src/services/crashReporter.web.test.ts`: contrato das opções do `init`.

## Limites

- A mensagem da exceção some do Sentry: o diagnóstico depende do tipo, do stack e do `scope`.
- Nomes de arquivo/função no stack e `uid`/`docId` continuam saindo (permitido).
- Não foi verificada a chegada a um Sentry real (sem DSN, sem envio); o teste cobre o evento
  imediatamente antes do transporte.
- Ver pendência nativa abaixo.

## Reprodução

```bash
npx jest src/services/crashReporter.web
npm run lint && npm run typecheck && npm test
```

Para ver o vazamento original: remova `BREADCRUMBS_INTEGRATION_NAME`, `beforeBreadcrumb` e
`beforeSend` de `crashReporter.web.ts` e rode o primeiro comando.

## Registro para o relatório final

- Causa: breadcrumbs automáticos do Sentry (dom, console, fetch/xhr, history) ligados por padrão,
  além de mensagem de exceção e `request` no evento.
- Correção: integração `Breadcrumbs` desligada, `beforeBreadcrumb` descarta, `beforeSend` reduz o
  evento ao essencial.
- Testes: 10 de privacidade com SDK real + 1 de contrato; falhavam antes, passam depois.
- Pendência separada (nativo, não alterado): `crashReporter.native.ts` não tem breadcrumb
  automático de UI/console/rede (só `api.log` com contexto já sanitizado), mas repassa
  `error.message` sem filtro ao Crashlytics — o mesmo vetor da mensagem de exceção que aqui foi
  fechado. Decidir se redige a mensagem também no nativo.
- Não verificado: chegada ao Sentry real.

## Nota de 2026-11-27 — lado nativo (Crashlytics)

A pendência acima foi fechada em `src/services/crashReporter.native.ts`:

- O adapter não repassa mais o erro original. Antes de `recordError`, ele monta um `Error` novo
  com a mensagem fixa `[mensagem removida por privacidade]` (mesmo texto da web). Esse erro mantém
  o protótipo e o `name` do original (o tipo) e a stack com a mensagem trocada no cabeçalho.
  Ficam de fora a `cause` e as propriedades próprias extras (ex.: `customData` de um `FirebaseError`).
- Preservados: `scope` como `jsErrorName`, que é o que agrupa os não-fatais; breadcrumb `api.log`
  só com o contexto já sanitizado por `logError`; `require` tardio; `catch` que engole.
- Teste: `src/services/crashReporter.native.test.ts`, bloco "mensagem de exceção redigida", com
  sentinelas (pressão, observação, e-mail, nome) na mensagem e na `cause`, procuradas em tudo o
  que é entregue a `recordError` e `log`. Falhava antes da correção e passa depois.
- Perda aceita: o texto da mensagem some também do console do Crashlytics. O diagnóstico depende
  do tipo, da stack e do `scope`, como na web.
- Não verificado: a chegada a um Crashlytics real (não houve build nativo nem envio). O teste
  cobre o objeto entregue ao SDK.
- Pendência (não alterada, fora deste escopo): o próprio `@react-native-firebase/crashlytics`
  instala, ao ser carregado, um handler global de erro JS fatal (`ErrorUtils.setGlobalHandler`) e
  um de promise rejeitada sem tratamento (`lib/handlers.ts`). Os dois enviam `error.message` cru e
  não passam por este adapter; o fatal ainda registra `Unknown Error: ${valor}` para valor não-Error.
  Fechar isso pede outra decisão (desligar via `firebase.json` ou trocar o handler global).
