# Prompts de Desenvolvimento — Onboarding

> Prompts autocontidos para o item "Onboarding de como medir corretamente" de
> [`roadmap_futuro.md`](./roadmap_futuro.md) (Sugestão de Produto #7). Cada prompt pode ser colado
> direto numa sessão nova do Claude Code — não depende de memória de conversa anterior, só do
> estado do repositório nesta branch. Mesma convenção de
> [`prompts_de_funcionalidades.md`](./prompts_de_funcionalidades.md): seguir `CLAUDE.md`
> (TypeScript estrito, sem `any`, `@/` em vez de `../../../`, exports nomeados, componente burro/
> hook esperto, mudanças cirúrgicas, um commit semântico por prompt, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit).
>
> **Escopo do produto, decidido aqui para não ficar em aberto em cada prompt:**
> - **Zero dependência nova.** Nada de biblioteca de carrossel/pager — o app já não tem nenhuma
>   (`react-native-reanimated`/`react-native-pager-view` não estão no `package.json`), e um passo a
>   passo por estado (`Próximo`/`Voltar` + indicador de pontos) é mais simples, mais acessível a
>   leitor de tela do que gesto de swipe, e funciona identicamente em Android e Web — CLAUDE.md §4.1
>   pede justificar peso de bundle antes de somar dependência, e aqui não há justificativa.
> - **Rota de tela cheia, não modal.** `presentation: 'modal'` do Expo Router tem paridade fraca no
>   react-native-web (o projeto já documentou mais de um caso desses em `plano_de_correcoes.md`) —
>   uma rota comum, com a mesma armação visual das outras telas (`Screen`), evita esse risco e
>   mantém uma cara só de app nas duas plataformas.
> - **3 passos, não mais.** Boas-vindas + funcionalidades → categorias de pressão → pronto para
>   começar. É o mínimo que cobre os dois pedidos do produto (mostrar as funcionalidades, explicar
>   as categorias) sem virar um tutorial longo que ninguém termina de ler.
> - **Nunca bloqueia o caminho de registrar.** Mesmo espírito do aviso de `index.tsx`
>   (`DISCLAIMER_DISMISSED_KEY`): se a leitura do AsyncStorage falhar, o app abre normalmente sem
>   onboarding — pior caso é ele reaparecer, nunca travar a home.
>
> | Modelo | Quando usar aqui |
> |---|---|
> | **Claude Sonnet 5** | Segue um padrão já existente no código (armazenamento local por
> aparelho, hook de gate de navegação) sem decisão de UX nova. |
> | **Claude Opus 5** | Desenho da tela em si — não há nenhuma tela de múltiplos passos precedente
> no app para copiar, então o layout/conteúdo exige julgamento de produto, não só de código. |

---

## Prompt 1 — Preferência local "onboarding visto" + hook de gate

```
Contexto: no BP Tracker (React Native/Expo, ver CLAUDE.md), vamos introduzir uma tela de
onboarding que precisa aparecer automaticamente na primeira vez que o usuário entra no app depois
de logar, e nunca mais sozinha depois disso (mas continuar acessível a qualquer momento por um
botão em Ajustes — isso é o Prompt 3). Este prompt cobre só a camada de armazenamento e o hook de
decisão "devo mostrar agora?" — nenhuma UI ainda.

Siga EXATAMENTE o padrão já usado em src/features/theme/theme-preference.storage.ts para
preferência local por aparelho via AsyncStorage: nunca rejeita (falha de leitura/escrita vira
logError + fallback silencioso), narrowing de unknown→tipo próprio, chave prefixada
"bp-tracker:".

Tarefa:
1. Crie src/features/onboarding/onboarding-seen.storage.ts:
   - export const ONBOARDING_SEEN_KEY = 'bp-tracker:onboarding-seen';
   - export async function hasSeenOnboarding(): Promise<boolean> — lê o AsyncStorage, devolve
     true se o valor for exatamente 'true', false em QUALQUER outro caso (incluindo null e erro de
     leitura — logError('onboarding.read', error) no catch, devolve false, nunca propaga).
   - export async function markOnboardingSeen(): Promise<void> — grava 'true'; falha de escrita
     também nunca propaga (logError('onboarding.write', error) no catch) — na pior das hipóteses o
     onboarding reaparece na próxima abertura, o que é aceitável e não deve virar erro visível.
2. Crie src/features/onboarding/useOnboardingGate.ts:
   - Hook que recebe (user: User | null, isLoading: boolean) — mesma assinatura de
     useAuthRedirect (src/features/auth/useAuthRedirect.ts), para o Prompt 3 poder chamá-lo lado a
     lado dele.
   - Ao ficar com um usuário autenticado (user !== null, isLoading === false) PELA PRIMEIRA VEZ
     desde que o hook montou, chama hasSeenOnboarding(); se devolver false, navega para a rota de
     onboarding (a rota ainda não existe — deixe router.push('/onboarding') já escrito, o Prompt 2
     cria o arquivo da rota) e marca visto com markOnboardingSeen() imediatamente antes de navegar
     (não depois de o usuário terminar os 3 passos — se ele sair no meio, não deve ser
     interrompido de novo no próximo login; reabrir fica a cargo do atalho manual do Prompt 3).
   - Use um useRef (não useState) para a guarda de "já decidiu nesta sessão do app" — o mesmo
     motivo do padrão de useNotificationRedirect.native.ts/useAuthRedirect.ts: não pode disparar de
     novo a cada re-render depois que já navegou uma vez.
   - Não decida nada enquanto isLoading for true (mesma regra de useAuthRedirect).
3. NÃO edite app/_layout.tsx nem crie a rota /onboarding neste prompt — isso é o Prompt 3, depois
   que a tela existir (Prompt 2). O hook pode ficar sem uso (chamado por nenhum componente ainda);
   confirme só que compila e que o teste abaixo cobre o comportamento isolado.
4. Teste useOnboardingGate.test.ts (mock de expo-router useRouter, mock de
   onboarding-seen.storage): cobre (a) usuário autenticado + hasSeenOnboarding=false → navega uma
   vez só mesmo com re-renders subsequentes; (b) hasSeenOnboarding=true → nunca navega;
   (c) isLoading=true → nunca navega, mesmo com user preenchido; (d) hasSeenOnboarding rejeitando
   (simulando falha) → não deve navegar sem tratamento (a própria função já nunca rejeita pelo
   Prompt 1, mas teste o hook assumindo o contrato dela, não reimplemente a defesa duas vezes).
5. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(onboarding): preferência local de onboarding visto e hook de gate
```

**Modelo recomendado:** Claude Sonnet 5 — replica com fidelidade um padrão de storage e de hook de
navegação já existentes duas vezes no código (`theme-preference.storage.ts`,
`useAuthRedirect.ts`/`useNotificationRedirect`), sem decisão de projeto nova.

---

## Prompt 2 — Tela de onboarding (3 passos: funcionalidades → categorias → pronto para começar)

```
Contexto: no BP Tracker, vamos criar a tela de onboarding em si. Ainda não existe nenhuma tela de
múltiplos passos no app — esta é a primeira, então siga a identidade visual "Medical Clean" já
estabelecida (CLAUDE.md §1: fundo slate-50/superfície branca, azul blue-600 como primária, nunca
vermelho fora de alarme/ação destrutiva) e reaproveite os primitivos que já existem em
components/ui/ em vez de estilizar do zero. NÃO adicione nenhuma dependência nova (sem carrossel/
pager) — o avanço entre passos é por estado (useState<number>) e botões Próximo/Voltar, igual a
qualquer outra tela do app.

Tarefa:
1. Crie src/screens/OnboardingScreen.tsx (CLAUDE.md §3.2: "screens/" é para composições de tela
   pesadas importadas pela rota — a rota em si, no Prompt 3, só importa e renderiza este
   componente). Estrutura: 3 passos fixos, indicador de progresso (3 pontos, o atual preenchido
   com palette.primary, os outros com palette.border — mesma lógica de estado marcado por FORMA
   além de cor que BpCategoryBadge já usa, CLAUDE.md §4.7: o ponto ativo também é maior, não só de
   cor diferente).
   - Um botão "Pular" (variant="ghost", tamanho pequeno) sempre visível no canto superior direito
     dos 3 passos — accessibilityRole="button", accessibilityLabel="Pular apresentação". Chama a
     mesma função de fechar do botão final do passo 3 (onFinish, recebida por prop — ver item 3).
   - Passo 1 — "Bem-vindo(a)": título (variant="title") "Bem-vindo(a) ao BP Tracker", subtítulo
     curto reforçando o objetivo central do produto ("Registre sua pressão em poucos segundos,
     sem esquecer — 3 vezes ao dia"), e uma lista de 4 funcionalidades principais, cada uma com
     ícone (reaproveite de components/ui/icons.ts: HeartPulseIcon para "Registrar em segundos",
     TrendingUpIcon para "Acompanhe sua tendência" com texto mencionando o gráfico de 7/30 dias do
     Histórico, BellIcon para "Lembretes 3x ao dia" mencionando os horários configuráveis em
     Ajustes, DownloadIcon para "Exporte para o médico" mencionando o CSV) + título curto + uma
     linha de descrição cada, dentro de um Card (components/ui/Card.tsx) por item ou uma lista
     dentro de um único Card — decida pelo que ficar mais limpo visualmente, mas mantenha
     consistência com o espaçamento (tokens.spacing) já usado em outras telas.
   - Passo 2 — "Entenda as categorias": título "O que significa cada categoria", subtítulo curto
     avisando que a classificação é referência, não diagnóstico (mesmo espírito do texto de
     components/ui/Disclaimer.tsx — reaproveite o MESMO texto se fizer sentido, para não ter duas
     redações diferentes da mesma ideia no app; se precisar adaptar o tom para esta tela, mantenha
     o conteúdo factual idêntico). Liste as 5 categorias de domain/bp-classification.ts
     (BpCategory: normal/elevated/stage1/stage2/crisis) usando o componente REAL
     components/bp/BpCategoryBadge.tsx (não recrie o badge do zero — é exatamente o componente que
     aparece no app depois de cada medição, reconhecer o mesmo visual aqui é o ponto) + ao lado de
     cada badge, a faixa de valores em texto (ex.: "Normal — sistólica abaixo de 120 e diastólica
     abaixo de 80"; confira as faixas exatas em bp-classification.ts, incluindo a regra de
     sobreposição ali documentada — não invente valores). Renderize a lista pela CONSTANTE
     CATEGORY_LABEL exportada de BpCategoryBadge.tsx na mesma ordem normal→crisis, para nunca
     divergir do rótulo que já aparece no resto do app.
   - Passo 3 — "Pronto para começar": título curto de fechamento, dois botões: "Configurar
     lembretes" (variant="secondary", navega para /(app)/settings E chama onFinish) e "Começar a
     registrar" (variant="primary", size="lg", chama onFinish) — onFinish é quem efetivamente sai
     da tela (ver item 3). Não exporte um terceiro caminho de saída além de Pular/Concluir/
     Configurar lembretes.
   - Navegação entre passos: "Voltar" (variant="ghost", oculto no passo 1) e "Próximo"
     (variant="primary") nos passos 1 e 2; troca por "Configurar lembretes"/"Começar a registrar"
     só no passo 3 (não mostre "Próximo" e os dois botões finais ao mesmo tempo).
   - Todo o conteúdo dentro de Screen (components/ui/Screen.tsx) para herdar o scroll/safe-area/
     padding padrão do app. accessibilityRole e accessibilityLabel em cada botão e indicador de
     passo (ex.: "Passo 2 de 3"), alvo de toque ≥48dp em todo elemento interativo (CLAUDE.md §4.7)
     — os botões já existentes (Button.tsx) cobrem isso; não crie Pressable cru sem essa garantia.
2. Props do componente:
   export interface OnboardingScreenProps { onFinish: () => void }
   O componente é "burro" (CLAUDE.md §3.4): só recebe onFinish e decide sozinho o passo atual via
   useState interno — nenhuma lógica de navegação de rota, AsyncStorage ou sessão entra aqui
   (isso já foi resolvido no Prompt 1 e é encapsulado pela rota no Prompt 3).
3. Não crie a rota app/onboarding.tsx neste prompt (é o Prompt 3) — em vez disso, escreva um teste
   de componente OnboardingScreen.test.tsx isolado (@testing-library/react-native, seguindo o
   padrão de teste comportamental do CLAUDE.md §4.6 — não testar implementação de UI) cobrindo:
   avançar do passo 1 ao 3 tocando "Próximo" duas vezes, "Voltar" retorna ao passo anterior,
   "Pular" no passo 1 chama onFinish, "Começar a registrar" no passo 3 chama onFinish, as 5
   categorias aparecem no passo 2 com os rótulos de CATEGORY_LABEL.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(onboarding): criar tela de onboarding com funcionalidades e categorias
```

**Modelo recomendado:** Claude Opus 5 — não existe nenhuma tela de múltiplos passos precedente no
app para espelhar; layout, hierarquia de conteúdo e o que entra em cada um dos 3 passos exigem
julgamento de produto/UX, não só reaproveitar um padrão de código já pronto.

---

## Prompt 3 — Disparo automático no primeiro acesso + atalho manual em Ajustes

```
Contexto: no BP Tracker, o Prompt 1 já criou o hook useOnboardingGate (que decide QUANDO mostrar o
onboarding automaticamente, mas ainda não navega para nenhum lugar real) e o Prompt 2 já criou
OnboardingScreen (o componente de tela, ainda sem rota nem ponto de entrada manual). Este prompt
liga as três pontas: cria a rota, conecta o gate automático em app/_layout.tsx (mesmo lugar de
useAuthRedirect/useNotificationRedirect), e adiciona um atalho em Ajustes para reabrir o
onboarding a qualquer momento.

Tarefa:
1. Crie app/onboarding.tsx: rota de composição pura (CLAUDE.md §3.2 — "app/ nunca importa
   firebase/* diretamente" e só compõe; aqui a regra equivalente é "só compõe OnboardingScreen").
   export default function OnboardingRoute() {
     const router = useRouter();
     return <OnboardingScreen onFinish={() => router.replace('/(app)')} />;
   }
   Use router.replace, não router.push, ao sair — o onboarding não deve entrar na pilha de volta
   (apertar "voltar" depois de concluído não pode reabrir o onboarding). No caminho "Configurar
   lembretes" do passo 3 (Prompt 2), se OnboardingScreen precisar de navegação PARA settings além
   de onFinish, ajuste a prop para cobrir os dois destinos sem duplicar lógica de rota dentro do
   componente "burro" — decida a forma mais simples (ex.: onFinish(destination?: 'settings') e a
   rota decide para onde ir) sem reabrir o Prompt 2 além do necessário.
2. Em app/_layout.tsx, dentro de RootNavigator, chame useOnboardingGate(user, isLoading) ao lado
   de useAuthRedirect/useNotificationRedirect/useForegroundPush já existentes ali — mesma posição,
   mesmo estilo dos outros hooks de efeito colateral de navegação.
3. Em app/(app)/settings.tsx, adicione um atalho para reabrir o onboarding manualmente. Não crie
   um Card novo sozinho para isso — o pedido do produto é "acessível a qualquer momento", não uma
   seção de destaque; encaixe como uma linha dentro do Card "Conta" já existente (mesmo padrão
   visual da linha "Política de privacidade" dentro do Card "Privacidade": Pressable com
   accessibilityRole="button", ChevronRightIcon à direita, min-h-[48px]), com o texto "Como usar o
   app" (ou "Ver apresentação novamente" — escolha o que ficar mais natural ao lado dos outros
   rótulos da tela) chamando router.push('/onboarding') — aqui SIM é push, não replace: veio de
   dentro do app por escolha do usuário, "Voltar" deve devolver para Ajustes normalmente. Esse
   atalho NÃO chama markOnboardingSeen (já está marcado) nem passa por useOnboardingGate — é
   navegação direta.
4. Confirme que o hook automático (item 2) não dispara quando a navegação para /onboarding já
   partiu do atalho manual (item 3) — pelo desenho do Prompt 1 (useRef "já decidiu nesta sessão"),
   isso já deveria estar coberto, mas valide explicitamente com um teste de integração leve ou,
   no mínimo, revisão manual do fluxo: login pela primeira vez → onboarding automático → concluir
   → ir em Ajustes → tocar "Como usar o app" → onboarding reabre → voltar → não reabre sozinho de
   novo.
5. Ajuste/adicione testes: __tests__/app/(app)/settings.test.tsx (ou onde os testes de Ajustes já
   vivem) cobrindo que o novo atalho navega para /onboarding; se app/_layout.tsx já tiver teste
   próprio, cubra ali que useOnboardingGate é chamado — senão, um teste de integração mínimo
   basta, não crie suíte nova só para isso.
6. Rode npm run lint && npm run typecheck && npm test.

Commit:
feat(onboarding): mostrar onboarding no primeiro acesso e no atalho de ajustes
```

**Modelo recomendado:** Claude Sonnet 5 — é fiação de peças já prontas (rota, hook, tela) seguindo
o padrão de posicionamento dos outros hooks de navegação em `app/_layout.tsx` e da linha de atalho
já existente em Ajustes; a única decisão nova e pequena é a forma da prop de destino do passo 3.

---

## Como usar

- O Prompt 3 depende dos outros dois: importa o hook `useOnboardingGate` do Prompt 1 e o
  componente `OnboardingScreen` do Prompt 2 para fiar a rota e os pontos de entrada.
- Os Prompts 1 e 2 **podem rodar em paralelo** em sessões/agentes separados — não tocam nos mesmos
  arquivos, e nenhum dos dois importa código do outro (o hook do Prompt 1 só decide QUANDO
  navegar, sem saber para qual componente; a tela do Prompt 2 só recebe `onFinish` por prop, sem
  saber quem a chama). Só o Prompt 3 precisa esperar os dois terminarem.
- Nenhuma mudança em `firestore.rules`, schema Zod ou modelo de dados do Firestore é necessária —
  o estado "onboarding visto" é 100% local (AsyncStorage por aparelho), o mesmo padrão já usado
  para tema e para o aviso dispensável de `index.tsx`. Não há CLAUDE.md §4.4 (revisão de rules) a
  fazer aqui.
- Cada prompt termina em UM commit. Depois de rodar os que quiser, revise o diff acumulado e faça
  `git push` (ou peça para eu fazer) — não faço push automático de nenhum destes sem você pedir.
