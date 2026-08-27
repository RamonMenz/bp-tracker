# Plano de Ecossistema — Suíte de Micro-Rotinas

> Análise de 2026-08-27, papel de PM/Tech Lead. Avalia a viabilidade de transformar o BP Tracker
> na base de um ecossistema de apps de micro-rotinas (remédios, água, ciclo menstrual), junto do
> **Rastreador de Metas** (`RamonMenz/rastreador-de-metas`, commit `96bb0c5`).
>
> Baseada na leitura dos **dois** repositórios, não só deste. Complementa
> `plano_de_monetizacao.md` (receita de um app) e `roadmap_futuro.md` (features do BP Tracker).

---

## 0. O achado que muda a premissa

A ideia parte de que BP Tracker e Rastreador de Metas compartilham "a mesma mecânica central de
engajamento e lembretes", pronta para ser extraída num core comum.

**Eles não compartilham nada.** Não é "pouco" — é zero.

| Camada | BP Tracker | Rastreador de Metas | Reaproveitável |
|---|---|---|---|
| Cliente | Expo / React Native (Android + Web) | React + Vite — **só web, SPA** | Nada |
| Backend | Firebase serverless, cliente → Firestore direto | Java + Spring Boot, PostgreSQL + Flyway | Nada |
| Autenticação | Firebase Auth, Google como provedor único | JWT próprio, e-mail/senha, verificação, reset | Nada |
| **Lembretes** | Notificação local + FCM, `nextRun` puro e testado | **`ReminderChannel { EMAIL }`**, job Spring | Nada |
| Estado de servidor | `onSnapshot` do Firestore | TanStack Query | Nada |
| Estilo | NativeWind v4 | CSS puro | Nada |
| Gráficos | `react-native-gifted-charts` (RN) | Recharts (DOM) | Nada |
| Pagamento | nenhum ainda | **Asaas, já implementado** | Só o aprendizado |
| Testes / lint | Jest + jest-expo / ESLint | JUnit + Vitest / oxlint | Nada |

### O ponto específico que desmonta a premissa

A "mecânica central de engajamento" **existe só no BP Tracker**.

Este repositório tem uma engine de lembrete de verdade: notificação local espelhada, FCM, índice
de disparo pré-calculado em `schedules/{uid}`, `computeNextRun` puro e testado com horário de
verão e virada de dia, poda de token morto, reagendamento antes do envio para o retry não
duplicar. Meses de trabalho difícil e específico de mobile.

O Rastreador manda **e-mail**. Um `ReminderScheduler` do Spring lendo uma tabela `reminders`, com
`ReminderChannel` tendo exatamente um valor: `EMAIL`. Não há app mobile, não há push, não há token
de dispositivo, não existe o problema de Doze mode nem de fabricante matando processo. É outro
problema, resolvido de outro jeito, em outra linguagem.

> Isso não é crítica a nenhum dos dois — os dois estão bem construídos para o que são. É que
> **eles não são dois membros de uma família; são dois produtos diferentes que por acaso
> pertencem à mesma pessoa.**

**Assimetria útil:** o Rastreador já tem domínio de cobrança rodando (`Plan`, `Subscription`,
`Payment`, `BillingCycle`, `AsaasWebhookController`, `WebhookReconciliationScheduler`,
`PlanDowngradeScheduler`) enquanto o BP Tracker tem zero. Na monetização, o Rastreador está na
frente — e o `MONETIZATION_PLAN.md` de lá tem pesquisa de gateway que vale reler antes de decidir
o trilho de cobrança web daqui (`plano_de_monetizacao.md §4`).

---

## 1. A bifurcação

Antes de qualquer decisão sobre monorepo, bundle ou ordem de lançamento, existe uma escolha que
determina todas as outras.

| | Opção A — Dois negócios separados | Opção B — Convergir tudo num stack | **Opção C — Convergir no ecossistema, não no código** |
|---|---|---|---|
| O quê | BP Tracker semeia a suíte de saúde; Rastreador segue independente. Compartilham marca e divulgação cruzada, nunca código. | Reescrever o Rastreador como app Expo sobre o core do BP Tracker. | Apps **novos** nascem sobre o core do BP Tracker, em monorepo. O Rastreador fica como está e entra na família por identidade, bundle e divulgação cruzada. |
| Custo | Zero | 4–8 meses | 3–4 semanas de extração |
| Teto | Baixo — dois sistemas de identidade e dois trilhos de cobrança inviabilizam o passe | Alto | Alto |
| Risco | — | Alto: todo componente é React DOM e teria que virar RN; auth, cobrança e social também | Baixo |

**Recomendação: Opção C.** A razão de fundo: o valor do ecossistema para o usuário está em
**identidade única, assinatura única e lembretes coordenados** — não em os apps serem feitos do
mesmo código. Nenhuma das três exige stack comum; duas exigem só que os sistemas se falem por HTTP.

---

## 2. Suíte de apps ou super-app?

**Suíte**, e o argumento decisivo está escrito no `CLAUDE.md §1` deste repositório:

> *"A home **é** o formulário — nunca introduza um passo 'toque no + para adicionar'"*, com
> registro em ≤10 segundos e 4 toques.

Um super-app **não pode** honrar isso. Se o app cobre pressão, água, remédio e ciclo, a home vira
necessariamente um seletor — e o registro passa a custar um toque a mais, sempre, em todos os
fluxos. Seria destruir a única coisa que diferencia o BP Tracker de um caderno.

### A favor da suíte

- **Cada nicho é uma busca diferente na loja.** "Controle de pressão arterial" e "lembrete de
  beber água" são intenções distintas. Um app genérico de "saúde e estilo de vida" compete de
  frente com Google Fit, Samsung Health e Flo — e perde, porque não é melhor em nada
  especificamente.
- **Isolamento legal.** Dado de ciclo menstrual é a categoria mais sensível do portfólio. Num
  super-app, ele contamina a classificação de Data Safety, a política de privacidade e o raio de
  exposição de *tudo*. Em app separado, é um perímetro contido.
- **Falha isolada.** Rejeição na Play, bug de migração, nota 1 estrela em massa — atinge um app,
  não a receita inteira.

### O custo honesto da suíte

- 4 fichas de loja, 4 ciclos de revisão, 4 conjuntos de screenshots e políticas, 4 dashboards de
  crash.
- 4 builds nativos a cada mudança no core — é isso que torna o monorepo obrigatório, não opcional.
- O usuário precisa instalar 4 coisas. Só é aceitável se instalar a segunda for quase grátis (ver
  **login único**, §4).

### Uma exceção que vale considerar

Água e remédio são mecanicamente quase o mesmo app: lembrete recorrente + registro de um toque.
Existe caso legítimo para fundi-los num "Rotinas" único. **Eu ainda separaria**, por dois motivos:
a busca na loja é diferente, e principalmente porque as intensidades de notificação são
incompatíveis — água quer 8 avisos/dia, remédio quer 2–3 e são clinicamente críticos. Misturar os
dois no mesmo canal faz o usuário desligar os dois de uma vez para calar a água.

---

## 3. Branding e navegação de família

Família se percebe por três coisas, nesta ordem de impacto:

1. **Login único, de verdade.** Instalar o segundo app e já estar logado, com fuso, preferência de
   tema e horários herdados, vale mais que qualquer elemento visual. É a diferença entre "outro app
   do mesmo cara" e "meu app". Exige pool de Auth compartilhado — requisito técnico nº 1 do
   ecossistema.
2. **Um sistema de design, um sotaque por app.** Os mesmos primitivos (`Button`, `Card`, `Screen`,
   `Field`), a mesma escala tipográfica, o mesmo neutro slate — e uma cor de destaque por app. O BP
   Tracker fica com o blue-600 que já tem; os outros ganham matizes vizinhos. Mesma silhueta de
   ícone, acento diferente: reconhecível na gaveta sem parecer clone.
3. **Uma linha permanente em Ajustes** — "Outros apps da família" — igual em todos. Não é
   divulgação, é navegação.

**O que não fazer:** prefixo de nome em todos os apps ("MinhaSaúde Pressão", "MinhaSaúde Água").
Prejudica a busca na loja, que é exatamente a vantagem da suíte, e soa corporativo num produto que
ganha por parecer simples e pessoal.

---

## 4. Core compartilhado

A extração é mais barata do que parece, e o mérito é do próprio repositório: as regras do
`CLAUDE.md §3.2` já separam domínio de infraestrutura. **A fronteira que seria preciso desenhar já
está desenhada.**

### Sai quase intacto

- `src/components/ui/` — `Button`, `Card`, `Text`, `Field`, `Screen`, `ConfirmDialog`,
  `InlineFeedback`, `SectionHeader`, `DateTimeField` com split web/nativo.
- `src/features/auth/` — Google Sign-In nas duas plataformas, `useSession`, `ensureUserProfile`,
  reautenticação, exclusão de conta. Muito código específico de plataforma já resolvido.
- `src/features/reminders/` — a engine: notificação local, registro de token, `pushAvailability`,
  push em foreground, deep link. **É a joia da coroa.**
- `src/services/firebase/`, App Check, crash reporting; `src/lib/` (datetime, file, logger, csv);
  `src/features/theme/`.
- `functions/` — `nextRun.ts` (puro e testado), `dispatchReminders`, triggers de schedule e device,
  `onUserDelete`.

### Fica com o BP Tracker

`src/domain/bp-classification.ts`, `src/features/readings/`, `src/components/bp/`. E é só isso — a
proporção entre core e domínio é surpreendentemente favorável.

### As quatro mudanças que a engine exige

A engine é ótima, mas está amarrada a um app só:

```
1. O ID do documento É o uid — um schedule por usuário, para sempre.
   schedules/{uid}              →  schedules/{scheduleId} { uid, appId }

2. Conteúdo do push fixo no código, em sendReminder().
   title: 'Hora de medir sua pressão'
   data: { deeplink: 'bptracker://record' }
                                →  vem do documento, por app

3. Token FCM é POR INSTALAÇÃO. Dois apps = dois tokens.
   users/{uid}/devices/{hash}   →  ...{ appId }, e readDeviceTokens filtra
   Sem isso, o lembrete do remédio abre o app de pressão.

4. A regra de recorrência só sabe "lista de HH:mm".
   computeNextRun(times[], zone) → computeNextRun(rule, zone)
   rule: daily-times | interval | weekly | predicted-date
   (água = intervalo; ciclo = data prevista)
```

O item 4 é o mais fácil e o mais valioso: `computeNextRun` já é função pura com testes de horário
de verão e virada de dia. Transformar o primeiro parâmetro numa união discriminada é extensão
natural de código já isolado e coberto — exatamente o que a disciplina de "lógica pura sem I/O"
comprou.

> **Vantagem que já existe sem ter sido planejada para isso:** `dispatchReminders` faz **uma query
> numa coleção plana** (`where('nextRunAt','<=',now)`), não uma varredura por usuário. Foi feito por
> custo, mas tem consequência ótima: quando os apps compartilharem `schedules`, **um único ciclo do
> cron já enxerga todos os lembretes vencidos de todos os apps de todos os usuários**. Agrupar por
> `uid` e coordenar entre apps vira quase de graça — é o que torna viável a solução de fadiga de
> notificação do §6.

### Monorepo, sem hesitação

```
packages/
  core-ui/          # components/ui + theme
  core-auth/        # sessão, Google Sign-In, exclusão de conta
  core-reminders/   # engine no cliente
  core-firebase/    # init, App Check, crash reporting
  core-billing/     # entitlements + useEntitlement
  core-lib/         # datetime, file, logger, csv
  functions-core/   # nextRun, dispatch, triggers
apps/
  bp-tracker/  meds/  water/  cycle/
```

Repositórios separados com pacotes publicados significariam versionar e publicar sete pacotes a
cada ajuste de um botão. Para um time pequeno, é atrito diário sem contrapartida.

#### Onde o monorepo Expo dói — saiba antes

- **Metro precisa de configuração explícita** (`watchFolders`, `nodeModulesPaths`) para enxergar os
  pacotes. Não funciona por padrão.
- **Resolução de `.native.ts` / `.web.ts` através da fronteira de pacote.** Vocês já apanharam
  disso: o `eslint.config.js` tem comentário longo explicando que o resolver não lê `moduleSuffixes`
  e precisou listar extensões à mão. Piora entre pacotes.
- **NativeWind** precisa dos globs de `content` cobrindo `packages/`, senão as classes somem no
  build de produção — e somem em silêncio.
- **EAS Build** a partir de monorepo exige configuração própria em cada app.
- **Disciplina de regressão:** uma mudança em `core-reminders` pode quebrar quatro apps publicados.
  O core precisa da própria suíte de testes — que em boa parte já existe (`nextRun.test.ts`,
  `datetime.test.ts`, `logger.test.ts`).

### Um projeto Firebase ou vários?

**Um só**, com uma ressalva. Um projeto dá pool de Auth único (login único), coleção `schedules`
única (coordenação de notificação) e documento de entitlement único (o passe). Vários projetos
inviabilizam as três coisas e multiplicam a operação por quatro.

**A ressalva é o app de ciclo.** Dado de ciclo menstrual merece isolamento próprio — no mínimo
coleção separada com rules próprias, excluída de qualquer agregação entre apps, de qualquer feature
de IA e de qualquer export conjunto. Se o app crescer, mover para projeto próprio é a evolução
natural — desenhe desde o começo para que essa mudança seja possível sem migração dolorosa.

---

## 5. Passe do Ecossistema

O desenho de `entitlements/{uid}` recomendado em `plano_de_monetizacao.md §4` **já é a base certa**:
documento server-only, escrito por webhook via Admin SDK, lido pelo cliente. O passe é só mais um
`productId` que todos os apps reconhecem.

### A mecânica de loja que pega as pessoas de surpresa

Uma assinatura comprada no app A **não** pode ser validada pelo app B via Play Billing — compras são
escopadas ao pacote do app. O desbloqueio cruzado vem do *seu* servidor: a compra acontece no app A
pelo Play Billing, o webhook grava o entitlement, e os outros apps leem o **entitlement**, não a
loja. É o padrão de assinatura multi-app, é aceito, e é por isso que a fonte de verdade ser
server-side importa tanto.

### O problema dos dois trilhos

O Rastreador cobra por **Asaas** (web, Pix nativo, taxa a partir de ~2%). Os apps Expo na Play
cobram por **Play Billing** (15% no primeiro milhão de dólares). Um passe que desbloqueia recursos
*dentro do app Android* precisa ter sido comprado via Play Billing — vender esse desbloqueio só pelo
Asaas para fugir da taxa é o tipo de coisa que derruba app da loja.

### Preço

| Produto | Preço/ano | Papel |
|---|---|---|
| Pro de um app | R$ 69 – 89 | Porta de entrada; a maioria compra aqui |
| Passe do Ecossistema | R$ 149 – 199 | ~2× um app. O 2º vem de graça, do 3º em diante é margem |

Nunca precifique o passe como soma dos apps — o objetivo é converter para cima quem já compraria um.
O ganho real não é o ticket: é que **cancelar passa a custar quatro apps em vez de um**. Redução de
churn é o argumento econômico mais forte a favor do ecossistema inteiro.

### ⚠️ Não construa o passe agora

Vender bundle entre dois produtos com **dois sistemas de identidade, dois trilhos de pagamento e
dois armazenamentos de entitlement** — antes de qualquer um ter usuários pagantes — é a definição de
otimização prematura. O BP Tracker não tem nem cobrança individual ainda.

Ordem certa: Pro individual em cada produto → provar que alguém paga → só então unificar. O passe é
problema da fase 4, e a fase 4 pode nunca chegar se a fase 2 revelar que a disposição a pagar não
existe.

### Quando chegar a hora: como unir as identidades

O caminho barato é o Rastreador aceitar **token do Firebase como método de login adicional** —
verificação de JWT contra as chaves públicas do Google, algo que o Spring Security já sabe fazer e
que não exige IdP externo nem migrar as contas existentes. O Firebase vira o provedor de identidade
da família; quem já tem conta e-mail/senha no Rastreador continua entrando como sempre.

---

## 6. Fadiga de notificação

**Este é o maior risco do ecossistema — maior que qualquer decisão de stack.** E é problema de
arquitetura, não de UX.

A conta, se cada app se comportar como o normal do seu nicho:

| App | Notificações/dia |
|---|---|
| Água | 8 |
| Pressão | 3 |
| Remédio | 3 |
| Metas | 1 |
| **Total** | **15/dia** |

O usuário não vai desinstalar um app: vai desligar as notificações no sistema — e como o Android
agrupa por app, é bem provável que desligue o do remédio junto, porque a essa altura "esses apps"
viraram uma coisa só na cabeça dele. Nesse momento você não perdeu um produto; perdeu a proposta de
valor dos quatro ao mesmo tempo.

### A defesa, em camadas

- **Orçamento diário por usuário, no servidor.** Como `dispatchReminders` já enxerga todos os
  schedules vencidos numa query só, dá para agrupar por `uid` e aplicar um teto — digamos 6/dia —
  antes de enviar qualquer coisa.
- **Prioridade explícita quando o teto aperta:** remédio > pressão > metas > água. Adesão a
  medicação é clinicamente o mais importante; água é o mais dispensável. Precisa estar codificado
  como número no documento de schedule, não implícito.
- **Janela de coalescência.** Dois lembretes de apps diferentes a menos de ~10 min viram um só:
  *"Hora de medir a pressão e tomar o remédio das 8h"*. **Consequência técnica:** como o token FCM é
  por instalação, a notificação fundida sai por **um** app — o de maior prioridade — e o deep link
  precisa levar ao app certo de cada tarefa.
- **Horário de silêncio definido uma vez**, no perfil compartilhado, respeitado por todos. Hoje isso
  vive dentro de um app; passa a ser configuração de família.
- **Canais Android separados por app**, para o usuário calar a água sem calar o remédio. É a válvula
  de escape que evita o desligamento em bloco.
- **Recuo adaptativo:** lembrete ignorado sistematicamente tem frequência reduzida. Exige medir
  abertura — ou seja, exige a analytics que hoje não existe em nenhum dos dois projetos
  (`plano_de_monetizacao.md §2`).
- **Defaults honestos no app de água.** Oito avisos/dia é o padrão do nicho e é exatamente por isso
  que apps de água são desinstalados em uma semana. Comece em três.

### A tensão de privacidade — e por que ela se resolve sozinha aqui

Coordenar entre apps significa um serviço que sabe que a mesma pessoa usa pressão, remédio e ciclo.
Isso é correlação de dado sensível, e num desenho descuidado seria problema sério de LGPD.

Só que `schedules` guarda **apenas horário, fuso, tokens e regra de recorrência** — nunca medição,
nunca nome de medicamento, nunca data de ciclo. O coordenador precisa de metadado de agendamento,
não de dado de saúde. **Essa separação já existe no código e precisa ser preservada explicitamente
como invariante** quando a coleção virar multi-app.

---

## 7. Privacidade em conta única

- **A exclusão de conta tem que cascatear por todo o ecossistema.** Hoje `onUserDelete` apaga
  `users/{uid}` recursivamente e `schedules/{uid}`. Com conta única, um pedido sob o art. 18 da LGPD
  que apague só os dados de pressão e deixe remédio e ciclo para trás é atendimento parcial de um
  direito — mesma classe de falha dos entitlements órfãos (`plano_de_monetizacao.md §2.2`), com
  consequência bem pior.
- **Consentimento por app *e* por finalidade.** O modelo `users/{uid}/consents/{purposeId}` ganha
  dimensão de `appId`. Consentir com tratamento de pressão não é consentir com tratamento de ciclo —
  são finalidades distintas sob o art. 11, e conta única não as funde.
- **Resista ao "superperfil".** Cruzar pressão, medicação, hidratação e ciclo numa visão única
  esbarra no princípio da finalidade: cada dado foi coletado para um propósito declarado. Cruzamento
  exige base legal e consentimento próprios, e só deveria existir quando houver benefício concreto
  para o usuário — não porque é tecnicamente possível.
- **RIPD deixa de ser opcional.** Quatro apps, dado sensível, conta única e tratamento cruzado é
  exatamente o cenário em que a ANPD espera relatório de impacto (art. 38).

### ⚠️ Ciclo menstrual é categoria à parte

É o dado de maior risco do portfólio, e não só pela LGPD. Apps de ciclo já foram alvo de pedidos
judiciais de dados em outras jurisdições, e a confiança do público nessa categoria é baixa e
merecidamente cética.

Recomendações concretas: coleção e rules próprias, jamais sob a árvore comum; **considere não
sincronizar com o servidor por padrão** — local com backup criptografado opcional é hoje diferencial
de produto real nessa categoria, não limitação; exclusão total de qualquer feature de IA, export
conjunto ou agregação entre apps; política de privacidade e Data Safety próprios; e se algum dia
houver público nos EUA, é aqui que mora a exposição jurídica, não na pressão arterial.

**Sobre HIPAA:** continua não se aplicando a produto B2C brasileiro — quem regula é a LGPD, com
fiscalização da ANPD. Só entra se vender para prestadores de saúde nos Estados Unidos.

---

## 8. Divulgação cruzada sem irritar

Mesma regra dos afiliados: **a tela de registro é intocável.** Fora dela, em ordem de eficácia:

1. **Login único é a melhor divulgação que existe.** Se instalar o segundo app custa zero cadastro,
   a barreira deixa de ser persuasão e vira só descoberta.
2. **Dentro do próprio paywall.** Quem olha o preço do Pro está em modo de compra — mostrar que o
   passe inclui outros apps é informação útil, não interrupção. Maior conversão cruzada do
   portfólio.
3. **Depois de um marco** ("30 dias registrando sem falhar"). Boa vontade máxima, e uma vez só.
4. **Linha permanente em Ajustes.** Zero interrupção, disponível para sempre.

**Duas regras que evitam o desgaste:** uma pergunta, e nunca mais — dispensa registrada **no
servidor**, não em `AsyncStorage`, senão reaparece a cada aparelho novo e o usuário conclui que o app
é insistente. E teto global de uma sugestão por trimestre, contando todos os apps juntos.

### A sinergia real, e a que não existe

- **Pressão → remédio é quase perfeita:** praticamente todo hipertensivo em acompanhamento toma
  medicação diária. Maior taxa de conversão cruzada de todo o portfólio.
- **Pressão → ciclo é quase nula.** Público diferente, momento de vida diferente, necessidade
  diferente. O app de ciclo não é extensão do ecossistema — é problema de aquisição novo, do zero, e
  precisa ser planejado como tal.

---

## 9. Ordem de desenvolvimento

Ordenada por sinergia com o público que já existe, não por facilidade de construção.

| Fase | O quê | Prazo |
|---|---|---|
| **0** | **Extrair o core com o BP Tracker como único consumidor.** Monorepo, sete pacotes, BP Tracker publicado a partir dele. **Não comece pelo app 2** — extrair com um consumidor só prova Metro, EAS, NativeWind e resolução `.native/.web` sem risco de produto novo. Se der errado, deu errado num app que já funciona. | 3–4 semanas · **pré-requisito de tudo** |
| **1** | **Remédios.** Maior sobreposição de público do portfólio. Maior disposição a pagar. Mesmo ângulo de cuidador. É o segundo consumidor que valida o core de verdade. Exige as quatro mudanças da engine (§4). | 5–7 semanas |
| **2** | **Pro individual nos dois + orçamento de notificação.** Cobrança em cada app separadamente, provando disposição a pagar antes de qualquer bundle. Em paralelo, o teto diário e a coalescência — que precisam existir **antes** do terceiro app. | 4–6 semanas |
| **3** | **Água.** O app mais barato sobre o core pronto — e o de menor receita, com concorrência gratuita enorme. Papel dele é funil de aquisição para o passe, não linha de receita. Trate como marketing com código, com defaults de notificação modestos. | 2–3 semanas |
| **4** | **Passe do Ecossistema e identidade unificada.** Só faz sentido com três apps e receita comprovada. É aqui que o Rastreador entra na família: aceita token do Firebase como login e reconhece o entitlement do passe. Nenhuma reescrita. | 3–4 semanas |
| **5** | **Ciclo menstrual.** Por último, e não por ser difícil de construir. Público diferente do resto (sinergia quase nula com pressão), maior exposição jurídica, e exige postura de privacidade própria — possivelmente arquitetura local-first. Não deixe que seja o app onde você aprende as lições de monorepo. | 6–8 semanas |

---

## 10. As três coisas a levar desta análise

1. **O ecossistema começa no BP Tracker, sozinho.** Ele tem a engine, o alvo mobile e a disciplina de
   pastas que tornam a extração viável. O Rastreador é bom produto num stack incompatível — integrá-lo
   por identidade e bundle entrega quase todo o valor por quase nenhum custo.
2. **Fadiga de notificação é o risco que mata o portfólio**, e a solução é orçamento e prioridade no
   servidor — não texto mais gentil. Construa antes do terceiro app, porque depois o estrago já
   aconteceu.
3. **Não construa o passe antes de vender o primeiro Pro.** Um bundle entre produtos sem usuários
   pagantes resolve um problema que você ainda não tem, ao custo do problema que você tem.

---

> Baseado na leitura de `ramonmenz/bp-tracker` (branch `claude/bp-tracker-monetization-xwffv5`) e
> `ramonmenz/rastreador-de-metas` (`96bb0c5`), agosto de 2026. Estimativas de prazo supõem um
> desenvolvedor em tempo parcial e são ordens de grandeza para priorizar. Políticas de Google Play e
> App Store sobre assinatura multi-app mudam — confirme as vigentes antes de desenhar o fluxo de
> compra. Este documento trata de estratégia de produto e não substitui orientação jurídica.
