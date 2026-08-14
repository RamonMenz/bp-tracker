# Prompts de Correção — Auditoria UX Mobile (BP Tracker)

> Um prompt autocontido por item do [`plano_ux_mobile.md`](./plano_ux_mobile.md), na mesma ordem de
> prioridade proposta lá (P1 → P4). Cada prompt pode ser colado direto numa sessão nova — não
> depende de memória de conversa anterior, só do estado do repositório nesta branch.
>
> Cada prompt indica um **modelo sugerido**, calibrado pela complexidade real da tarefa (não pelo
> tamanho do diff): mudança mecânica de uma linha pede menos raciocínio que uma troca de semântica
> de acessibilidade. Use como ponto de partida — qualquer modelo mais forte que o sugerido também
> resolve.
>
> Convenção comum a todos: seguir `CLAUDE.md` (TypeScript estrito, sem `any`, `@/` em vez de
> `../../../`, exports nomeados, mudanças cirúrgicas, um commit semântico por item, rodar
> `npm run lint && npm run typecheck && npm test` antes de cada commit).

---

## Prompt 1 — P1: `Screen` sem `KeyboardAvoidingView`

**Modelo sugerido:** Claude Sonnet 5. Mudança pequena em arquivo único, mas com uma decisão de
comportamento por plataforma (iOS vs. Android) que precisa de raciocínio correto sobre
`windowSoftInputMode`, não só edição mecânica — vale um modelo que justifique a escolha, não só
aplique o snippet.

```
Contexto: no BP Tracker (React Native/Expo), src/components/ui/Screen.tsx envolve o conteúdo de
toda tela em SafeAreaView + ScrollView, sem KeyboardAvoidingView. No formulário de registro
(app/(app)/index.tsx), o campo "Pulso (opcional)" (BpNumberInput, app/(app)/index.tsx:105-114)
não tem onDigitsComplete — ao ser tocado manualmente, o foco fica nele até o usuário decidir o
próximo passo, e o teclado numérico pode cobrir o botão "Salvar medição" logo abaixo
(app/(app)/index.tsx:150-157), sem nenhuma lógica de scroll ou de reserva de espaço. Isso obriga
um toque extra (fechar o teclado) para alcançar o botão, contra a meta de CLAUDE.md §1 de
registrar em ≤10s e 4 toques. app/(app)/settings.tsx usa o mesmo Screen e tem o mesmo risco ao
redor dos campos de horário de lembrete.

Tarefa:
1. Em src/components/ui/Screen.tsx, envolva o ScrollView existente num KeyboardAvoidingView:
   - style={{ flex: 1 }}
   - behavior={Platform.OS === 'ios' ? 'padding' : undefined} — no Android o ajuste já é feito
     pelo windowSoftInputMode padrão do Expo (resize); aplicar "padding" também lá causaria dois
     ajustes de layout competindo, então behavior fica undefined ali (o componente não faz nada
     no Android).
   - keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0} (ajuste esse valor se, ao testar,
     sobrar/faltar espaço — o objetivo é o botão de ação ficar visível acima do teclado sem um
     respiro exagerado).
2. Não altere a assinatura pública de ScreenProps nem o comportamento de contentContainerStyle,
   keyboardShouldPersistTaps ou keyboardDismissMode já configurados no ScrollView — só adicione a
   camada de KeyboardAvoidingView ao redor.
3. Rode npm run lint && npm run typecheck && npm test — nenhum teste deve quebrar (Screen não
   tem teste próprio hoje; se algum teste de tela que usa Screen quebrar por causa da nova árvore
   de componentes — ex.: um teste que faz getByType ou snapshot estrutural —, ajuste o teste para
   a nova estrutura, não reverta a mudança).
4. Deixe registrado no corpo do commit que a mudança precisa de validação manual num Android real
   (Dev Client) depois do merge, porque windowSoftInputMode varia o suficiente entre fabricantes
   para merecer conferência visual, não só leitura de código.

Commit:
fix(ui): evitar que o teclado cubra o botão de ação nas telas do app
```

---

## Prompt 2 — P2: `Switch` de Ajustes abaixo do alvo mínimo de 48×48dp

**Modelo sugerido:** Claude Sonnet 5. Não é troca de estilo — é reestruturar quem responde ao
toque e quem fica visível para leitor de tela (`Pressable` por fora, `Switch` decorativo por
dentro) em dois pontos do mesmo arquivo, preservando `disabled`/`accessibilityState`/teste. Erro
aqui tende a quebrar a acessibilidade em vez de só o visual, o que pede mais atenção do que uma
edição mecânica.

```
Contexto: no BP Tracker, app/(app)/settings.tsx usa dois Switch nativos do React Native — um
para "Notificações" (linhas 222-231) e um por horário de lembrete, dentro do .map de slots
(linhas 257-265). O controle nativo do Switch mede menos que 48×48dp em ambas as plataformas
(≈51×31dp no iOS, ≈34×20dp no Android), abaixo do mínimo que o próprio CLAUDE.md §4.7 define
como critério de aceite — relevante porque o público do app inclui pessoas idosas (mesmo §4.7).

Tarefa:
1. Em app/(app)/settings.tsx, envolva CADA Switch (o de notificações e o de cada slot) num
   Pressable de 48×48dp mínimo que:
   - Recebe accessibilityRole="switch", accessibilityLabel (reaproveite o texto já usado no
     accessibilityLabel atual do Switch) e accessibilityState={{ disabled, checked }} refletindo
     o valor atual.
   - No onPress, chama a MESMA lógica que hoje está em onValueChange (toggleNotifications(!valor
     atual) no primeiro caso, handleToggleSlot(index, !slot.enabled) no segundo) — o Pressable
     passa a ser quem decide a ação, não o Switch.
   - Usa className="h-12 w-12 items-center justify-center" (48dp) do design system do projeto.
2. Dentro do Pressable, o Switch continua desenhando o estado visual, mas some da árvore de
   toque e de acessibilidade: envolva-o (ou passe direto) com pointerEvents="none" e
   importantForAccessibility="no-hide-descendants" — quem responde ao toque e é anunciado pelo
   leitor de tela é só o Pressable por fora, para não duplicar o controle (dois "switch" com o
   mesmo rótulo no rotor do TalkBack/VoiceOver).
3. Remova onValueChange e accessibilityLabel do Switch em si (migraram para o Pressable); mantenha
   trackColor, thumbColor, ios_backgroundColor e o spread de switchThumbProps como estão hoje.
4. Não altere o comportamento funcional — disabled={isSaving} no switch de notificações continua
   valendo (propague para o Pressable também, via disabled + accessibilityState.disabled).
5. Rode npm run lint && npm run typecheck && npm test.
6. Adicione (ou estenda, se já existir) um teste de app/(app)/settings.tsx com
   @testing-library/react-native que localize o controle pelo accessibilityLabel/role "switch" e
   confirme que um fireEvent.press nele chama a função de toggle esperada (toggleNotifications ou
   o equivalente de slot) — cobre exatamente a mudança de "quem responde ao toque".

Commit:
fix(a11y): ampliar alvo de toque dos switches de Ajustes para 48dp
```

---

## Prompt 3 — P3: gap apertado entre os botões do `ConfirmDialog`

**Modelo sugerido:** Claude Haiku 4.5. Mudança de uma linha, um valor de espaçamento dentro da
escala de tokens já existente (`gap-2` → `gap-3`), sem decisão de arquitetura nem risco de
acessibilidade — não precisa de um modelo mais caro que isso.

```
Contexto: no BP Tracker, src/components/ui/ConfirmDialog.tsx:75 usa className="mt-2 gap-2" para
espaçar os botões empilhados de Cancelar/Confirmar. Esse diálogo é usado nos fluxos mais
sensíveis do app — excluir conta (app/(app)/settings.tsx:340-359, dois passos em sequência) e
excluir medição (app/(app)/history.tsx:237-245) — e 8px de espaçamento (gap-2) é apertado para
um diálogo onde um dos dois botões apaga dado de saúde permanentemente.

Tarefa:
1. Em src/components/ui/ConfirmDialog.tsx:75, troque className="mt-2 gap-2" por
   className="mt-2 gap-3" (8px → 12px), consistente com o espaçamento já usado em outros
   agrupamentos do app (ex.: app/(app)/index.tsx:81, :104).
2. Não altere mais nada no arquivo — é uma troca de token só.
3. Rode npm run lint && npm run typecheck && npm test.

Commit:
fix(ui): aumentar espaçamento entre os botões do diálogo de confirmação
```

---

## Prompt 4 — P4 (opcional): fixar o viewport padrão do Expo em `app/+html.tsx`

**Modelo sugerido:** Claude Haiku 4.5. É copiar o template padrão do `@expo/cli` para dentro do
repositório e comentar a decisão — não há lógica nova, só versionar um arquivo de configuração
existente. Só vale a pena rodar se P1–P3 já estiverem feitos; não é bug, é blindagem contra
mudança de default numa atualização futura do Expo.

```
Contexto: no BP Tracker, não existe app/+html.tsx — a build web usa o template HTML padrão
embutido no @expo/cli instalado (static/template/+html.tsx do pacote), que declara
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />. Esse
comportamento está correto (não bloqueia pinch-to-zoom, o que preservaria WCAG 1.4.4 e o público
idoso citado em CLAUDE.md §4.7), mas hoje depende de um default que não está versionado no
repositório — uma atualização futura do Expo poderia mudá-lo sem que ninguém notasse.

Tarefa:
1. Crie app/+html.tsx copiando o template padrão do @expo/cli para customização do HTML raiz do
   Expo Router (use a API pública documentada em
   https://docs.expo.dev/router/reference/static-rendering/#root-html como referência de forma,
   não copie comentários do pacote): import ScrollViewStyleReset e useServerDocumentContext de
   'expo-router/html', componente Root({ children }) que renderiza <html>/<head>/<body> com pelo
   menos:
   - <meta charSet="utf-8" />
   - <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
   - <ScrollViewStyleReset />
2. Adicione um comentário no arquivo registrando POR QUE o viewport não tem maximum-scale nem
   user-scalable=no: desabilitar zoom quebraria WCAG 1.4.4 e prejudicaria o público idoso do app
   (CLAUDE.md §4.7); o motivo do auto-zoom do Safari em campo focado já é resolvido por outro
   caminho — fonte ≥16px em todo input (ver src/components/bp/BpNumberInput.tsx,
   src/components/ui/Field.tsx, src/components/ui/DateTimeField.web.tsx).
3. Rode npx expo export -p web (ou npx expo start --web, se preferir smoke test manual) para
   confirmar que o app ainda builda/abre normalmente com o +html.tsx no lugar do default
   implícito.
4. Rode npm run lint && npm run typecheck && npm test.

Commit:
chore(web): versionar o HTML raiz para fixar o viewport contra mudança de default
```

---

## Como usar

- P1, P2 e P3 são independentes entre si (arquivos diferentes: `Screen.tsx`, `settings.tsx`,
  `ConfirmDialog.tsx`) — podem rodar em paralelo, em sessões/agentes separados, sem conflito.
- P4 é opcional e não depende dos outros três, mas faz mais sentido rodar por último, depois que a
  branch já estiver estável.
- Cada prompt termina em UM commit. Depois do último, revise o diff acumulado e faça `git push`
  para `claude/bp-tracker-mobile-audit-55xuvl` (ou peça para eu fazer).
