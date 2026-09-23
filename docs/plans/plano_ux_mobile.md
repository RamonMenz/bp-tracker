# Plano de Ação — Auditoria UX Mobile

> Documento de diagnóstico. **Nenhuma correção foi aplicada ainda** — este arquivo lista o que foi
> encontrado, por que importa para quem usa no celular, e a solução de código proposta, para
> revisão antes da execução.
>
> Escopo: `app/`, `src/components/`, `src/screens/` (auditoria de usabilidade mobile — teclado,
> alvos de toque, quebra de layout, viewport). Data da análise: 2026-08-14.

---

## Resumo executivo

O app já nasceu com boa parte da disciplina mobile-first exigida pelo `CLAUDE.md` §4.7 aplicada de
forma consistente: `keyboardType="number-pad"` nos três campos numéricos, botões com
`min-h-[48px]`/`[56px]`, histórico renderizado como cards (não tabela) dentro de `FlashList`, e o
gráfico de tendência medindo a própria largura em vez de usar pixels fixos. Por isso este relatório
tem **menos itens do que uma varredura típica** — e documenta explicitamente o que foi checado e
está OK, para não parecer que passou batido.

Foram encontrados **3 problemas reais**, nenhum grave isoladamente, todos com solução pontual:

| # | Problema | Categoria | Severidade |
|---|---|---|---|
| P1 | `Screen` não tem `KeyboardAvoidingView` — teclado pode cobrir o botão "Salvar" | Teclado / layout | Média |
| P2 | `Switch` de Ajustes com alvo de toque nativo abaixo de 48×48dp | Alvo de toque | Baixa–Média |
| P3 | Botões empilhados do `ConfirmDialog` com `gap-2` (8px), abaixo do confortável para ações destrutivas | Alvo de toque | Baixa |

E uma sugestão opcional, não classificada como bug (P4, abaixo).

---

## 1. Teclados Nativos (Input Mode)

### ✅ Verificado — nenhum problema encontrado

Os três únicos campos numéricos do app (Sistólica, Diastólica, Pulso) passam por
`src/components/bp/BpNumberInput.tsx:62`, que já define:

```tsx
keyboardType="number-pad"
```

No nativo (Android/iOS) isso abre o teclado numérico diretamente — é o próprio `TextInput` do React
Native, sem tradução necessária.

Na web, conferi a implementação real do `react-native-web@0.21.1` instalado
(`node_modules/react-native-web/src/exports/TextInput/index.js:172-174`): o pacote traduz
`keyboardType="number-pad"` para `inputMode="numeric"` no `<input>` do DOM automaticamente —
exatamente o atributo que o enunciado da auditoria pedia para confirmar. Não há necessidade de
`type="number"` (que traria as setinhas de incremento, indesejadas aqui) nem de `pattern="[0-9]*"`
manual.

O campo de data/hora (`src/components/ui/DateTimeField.web.tsx:171`) usa `type="time"` /
`type="datetime-local"` nativos do navegador — também corretos, abrem o seletor nativo em vez de
teclado alfanumérico.

**Nenhuma ação necessária neste item.**

---

## 2. Alvos de Toque (Touch Targets)

### ⚠️ P1 — `Screen` sem `KeyboardAvoidingView`: teclado pode esconder o botão "Salvar"

**Local:** `src/components/ui/Screen.tsx:8-27` (usado por `app/(app)/index.tsx` — o formulário
principal — e por `app/(app)/settings.tsx`).

**Por que é ruim no celular:** o `Screen` envolve o conteúdo só em `SafeAreaView` + `ScrollView`,
sem `KeyboardAvoidingView`. No formulário de registro
(`app/(app)/index.tsx:82-157`), o fluxo é: Sistólica → avança sozinho para Diastólica → avança
sozinho para Pulso. Ao tocar manualmente no campo "Pulso (opcional)" (ele não tem
`onDigitsComplete`, então o foco fica ali até o usuário decidir o próximo passo), o teclado numérico
ocupa boa parte da tela e não há nenhuma lógica que role o conteúdo ou reserve espaço para o botão
"Salvar medição" logo abaixo. Dependendo do tamanho de tela e do idioma do teclado, o botão pode
ficar parcial ou totalmente coberto — o usuário precisa primeiro fechar o teclado (toque extra) para
alcançá-lo, o que vai contra a meta explícita do `CLAUDE.md` §1: registrar em **≤ 10s e 4 toques**.

**Solução proposta:**

```tsx
// src/components/ui/Screen.tsx
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/theme/tokens';

export type ScreenProps = ScrollViewProps;

export function Screen({ children, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-light-bg dark:bg-dark-bg">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // Android já resolve isso via windowSoftInputMode (padrão do Expo é "resize"); aplicar
        // "padding" também lá causaria dois ajustes de layout competindo. behavior=undefined faz o
        // KeyboardAvoidingView não fazer nada no Android, só no iOS, que é onde falta.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            { flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
            contentContainerStyle,
          ]}
          {...props}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

Recomendo validar manualmente num aparelho Android real (Dev Client) depois da mudança — o
comportamento de `windowSoftInputMode` varia por fabricante o suficiente para merecer um teste
visual rápido, não só a leitura do código.

---

### ⚠️ P2 — `Switch` de Ajustes abaixo do alvo mínimo de 48×48dp

**Local:** `app/(app)/settings.tsx:222-231` (switch de "Notificações") e
`app/(app)/settings.tsx:257-265` (switch de cada horário de lembrete).

**Por que é ruim no celular:** o componente `Switch` do React Native usa o controle nativo da
plataforma, que mede aproximadamente 51×31dp no iOS e 34×20dp no Android antes de qualquer escala —
abaixo do mínimo de 48×48dp que o próprio `CLAUDE.md` §4.7 define como critério de aceite (e que o
resto do app já respeita: `Button`, o botão de excluir de `ReadingRow`, as abas). Isso é
particularmente relevante aqui porque o público do app inclui pessoas idosas (mesmo §4.7), o grupo
mais afetado por alvos de toque pequenos.

**Solução proposta:** envolver o `Switch` num `Pressable` com área mínima de 48×48dp que replica o
toggle — o `Switch` some para o leitor de tela (`importantForAccessibility="no-hide-descendants"`)
e para o toque (`pointerEvents="none"`), porque quem passa a responder ao toque é o `Pressable` por
fora:

```tsx
// app/(app)/settings.tsx — trecho do switch de notificações
<Pressable
  accessibilityRole="switch"
  accessibilityLabel="Ativar notificações de lembrete"
  accessibilityState={{ disabled: isSaving, checked: settings?.notificationsEnabled ?? false }}
  disabled={isSaving}
  onPress={() => void toggleNotifications(!(settings?.notificationsEnabled ?? false))}
  className="h-12 w-12 items-center justify-center"
>
  <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
    <Switch
      value={settings?.notificationsEnabled ?? false}
      trackColor={switchTrackColor}
      thumbColor={switchThumbColor}
      ios_backgroundColor={palette.border}
      {...switchThumbProps}
    />
  </View>
</Pressable>
```

O mesmo padrão se aplica ao switch de cada horário (linha 257), trocando o rótulo para
`` `Ativar horário ${index + 1}` ``. Como o `Switch` deixa de receber `onValueChange` diretamente
(o `Pressable` é quem decide o novo valor), a prop pode ser removida dele nos dois casos.

---

### ⚠️ P3 — Gap apertado entre os botões do `ConfirmDialog`

**Local:** `src/components/ui/ConfirmDialog.tsx:75` (`className="mt-2 gap-2"`).

**Por que é ruim no celular:** este é o diálogo usado nos fluxos mais sensíveis do app — excluir
conta (dois passos, `app/(app)/settings.tsx:340-359`) e excluir medição
(`app/(app)/history.tsx:237-245`). Os botões já estão empilhados (não lado a lado, o que já evita o
pior caso), mas o espaçamento entre eles é de apenas 8px (`gap-2`) — abaixo do que o próprio
enunciado desta auditoria pede para ações destrutivas coladas. Num diálogo onde um dos dois botões
apaga dados de saúde permanentemente, vale uma margem de segurança maior que o padrão usado em UI
não-destrutiva.

**Solução proposta:**

```tsx
// src/components/ui/ConfirmDialog.tsx:75
<View className="mt-2 gap-3">
```

Troca de `gap-2` (8px) para `gap-3` (12px) — consistente com o espaçamento já usado em outros
agrupamentos do app (ex.: `app/(app)/index.tsx:81`, `:104`).

---

## 3. Quebra de Layout e Scroll Horizontal

### ✅ Verificado — nenhum problema encontrado

- Nenhuma largura fixa em pixels (`width: '600px'`, `w-[600px]` ou equivalente) foi encontrada em
  `src/` fora de `max-w-[420px]` no `ConfirmDialog` (um teto para telas grandes, com `w-full` como
  base — não força scroll, encolhe normalmente em tela estreita) e `min-w-[48px]` no `Button` (piso
  de alvo de toque, não larguras fixas de conteúdo).
- O histórico (`app/(app)/history.tsx:183-225`) **não usa `<table>`** — já é uma lista de cards
  (`ReadingRow`) agrupada por dia dentro de `FlashList`, com `keyExtractor` estável pelo id do
  documento (`history.tsx:187`), exatamente o padrão que o enunciado pede para adaptar de tabela
  para cards. Não há necessidade de `overflow-x-auto` porque não existe conteúdo tabular largo.
- O gráfico de tendência (`src/components/bp/TrendChart.tsx:127-136`) mede a própria largura via
  `onLayout` e recalcula o espaçamento dos pontos a partir dela (`TrendChart.tsx:76-79`), com
  `overflow: 'hidden'` como cinto de segurança — não há pixel fixo que vaze do card em telas
  estreitas.

**Nenhuma ação necessária neste item.**

---

## 4. Configurações de Viewport e Acessibilidade

### ✅ Verificado — nenhum problema encontrado

O projeto não tem `app/+html.tsx` (o arquivo que o Expo Router usa para customizar o HTML raiz da
build web) nem qualquer `index.html` próprio. Isso significa que a build web usa o template padrão
do Expo (`@expo/cli@57.0.14`, `static/template/index.html` e `static/template/+html.tsx`), que
declara:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
```

Ou seja: **não há `maximum-scale` nem `user-scalable=no`** — o app não bloqueia o pinch-to-zoom.
Isso é o comportamento correto: desabilitar zoom quebraria o critério WCAG 1.4.4 (Resize Text) e
prejudicaria justamente o público idoso que o `CLAUDE.md` §4.7 cita como motivo para nunca desligar
`allowFontScaling`. O jeito certo de evitar o zoom automático indesejado do Safari ao focar um campo
não é bloquear o zoom do usuário — é garantir que todo input tenha `font-size ≥ 16px`, e isso já
está feito:

- `BpNumberInput` (`src/components/bp/BpNumberInput.tsx:73`): `text-[44px]`.
- `Field` (`src/components/ui/Field.tsx:23`): `text-base` (16px).
- `DateTimeField` na web (`src/components/ui/DateTimeField.web.tsx:153`): `fontSize: 16`, com
  comentário explícito no código (linha 150-151) registrando que a escolha evita justamente esse
  auto-zoom.

**Nenhuma ação necessária neste item.**

### 💡 P4 — Sugestão opcional (não é bug): fixar o comportamento com `app/+html.tsx`

Como não existe um `app/+html.tsx` no projeto, o app depende do template padrão que vem embutido no
`@expo/cli` instalado. Isso funciona hoje, mas o template não é parte do código do repositório —
uma atualização futura do Expo poderia, em tese, mudar esse default sem que o time notasse. Se
quiser blindar essa decisão (viewport sem bloqueio de zoom + fontes ≥16px nos inputs) contra
mudanças de versão, dá para copiar o template padrão para `app/+html.tsx` e versioná-lo no repo,
comentando a decisão. Não é necessário agir agora — é só uma nota de resiliência para o roadmap.

---

## Priorização sugerida

1. **P1** (`Screen` sem `KeyboardAvoidingView`) — maior impacto real no fluxo de ≤10s/4 toques que é
   o objetivo central do app (`CLAUDE.md` §1).
2. **P2** (`Switch` abaixo de 48dp) — afeta diretamente o público idoso citado no `CLAUDE.md` §4.7.
3. **P3** (gap do `ConfirmDialog`) — ajuste pequeno, mas em telas de exclusão irreversível de dados
   de saúde.
4. **P4** — opcional, sem urgência.

Nenhuma alteração de código foi feita. Posso aplicar as correções de P1 a P3 agora — cada uma é uma
mudança cirúrgica em um arquivo só, testável isoladamente, e caberia em três commits semânticos
separados (`fix(ui): ...`) seguindo o `CLAUDE.md` §4.2. Autorizo a execução?
