import { useState } from 'react';
import { View } from 'react-native';

import { BpCategoryBadge, CATEGORY_LABEL } from '@/components/bp/BpCategoryBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  ActivityIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  HeartPulseIcon,
  TrendingUpIcon,
  type LucideIcon,
} from '@/components/ui/icons';
import type { BpCategory } from '@/domain/bp-classification';
import { colors } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { useColorScheme } from '@/theme/useColorScheme';

export interface OnboardingScreenProps {
  /**
   * Sai da apresentação. Quem navega é a ROTA, não esta tela: o argumento só diz para ONDE o
   * usuário pediu para ir — `'settings'` quando ele escolheu configurar lembretes, ausente quando
   * ele apenas concluiu ou pulou. Traduzir isso em `router.replace`/`router.push` é trabalho de
   * `app/onboarding`, que é o único lugar com contexto para decidir a pilha de navegação.
   */
  onFinish: (destination?: 'settings') => void;
}

const TOTAL_STEPS = 4;
const STEP_NUMBERS = [1, 2, 3, 4];

/** Item das listas com ícone dos passos 1 e 2 — a estrutura é a mesma, só o conteúdo muda. */
interface OnboardingListEntry {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * As quatro funcionalidades na ordem do fluxo real de uso: registrar → acompanhar → ser lembrado →
 * levar ao médico. A primeira é a que o CLAUDE.md §1 põe como objetivo central do produto, então é
 * a primeira que o usuário lê.
 */
const FEATURES: OnboardingListEntry[] = [
  {
    id: 'record',
    icon: HeartPulseIcon,
    title: 'Registre em segundos',
    description: 'A tela inicial já é o formulário: digite os valores e salve, sem passos extras.',
  },
  {
    id: 'trend',
    icon: TrendingUpIcon,
    title: 'Acompanhe sua tendência',
    description: 'No Histórico, o gráfico mostra suas médias dos últimos 7 ou 30 dias.',
  },
  {
    id: 'reminders',
    icon: BellIcon,
    title: 'Receba lembretes 3x ao dia',
    description: 'Avisos nos horários que você escolhe em Ajustes, para não esquecer de medir.',
  },
  {
    id: 'export',
    icon: DownloadIcon,
    title: 'Exporte para o médico',
    description: 'Baixe suas medições em CSV pelo Histórico e leve na próxima consulta.',
  },
];

/**
 * Orientações práticas de uso do aparelho, na ordem em que acontecem: preparar → posicionar o
 * braço → ajeitar a postura → repetir. São instruções de MANUSEIO, não indicação clínica — o app
 * registra, não diagnostica (CLAUDE.md §1), então nada aqui interpreta valor nem recomenda conduta.
 *
 * A última fala da sugestão de segunda medição porque ela existe de verdade na tela de registro
 * (`useSecondMeasurementFlow`); se aquele fluxo sair do app, este texto sai junto.
 */
const MEASUREMENT_TECHNIQUE: OnboardingListEntry[] = [
  {
    id: 'rest',
    icon: ClockIcon,
    title: 'Repouso',
    description: 'Descanse 5 minutos sentado(a) e em silêncio antes de medir.',
  },
  {
    id: 'arm',
    icon: HeartPulseIcon,
    title: 'Braço',
    description: 'Apoie o braço na altura do coração, com a palma da mão para cima.',
  },
  {
    id: 'posture',
    icon: ActivityIcon,
    title: 'Postura',
    description: 'Mantenha os pés apoiados no chão, sem cruzar as pernas.',
  },
  {
    id: 'second-measurement',
    icon: CheckIcon,
    title: 'Segunda medição',
    description:
      'Se for medir de novo, espere cerca de 1 minuto — o app sugere isso automaticamente depois da primeira medição.',
  },
];

/**
 * Faixas de `src/domain/bp-classification.ts`, transcritas na mesma ordem em que a função testa —
 * cada limite superior aqui é o piso da categoria seguinte, por isso "de 140 a 180" e não
 * "acima de 140". Ao mexer na tabela de referência do domínio, mexa também aqui: o `Record` sobre
 * `BpCategory` garante que uma categoria NOVA quebre a compilação, mas não que um limite alterado
 * seja percebido.
 */
const CATEGORY_RANGE: Record<BpCategory, string> = {
  normal: 'Sistólica abaixo de 120 e diastólica abaixo de 80.',
  elevated: 'Sistólica de 120 a 129, com diastólica abaixo de 80.',
  stage1: 'Sistólica de 130 a 139 ou diastólica de 80 a 89.',
  stage2: 'Sistólica de 140 a 180 ou diastólica de 90 a 120.',
  crisis: 'Sistólica acima de 180 ou diastólica acima de 120.',
};

/**
 * A ordem sai da própria declaração de `CATEGORY_LABEL` (normal→crisis, gravidade crescente):
 * `Object.keys` preserva a ordem de inserção de chaves string, então a lista desta tela não tem
 * como divergir da ordem nem dos rótulos usados no resto do app. A asserção é o estreitamento que
 * o `Object.keys` não faz sozinho — ele devolve `string[]` mesmo sobre um `Record<BpCategory, …>`.
 */
const ORDERED_CATEGORIES = Object.keys(CATEGORY_LABEL) as BpCategory[];

/** Regra de desempate documentada em `classifyBloodPressure` — o exemplo é o mesmo de lá. */
const OVERLAP_NOTE =
  'Quando os dois valores caem em faixas diferentes, vale sempre a mais alta: 120/80 é Estágio 1 ' +
  'pela diastólica, não Elevada pela sistólica.';

const ACTIVE_DOT_HEIGHT = 10;
const INACTIVE_DOT_SIZE = 7;
/** O ponto ativo vira cápsula: além de maior, muda de FORMA — cor sozinha não marca estado (§4.7). */
const ACTIVE_DOT_WIDTH = 24;

interface OnboardingListRowProps {
  entry: OnboardingListEntry;
  iconColor: string;
}

/**
 * Linha de lista com ícone em pastilha + título + descrição, compartilhada pelos passos 1 e 2 —
 * eram duas listas com o mesmo desenho, e duplicar o JSX faria as duas divergirem no primeiro
 * ajuste de espaçamento.
 *
 * O ícone é decorativo: o título ao lado já nomeia o item, e o leitor de tela anunciando "ícone de
 * sino, Receba lembretes" seria ruído. Mesma pastilha do SectionHeader, para a tela não inventar um
 * segundo jeito de desenhar ícone.
 */
function OnboardingListRow({ entry, iconColor }: OnboardingListRowProps) {
  const EntryIcon = entry.icon;

  return (
    <View className="flex-row items-start" style={{ gap: tokens.spacing.md }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-9 w-9 items-center justify-center rounded-xl bg-light-primaryTint dark:bg-dark-primaryTint"
      >
        <EntryIcon size={18} color={iconColor} strokeWidth={2.25} />
      </View>

      <View className="flex-1" style={{ gap: tokens.spacing.xs }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {entry.title}
        </Text>
        <Text variant="caption">{entry.description}</Text>
      </View>
    </View>
  );
}

/**
 * Apresentação de 4 passos mostrada no primeiro acesso depois do login.
 *
 * Componente burro (CLAUDE.md §3.4): o passo atual é estado local e a saída é sempre `onFinish` —
 * nada de AsyncStorage, sessão, roteador ou decisão de "já viu isto antes" mora aqui. Essa parte é
 * do `useOnboardingGate`, e é a rota que amarra as duas.
 */
export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const [step, setStep] = useState<number>(1);

  function handleNext(): void {
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  function handleBack(): void {
    setStep((current) => Math.max(current - 1, 1));
  }

  function handleConfigureReminders(): void {
    onFinish('settings');
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between gap-3">
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Passo ${step} de ${TOTAL_STEPS}`}
          className="flex-row items-center"
          style={{ gap: tokens.spacing.sm }}
        >
          {STEP_NUMBERS.map((stepNumber) => {
            const isActive = stepNumber === step;

            return (
              <View
                key={stepNumber}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  width: isActive ? ACTIVE_DOT_WIDTH : INACTIVE_DOT_SIZE,
                  height: isActive ? ACTIVE_DOT_HEIGHT : INACTIVE_DOT_SIZE,
                  borderRadius: tokens.radius.full,
                  backgroundColor: isActive ? palette.primary : palette.border,
                }}
              />
            );
          })}
        </View>

        {/* Arrow em vez de `onPress={onFinish}`: passado cru, o Pressable entregaria o evento de
            toque como primeiro argumento, e `onFinish` espera `'settings' | undefined`. */}
        <Button
          label="Pular"
          variant="ghost"
          accessibilityLabel="Pular apresentação"
          onPress={() => onFinish()}
        />
      </View>

      {step === 1 ? (
        <View style={{ gap: tokens.spacing.lg }}>
          <View style={{ gap: tokens.spacing.sm }}>
            <Text variant="title">Bem-vindo(a) ao BP Tracker</Text>
            <Text variant="body" color={palette.muted}>
              Registre sua pressão em poucos segundos, sem esquecer — 3 vezes ao dia.
            </Text>
          </View>

          <Card style={{ gap: tokens.spacing.lg }}>
            {FEATURES.map((feature) => (
              <OnboardingListRow key={feature.id} entry={feature} iconColor={palette.primary} />
            ))}
          </Card>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: tokens.spacing.lg }}>
          <View style={{ gap: tokens.spacing.sm }}>
            <Text variant="title">Como medir corretamente</Text>
            <Text variant="body" color={palette.muted}>
              Medir sempre do mesmo jeito deixa seus registros comparáveis entre si.
            </Text>
          </View>

          <Card style={{ gap: tokens.spacing.lg }}>
            {MEASUREMENT_TECHNIQUE.map((entry) => (
              <OnboardingListRow key={entry.id} entry={entry} iconColor={palette.primary} />
            ))}
          </Card>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: tokens.spacing.lg }}>
          <View style={{ gap: tokens.spacing.sm }}>
            <Text variant="title">O que significa cada categoria</Text>
            {/* O MESMO componente (e portanto o mesmo texto) que a Home e Ajustes já mostram — o
                app não pode ter duas redações diferentes de "registra, não diagnostica". */}
            <Disclaimer />
          </View>

          <Card style={{ gap: tokens.spacing.lg }}>
            {ORDERED_CATEGORIES.map((category) => (
              <View key={category} style={{ gap: tokens.spacing.xs }}>
                <BpCategoryBadge category={category} />
                <Text variant="caption">{CATEGORY_RANGE[category]}</Text>
              </View>
            ))}
          </Card>

          <Text variant="caption">{OVERLAP_NOTE}</Text>
        </View>
      ) : null}

      {/* `TOTAL_STEPS`, não o número literal: este bloco e o do rodapé são a MESMA condição — o
          passo final — e um deles com número fixo já ficou para trás ao inserir um passo novo. */}
      {step === TOTAL_STEPS ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <Text variant="title">Pronto para começar</Text>
          <Text variant="body" color={palette.muted}>
            Sua próxima medição já pode ser registrada na tela inicial.
          </Text>
        </View>
      ) : null}

      {/* Empurra a navegação para o rodapé sem prender a tela: o Screen já rola, e o flex-1 aqui
          só ocupa a sobra quando o conteúdo do passo é curto (passo final). */}
      <View className="flex-1" />

      {step === TOTAL_STEPS ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <Button label="Começar a registrar" size="lg" onPress={() => onFinish()} />
          <Button label="Configurar lembretes" variant="secondary" onPress={handleConfigureReminders} />
        </View>
      ) : (
        <View className="flex-row items-center" style={{ gap: tokens.spacing.sm }}>
          {step > 1 ? <Button label="Voltar" variant="ghost" onPress={handleBack} /> : null}
          <Button label="Próximo" className="flex-1" onPress={handleNext} />
        </View>
      )}
    </Screen>
  );
}
