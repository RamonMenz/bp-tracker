# Plano de Monetização — BP Tracker

> Análise de 2026-08-26, papel de PM/Tech Lead. Avalia seis estratégias de receita **contra o
> código que existe hoje**, não contra o plano. Cada estratégia traz: facilidade de implementação,
> alterações técnicas necessárias, potencial de receita com faixa de preço, e requisitos de
> conformidade. Complementa `roadmap_futuro.md` (o que falta construir) e `RELEASE_CHECKLIST.md`
> (o que falta para publicar).

---

## 0. Ponto de partida — fatos do repositório que mudam a conta

| Fato | Consequência para monetização |
|---|---|
| **Cliente fala direto com o Firestore** (`PLAN.md §7`) | Não há API intermediária. Paywall client-side é contornável — só o que passa por Function é realmente bloqueável. |
| **`validProfile` usa `hasOnly([...])`** (`firestore.rules`) | Um campo novo em `users/{uid}` (`plan`, `isPro`) é **rejeitado na escrita** até as rules mudarem — e não deveria morar ali de todo jeito. |
| **`schedules/{uid}` já é server-only** (`allow read, write: if false`) | O modelo de entitlement copia esse padrão inteiro. Precedente pronto, nada a inventar. |
| **Functions v2 em `southamerica-east1`**, só scheduler + triggers | Zero endpoints HTTP. O primeiro webhook de pagamento é infraestrutura nova. |
| **Já prontos e gratuitos:** tendência 7/30 (`useReadingsTrend`), export CSV (`useExportCsv`), 2ª medição AHA, lembretes locais + FCM | Mover para o Pro o que já é grátis é **regressão**. Cobre pelo próximo degrau. |
| **Não há analytics de produto** — só Crashlytics (nativo) e Sentry (web) | Não dá para precificar nem escolher o que bloquear sem funil. Vem antes de tudo. |
| **URL da política de privacidade é placeholder** (`app/(app)/settings.tsx`) | Bloqueia qualquer lançamento comercial. Play + LGPD. |
| **Android + Web (Vercel). iOS não existe** — só o bundle ID reservado | Sem Sign in with Apple (`roadmap_futuro.md` item 3), a App Store rejeita login Google. |

---

## 1. Quadro geral

Facilidade e receita em escala 1–5. Receita estimada no cenário-base de **10.000 MAU** — premissas
detalhadas em cada seção. São ordens de grandeza para priorizar, **não projeções**.

| Estratégia | Facilidade | Receita | Risco | Prazo | Receita/ano (10k MAU) | Veredito |
|---|:--:|:--:|:--:|---|---|---|
| 1. Afiliados | 5 | 2 | 2 | 1–2 dias | R$ 4k – 18k | **Fazer já** |
| 2. Freemium / Pro | 2 | 5 | 3 | 4–8 semanas | R$ 60k – 190k | **Núcleo** |
| 3. Vitalício + Pix | 4 | 2 | 2 | 2–4 dias | R$ 6k – 25k | **Complemento** |
| 4. B2B / painel médico | 1 | 5 | 5 | 3–6 meses | depende de vendas | Validar antes |
| 5. AdMob | 3 | 1 | 4 | 1 semana | R$ 2k – 9k | **Não fazer** |
| 6. IA / insights | 2 | 3 | 4 | 2–3 semanas | dentro do Pro | Depois do Pro |

---

## 2. Programa de afiliados

**Facilidade: 5/5.** Um link de afiliado é `Linking.openURL()` com uma tag na query string. Não
escreve no Firestore, não precisa de Function, não muda o modelo de dados. Única estratégia
lançável numa tarde.

### Alterações técnicas

- Nova feature `src/features/equipment/` com catálogo tipado e validado por Zod.
- **Não fixe os links no bundle.** Produto sai de linha e tag muda; cada correção viraria um
  release na Play. Publique um `equipment.json` estático no host web (Vercel) com cache local, ou
  uma coleção `catalog/{itemId}` com `allow read: if signedIn(); allow write: if false;`.
- Se for pela coleção: ela precisa entrar em `firestore.rules` **acima** do `match /{document=**}`
  que nega tudo.
- Cadastro: Amazon Associates BR, Mercado Livre Afiliados, Shopee Afiliados. A Amazon exige um
  mínimo de vendas qualificadas nos primeiros 180 dias sob pena de encerrar a conta.
- Nenhum gateway de pagamento — a comissão é paga pela loja, fora do app.

### Onde colocar na interface

Regra que decide tudo: **a tela de Registrar é intocável** (meta de ≤10s e 4 toques, `CLAUDE.md §1`).
Em ordem de qualidade:

1. **No onboarding "como medir corretamente"** (`roadmap_futuro.md` item 7, não construído).
   Escolher aparelho validado é genuinamente parte de medir certo — a recomendação vira conteúdo
   útil, não anúncio. Intenção de compra máxima, atrito zero.
2. **Linha em Ajustes → "Equipamentos recomendados"**, abrindo subtela. Ajustes já é lista de
   linhas com `ChevronRightIcon`; entra sem inventar padrão novo.
3. **Card discreto no fim do Histórico**, abaixo do `TrendChart` — nunca acima, nunca entre as
   medições da lista.
4. **Lembrete de revalidação por idade do aparelho:** campo opcional "quando comprou?" e, após ~2
   anos, aviso neutro de que aparelhos perdem calibração. O gatilho é o calendário, não a saúde.

**Não crie uma quarta aba.** A barra tem três itens que são o produto. Uma aba "Loja" permanente
rebaixa o app de ferramenta de saúde a vitrine.

### ❌ Descartar: recomendar por "medição imprecisa"

Três motivos independentes, cada um suficiente sozinho:

1. **Tecnicamente impossível.** O app tem sistólica, diastólica, pulso e horário. Variação grande
   entre medições é o comportamento *normal* da pressão arterial (jaleco branco, esforço, horário,
   estresse) — nada nesse dado distingue aparelho ruim de fisiologia real.
2. **É alarmista** e contraria `CLAUDE.md §1` diretamente.
3. **É venda por medo:** criar dúvida sobre a saúde de alguém para em seguida oferecer produto.
   Além do problema ético, é a conduta que o CDC art. 37 trata como publicidade abusiva.

### Receita

**Seu público já comprou o aparelho.** Ninguém instala um app de registro de pressão sem ter um
medidor em casa. Esse é o teto real da estratégia.

| Item | Ticket típico | Comissão | Por venda |
|---|---|---|---|
| G-Tech de braço | R$ 130 – 200 | 4 – 8% | R$ 6 – 16 |
| Omron HEM-7122 | R$ 200 – 320 | 4 – 8% | R$ 8 – 25 |
| Omron Bluetooth | R$ 350 – 550 | 4 – 8% | R$ 14 – 44 |
| Braçadeira G/GG | R$ 60 – 130 | 4 – 8% | R$ 3 – 10 |

**Cenário-base:** 10k MAU, 1% clicando no ano, 8% convertendo, comissão média R$ 15 → **~R$ 1.200/ano**.
Público mais engajado (5% cliques, 12% conversão) com ticket maior → **~R$ 9.000/ano**.

Não é um negócio. É **café pago e, sobretudo, o primeiro sinal medível de intenção comercial** da
base — dado que vale mais que a comissão, porque diz se existe disposição a pagar antes de gastar
seis semanas construindo billing.

### Conformidade

- Clique sempre iniciado pelo usuário — nada de pixel, iframe ou preload contatando a loja.
- **Nenhum dado de saúde na URL.** Nem valores, nem categoria, nem `uid`.
- Rótulo **"link patrocinado" visível** (CDC art. 36) — exigido também por contrato dos programas.
- **Nunca faça a afirmação clínica você mesmo.** "Validado clinicamente" só para modelos que
  constam em listas independentes (STRIDE BP, dableducational.org), citando a fonte.
- Atualizar o Data Safety da Play: saída para domínio de terceiro com identificador de clique.

---

## 3. Freemium com plano Pro

### O que fica grátis — não negociável

- **Registrar medições, sem limite.** Limitar registros transforma o app em algo pior que um caderno.
- **Todos os lembretes** (8 horários, locais e push). Cobrar pelo lembrete é cobrar pela aderência
  ao tratamento — indefensável num app de saúde.
- **Histórico completo e classificação.** É o dado do usuário.
- **Export CSV e tendência 7/30.** Já entregues e gratuitos hoje.

> **"Backup na nuvem" não serve como recurso Pro.** O Firestore **já é** a nuvem: toda medição é
> gravada no servidor e sincroniza entre dispositivos desde o dia um, no plano gratuito. Vender
> isso é cobrar por algo que a pessoa já tem. O que existe ali de valor real é exportar em formato
> aberto e restaurar para outra conta — que é portabilidade (LGPD art. 18, V) e portanto **precisa
> ser gratuita**.

### O que vai para o Pro, por retorno sobre esforço

**1. Relatório em PDF para o médico — a âncora do plano.** Momento de necessidade nítido (a consulta
marcada), valor percebido alto, e o dado já existe: `getAllReadings` com `ReadingDateRange`,
`computeDailyTrend` e o `TrendChart` estão prontos. Falta só a renderização. Gere **no cliente** com
`expo-print`, reaproveitando `saveAndShareCsv` em `src/lib/file.ts` — preserva a decisão do
`PLAN.md §3.4` (dado de saúde nunca sai do dispositivo por um segundo canal). PDF no servidor exigiria
Storage, URL assinada e expiração: mais código, mais custo, e um caminho de vazamento que hoje não
existe. **Esforço: 3–5 dias.**

**2. Janelas longas e recortes de tendência.** `useReadingsTrend` hoje é `TrendWindow = 7 | 30`.
Estender para 90/180/365, mais média manhã × noite (o horário já está em `measuredAt`) e percentual
de dias na meta. Quase tudo cálculo puro sobre dado já carregado. **Esforço: 2–4 dias.**

**3. Meta pessoal e indicador de aderência** (`roadmap_futuro.md` item 2). Dois campos novos no
perfil — **lembre que `validProfile` usa `hasOnly`**: sem atualizar as rules no mesmo commit, a
escrita é rejeitada em produção. **Esforço: 4–6 dias.**

**4. Modo cuidador / múltiplos perfis** (`roadmap_futuro.md` item 4). Maior disposição a pagar da
lista — quem cuida da pressão do pai idoso paga *todo mês*, porque o cuidado não acaba. Também a
mudança mais pesada: o modelo assume `users/{uid}` dono único das suas `readings`, com o `uid` no
caminho. Escolha entre perfis dentro da conta (rules quase intactas) e contas ligadas por convite
(mais correto, rules bem mais complexas). **Esforço: 3–4 semanas.** É o que sustenta o preço.

> **⚠️ Cuidado com "alertas para familiares".** Avisar automaticamente um familiar quando uma
> medição passa de um limiar muda a natureza do produto: deixa de registrar e passa a **triar** —
> aproximando-se da definição de software como dispositivo médico (Anvisa RDC 657/2022). Cria também
> uma expectativa de confiabilidade que a entrega de push não sustenta (o próprio `PLAN.md` lista
> "push não chega" como risco crítico): o familiar que *não* recebeu o alerta vai assumir que estava
> tudo bem. **Versão segura:** resumo semanal compartilhado por escolha do usuário, descritivo, sem
> limiar e sem urgência.

### Alterações técnicas

#### Onde mora o entitlement

**Não coloque `plan` em `users/{uid}`:** esse documento é gravável pelo próprio cliente
(`allow update: if isOwner(uid)`), então qualquer pessoa com o console aberto se promove a Pro.

Crie `entitlements/{uid}` espelhando `schedules/{uid}`:

```ts
{ plan, status, productId, expiresAt, source: 'play'|'stripe', updatedAt }
```

- Rules: `allow get: if isOwner(uid); allow list, write: if false;` — leitura pelo dono, escrita só
  pelo Admin SDK (que ignora as rules).
- Novo caminho em `src/lib/firestore-paths.ts` (§3.2 proíbe literal solto).
- Nova feature `src/features/billing/` com `useEntitlement()` via `onSnapshot`, `unsubscribe` no cleanup.
- Incluir na limpeza de `onUserDelete` **no mesmo commit**.

> **Consequência de "o cliente fala direto com o Firestore":** PDF e gráficos são gerados no
> dispositivo com dados que o usuário já pode ler — o bloqueio é **apenas de interface**. Alguém
> determinado contorna, e tudo bem. Mas a regra decorrente é rígida: **nunca gate no cliente uma
> feature que custa dinheiro por uso.** A IA (§7) verifica o entitlement dentro da Function.

#### Pagamentos

- **Use RevenueCat.** Embrulha Play Billing + Stripe atrás de uma noção única de entitlement, com
  webhooks prontos para renovação, cancelamento, carência e reembolso. Gratuito até um patamar de
  faturamento. `react-native-iap` + validação própria só compensa em escala grande.
- **Primeira Function HTTP do projeto:** `onRequest` recebendo o webhook, assinatura validada com
  segredo do Secret Manager via `defineSecret` (`CLAUDE.md §4.4`), idempotente por ID de evento.
- **Android exige Play Billing** para conteúdo digital consumido no app — 15% sobre o primeiro
  milhão de dólares anuais no programa para desenvolvedores pequenos, 30% acima. Regras de
  *anti-steering* restringem apontar o usuário para pagar fora do app; o cenário regulatório vem
  mudando — **confirme a política vigente** antes de desenhar o fluxo.
- **Web (Vercel) precisa de trilho próprio:** Stripe Checkout, com RevenueCat unificando o
  entitlement. Sem taxa de loja, é o melhor canal de margem e o lugar natural para o plano anual.
- **Build nativo novo** (SDK de billing é código nativo) + faixa de teste fechada na Play Console.

### Preço

| Plano | Preço | Observação |
|---|---|---|
| Mensal | R$ 11,90 – 14,90 | Existe para ancorar o anual, não para vender |
| Anual | R$ 69 – 89 | ~45% de desconto; é o plano que você quer vender |
| Vitalício | R$ 199 – 249 | Ver §4 |
| Teste grátis | 7 dias | Sem cartão na web; na Play, fluxo padrão |

**Cenário-base:** 10k MAU, conversão 2% (faixa típica em saúde é 1–3%; gatilho forte como "consulta
marcada" pode levar a 4–5%), ticket anual médio R$ 79 → **R$ 15.800 brutos/ano**, ~R$ 13.400
líquidos. Com 5% de conversão e mistura de vitalícios, ~**R$ 45.000/ano**. A faixa de R$ 60k–190k do
quadro geral pressupõe crescimento para 30–50k MAU — objetivo, não ponto de partida.

### Conformidade

- **Arrependimento em 7 dias** (CDC art. 49) além da política de reembolso da loja. Cancelamento
  óbvio dentro do app.
- **Renovação automática declarada com clareza** antes da compra (preço, periodicidade, como
  cancelar) — telas ambíguas são rejeitadas na revisão.
- **CNPJ (MEI/ME), nota fiscal e ISS.** As lojas retêm a taxa delas, não o seu imposto.
- **Consentimento separado por finalidade** — aceitar os termos não é aceitar IA nem
  compartilhamento com médico. Dado de saúde é sensível (LGPD art. 11): consentimento específico e
  destacado, um por finalidade.

---

## 4. Licença vitalícia e doação via Pix

Não são alternativas ao freemium — são degraus dentro dele, para quem recusa assinatura por princípio.

### Vitalício: sim, como terceira opção — nunca como única

A objeção padrão (custo eterno, receita única) **não se aplica aqui**: um usuário disciplinado gera
~1.100 escritas e alguns milhares de leituras por ano, mais três pushes diários — centavos por
usuário por ano nos preços do Firestore e do FCM. A arquitetura de `schedules/{uid}` (`PLAN.md §3.2`)
foi desenhada para o custo acompanhar o usuário ativo, não a base. Um vitalício de R$ 219 paga
décadas da infraestrutura desse usuário.

O custo real do vitalício é **o desenvolvimento futuro que ele não financia**: quem pagou em 2026
espera modo cuidador e IA em 2029. Por isso ofereça-o **ao lado** do anual, a ~3× o preço anual.
Converte quem tem aversão a assinatura, elimina ansiedade de recorrência e antecipa caixa no
lançamento, sem substituir a receita recorrente.

Tecnicamente é quase de graça depois do §3: mais um produto (não-consumível na Play, pagamento único
no Stripe) escrevendo o mesmo `entitlements/{uid}` com `expiresAt: null`.

### Doação: Pix, não "Buy Me a Coffee"

Ko-fi e BMC cobram em dólar, retêm percentual e adicionam atrito de cartão internacional. **Uma
chave Pix com QR code em Ajustes** não tem taxa, cai na hora e é o gesto que um usuário brasileiro
faz sem pensar. ~2 horas de trabalho.

> **⚠️ Armadilha do "pague quanto quiser para tirar os anúncios".** Isso **não é doação**. No
> momento em que o pagamento dá acesso a qualquer coisa dentro do app (remover anúncios, liberar
> recurso, um selo), vira compra de conteúdo digital e a política do Google Play exige Play Billing.
> Cobrar por Pix nesse cenário é violação com risco de remoção. A doação só é doação se **não
> devolve nada** — e mesmo assim a exceção da Play é estreita e trata organizações registradas
> diferente de pessoas físicas. Confirme a política vigente.

**Expectativa realista:** 0,1–0,5% dos usuários doam, ticket R$ 10–30. Em 10k MAU, R$ 100 a R$ 1.500
no ano inteiro. Termômetro de afeto, não linha de receita.

---

## 5. B2B — acompanhamento por médicos

### Por que o modelo atual não comporta

Toda a segurança repousa numa ideia: o `uid` está **no caminho** da coleção, e a regra é
`request.auth.uid == uid`. Não existe conceito de acesso delegado, papel, consentimento revogável ou
trilha de auditoria. Adicionar isso não é estender as rules — é reescrever o modelo de acesso.

### Faça a versão barata primeiro: relatório compartilhável com validade

O paciente gera um link temporário e somente-leitura e manda ao médico. Coleção `shares/{shareId}`
com `shareId` aleatório de 128 bits, contendo um **snapshot** do período (não acesso ao dado vivo) e
um `expiresAt`:

```javascript
allow get: if resource.data.expiresAt > request.time;
```

O segredo é a impossibilidade de adivinhar o ID — modelo de link não listado. O paciente revoga
apagando o documento; uma Function agendada limpa os vencidos.

Resolve "meu médico quer ver meu diário" sem cadastro de médico, sem papéis, sem painel, sem
contrato. **Esforço: 1 semana.** E mede a demanda: se ninguém gerar links, o painel nunca teria
sido vendido.

### Se o painel se justificar depois

- `clinics/{clinicId}`, `clinicians/{uid}`, `patientLinks/{linkId}`, vínculo por convite com
  **aceite explícito e revogável do paciente**.
- **Custom claims** no token para o papel de clínico — sem isso as rules dependeriam de `get()` a
  cada avaliação, o que custa leitura e esbarra no limite de acessos a documentos por regra.
- **Trilha de auditoria obrigatória:** qual clínico leu quais dados de qual paciente e quando. É o
  que se apresenta à ANPD em caso de incidente.
- **Segundo provedor de autenticação.** As rules fixam `sign_in_provider == 'google.com'`; médico em
  consultório costuma usar e-mail institucional. Mudar essa linha com muito cuidado — hoje ela é uma
  trava de segurança real.
- Painel web separado (Next.js) — o bundle do app cliente não deve carregar código de clínica.

### Regime regulatório que se abre

- **LGPD art. 11 e art. 38** — consentimento específico e destacado, e RIPD (relatório de impacto)
  esperado nessa escala de tratamento.
- **CFM Resolução 2.314/2022** se o uso configurar acompanhamento clínico a distância.
- **Certificação SBIS/CFM** se o sistema virar registro eletrônico em saúde. Processo de meses.
- **Anvisa RDC 657/2022** se o app produzir saída de apoio a decisão clínica. **A linha é nítida:**
  exibir e organizar o que o paciente digitou não é dispositivo médico; interpretar, alertar ou
  recomendar conduta começa a ser.
- **HIPAA só importa se vender para os EUA** — BAA com o Google Cloud e verificação serviço a
  serviço de quais componentes do Firebase estão cobertos (Auth e FCM historicamente mais restritos
  que o Firestore). Para o Brasil aplica-se a LGPD; HIPAA não tem efeito aqui.

### Receita

**R$ 99 – 299 por médico/mês**, ou R$ 20 – 40 por paciente acompanhado. Vinte clínicos a R$ 199 são
R$ 47.760/ano — mais que todo o B2C do cenário-base, com vinte clientes. Em compensação: venda
consultiva de ciclo longo, contrato, nota fiscal, suporte humano e SLA. Muda o que você faz no dia a
dia, não só o que o app faz.

---

## 6. Publicidade via AdMob — não fazer

### A conta que encerra a discussão

eCPM de banner no Brasil: R$ 1 – 5 por mil impressões. Com 10k MAU, ~15 sessões/mês e um banner por
sessão são 150 mil impressões mensais: **R$ 150 – 750/mês**, na melhor hipótese. Agravante
específico: saúde tem restrições fortes de publicidade personalizada, então o sinal mais valioso
(interesse em saúde cardiovascular) é justamente o que não pode ser monetizado — sobra inventário
genérico de baixo valor.

Comparação direta: **um único aparelho vendido por afiliado rende o equivalente a dezenas de milhares
de impressões de banner**, sem SDK, sem consentimento, sem dano ao tom.

### O que se paga por esses ~R$ 400/mês

- **Consentimento obrigatório** — o AdMob coleta o Advertising ID (dado pessoal sob LGPD), exigindo
  uma CMP (UMP do Google): um diálogo antes do primeiro uso, no app cuja proposta é registrar em 10s.
- **Declaração de compartilhamento publicitário no Data Safety**, lida pelo usuário na ficha da loja.
- **O tom "Medical Clean" acaba** — o ativo mais difícil de reconstruir.
- **Não funciona na web** — metade da distribuição é SPA no Vercel; ali seria AdSense, caminho
  separado e com aprovação incerta para conteúdo de saúde.
- **Build nativo novo** e SDK pesado no bundle.

### Se ainda assim quiser testar

**Toleráveis:** vídeo premiado *opcional* liberando uma ação Pro avulsa ("assista para gerar um
relatório PDF agora"); banner exclusivamente no rodapé do Histórico. **Proibido em qualquer
cenário:** interstitial, e qualquer anúncio na tela de Registrar.

---

## 7. Insights com IA

### Arquitetura

Única feature que **exige** servidor: a chave da API não pode existir no bundle. Caminho:
`httpsCallable` → Function em `southamerica-east1` → API do modelo, chave em
`defineSecret('ANTHROPIC_API_KEY')`.

- **Verifique o entitlement dentro da Function**, lendo `entitlements/{uid}` com o Admin SDK. É o
  caso em que o bloqueio client-side não basta — cada chamada custa dinheiro real.
- **Cota por usuário** num contador `aiUsage/{uid}`, também server-only. Sem isso, um usuário em
  laço custa o lucro de cem.
- **App Check em enforce** na callable. `appCheck.web.ts` e `appCheck.native.ts` já existem — falta
  ligar. Sem isso, sua Function paga é uma API aberta.

### Envie estatísticas, não prontuário

Em vez das medições cruas, calcule no cliente o que `computeDailyTrend` já faz e envie **apenas
agregados**: médias por período, distribuição por categoria, dias com registro, diferença manhã ×
noite. Corta o dado pessoal transferido, reduz tokens, e melhora a saída (o modelo recebe o resumo
pronto em vez de aritmetizar cem linhas). Um relatório mensal fica em fração de centavo — **o custo
de inferência não é o problema desta feature.**

### O problema real: o que o texto pode dizer

`CLAUDE.md §1` é categórico — o app registra, não diagnostica, e nunca gera linguagem alarmista ou
que soe como orientação médica. Um LLM solto sobre dados de pressão viola isso sozinho na primeira
semana. Travas:

- **Escopo descritivo e de aderência, só.** "Você registrou em 18 dos 30 dias" e "suas manhãs têm
  média mais alta que suas noites" são fatos sobre o registro. "Sua pressão está descontrolada",
  "procure um médico" e "isso pode indicar" ficam fora.
- **Lista de recusa explícita no system prompt** + validação determinística da saída antes de exibir.
  Se contiver termo proibido, não mostre — não tente consertar.
- **Aviso permanente e visível** junto do resumo (o componente `Disclaimer` já existe).
- **Não registre em log o conteúdo enviado nem a resposta** (`§4.5`). Para auditoria, identificador
  e horário — não texto.

### ⚠️ Isto contraria uma regra do próprio repositório

`CLAUDE.md §4.4` diz, sobre dado de pressão: *"não envie para serviços de terceiros"*. Esta feature
faz exatamente isso, e para fora do país — sob a LGPD, **transferência internacional de dado pessoal
sensível**, sujeita ao art. 11 (consentimento específico e destacado) e ao art. 33 (base legal da
transferência).

Não é impeditivo, mas exige quatro coisas antes de existir:

1. **Opt-in explícito por usuário**, separado dos termos gerais e reversível.
2. **Envio apenas de agregados**, conforme acima.
3. **Contrato de tratamento de dados com o provedor, com retenção zero.**
4. **Emenda documentada ao `CLAUDE.md §4.4`** — uma regra do repositório sendo silenciosamente
   contrariada por uma feature é como se perde a disciplina que fez este código ficar bom.

### Como cobrar

**Inclua no Pro, com cota — não cobre por uso.** Cobrança por consumo exigiria produtos consumíveis
na Play, saldo e tela de créditos: muito código para uma feature de margem enorme. O público
brasileiro também reage mal a preço variável em app de saúde. "Seu plano Pro inclui 4 resumos por
mês" é previsível para os dois lados, e o custo marginal é desprezível.

---

## 8. Sequência recomendada

A ordem importa mais que a escolha: cada fase gera a informação que torna a próxima decidível.

| Fase | O quê | Prazo |
|---|---|---|
| **0** | **Destravar o lançamento comercial.** Política de privacidade real substituindo o placeholder de `settings.tsx`; Data Safety; App Check em *enforce*; e **analytics de produto** — sem funil você escolheria o que bloquear no escuro. | 1 semana · **bloqueante** |
| **1** | **Afiliados e Pix.** Zero infraestrutura. O valor não é a comissão: é a primeira medida real de intenção comercial. | 2–3 dias |
| **2** | **Relatório em PDF, liberado para todos.** Grátis por 30–60 dias, medindo quantos geram e quando. Teste barato de que o paywall tem âncora, antes de semanas em billing. | 1 semana |
| **3** | **Infraestrutura de assinatura.** `entitlements/{uid}`, webhook RevenueCat, Play Billing, Stripe, `useEntitlement()`. Só então PDF e janelas longas passam para o Pro — com quem já usava mantendo acesso. | 4–6 semanas |
| **4** | **Link compartilhável para o médico.** Snapshot somente-leitura com validade. A taxa de uso decide se o painel B2B vale ser construído. | 1 semana |
| **5** | **Modo cuidador e IA.** As duas que sustentam o preço no longo prazo, na ordem que os dados indicarem. | 4–6 semanas |

---

## 9. Conformidade antes de cobrar o primeiro real

Dado de pressão arterial é dado pessoal **sensível** (LGPD art. 5º, II). O tratamento já é rigoroso —
o que muda ao monetizar é que finalidades novas exigem bases legais novas, cada uma com seu próprio
consentimento.

### Bloqueante — vale para qualquer estratégia

- [ ] **Política de privacidade real e publicada.** Hoje `settings.tsx` aponta para uma URL
      placeholder. Precisa listar cada finalidade, cada terceiro, prazo de retenção e como exercer
      direitos.
- [ ] **Encarregado de dados (DPO) identificado** (art. 41) — contato público, mesmo sendo você.
- [ ] **Data Safety da Play preenchido e coerente.** Divergência com o comportamento real é motivo
      de suspensão, e as declarações mudam com afiliados, anúncios ou IA.
- [ ] **App Check em enforce.** Os adapters já existem; sem isso um backend monetizado é uma API
      aberta.
- [ ] **Consentimento granular por finalidade** (art. 11): usar o app, receber recomendação
      comercial, enviar dados para IA e compartilhar com médico são quatro finalidades distintas.
- [ ] **Registro das operações de tratamento (ROPA)** (art. 37).
- [x] **Exclusão de conta e apagamento completo** — `useDeleteAccount` + `onUserDelete` limpando
      `readings`, `devices` e `schedules`. **Incluir `entitlements/{uid}` nessa limpeza no mesmo
      commit em que ele for criado.**
- [x] **Isolamento por usuário verificado nas rules** — já há testes com
      `@firebase/rules-unit-testing` e casos negativos. Cada coleção nova precisa dos seus.

### Por estratégia

| Estratégia | Requisitos |
|---|---|
| Afiliados | Rótulo "link patrocinado" visível (CDC art. 36); nenhum dado de saúde na URL; nenhuma requisição a terceiro sem toque do usuário; nenhuma afirmação de eficácia própria |
| Assinatura | Arrependimento 7 dias (CDC art. 49); renovação e cancelamento declarados antes da compra; CNPJ, nota fiscal, ISS |
| Doação | Só é doação se não devolver nada. Qualquer benefício obriga Play Billing |
| B2B | RIPD (art. 38); auditoria de acesso por clínico; consentimento revogável; avaliar CFM 2.314/2022, SBIS/CFM e Anvisa RDC 657/2022 conforme escopo |
| IA | Opt-in específico e reversível; base legal de transferência internacional (art. 33); contrato com retenção zero; só agregados; emenda ao `CLAUDE.md §4.4` |
| Anúncios | CMP (UMP); declaração de compartilhamento publicitário no Data Safety; nenhum dado de medição chegando ao SDK |

**Sobre HIPAA:** não se aplica a um app B2C brasileiro — quem regula é a LGPD, fiscalizada pela ANPD.
Só entra em cena vendendo para prestadores de saúde nos EUA, e aí exige BAA com o Google Cloud e
verificação serviço a serviço da cobertura do Firebase. Não gaste esforço antes de existir um cliente
americano concreto.

---

## 10. As três coisas que eu não faria

1. **Cobrar pelos lembretes.** São a razão de existir do produto e o mecanismo de aderência ao
   tratamento. Gatear isso é cobrar por saúde.
2. **Mover para o Pro o que já é grátis hoje.** Export CSV e tendência 7/30 já estão nas mãos dos
   usuários. Tirar algo entregue é a forma mais cara de ganhar pouco — cobre pelo próximo degrau.
3. **Anúncios.** Rendem centenas de reais por mês e custam o tom clínico, um diálogo de consentimento
   na frente do fluxo de 10 segundos e uma declaração de compartilhamento publicitário na ficha da
   Play. O afiliado rende mais e não custa nada disso.

---

> Faixas de receita são cenários com premissas explicitadas, não projeções. Comissões de afiliados,
> taxas de loja e políticas da Play e da App Store mudam — confirme os valores vigentes antes de
> decidir com base neles. Este documento trata de estratégia de produto e não substitui orientação
> jurídica ou contábil.
