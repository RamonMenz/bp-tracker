import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ChevronRightIcon, ShieldCheckIcon, SquareCheckIcon, SquareIcon } from '@/components/ui/icons';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export interface ConsentScreenProps {
  /** Registra o aceite. Quem sai desta tela depois é o gate de consentimento, não ela. */
  onAccept: () => void;
  /** Encerra a sessão — o único caminho para quem não autoriza. */
  onSignOut: () => void;
  onOpenPrivacyPolicy: () => void;
  isSaving: boolean;
  isSigningOut: boolean;
  /** Mensagem amigável já pronta (aceite, saída ou abertura da política). */
  error: string | null;
}

/**
 * Texto da autorização decidido pelo jurídico (LGPD art. 11, I: consentimento específico e
 * destacado). Não reescreva nem suavize sem aprovação.
 */
export const CONSENT_AUTHORIZATION_TEXT =
  'Autorizo o tratamento dos meus dados de pressão arterial para registro e lembretes';

/**
 * Tela burra do consentimento. O único estado local é a caixa de autorização, que nasce
 * DESMARCADA: consentimento pré-marcado não vale como consentimento.
 */
export function ConsentScreen({
  onAccept,
  onSignOut,
  onOpenPrivacyPolicy,
  isSaving,
  isSigningOut,
  error,
}: ConsentScreenProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);

  const CheckboxIcon = isAuthorized ? SquareCheckIcon : SquareIcon;

  function handleConfirmSignOut(): void {
    setIsDeclineDialogOpen(false);
    onSignOut();
  }

  return (
    <Screen>
      <View className="items-center gap-3 pt-4">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-light-primaryTint dark:bg-dark-primaryTint">
          <ShieldCheckIcon size={32} color={palette.primary} strokeWidth={2} />
        </View>
        <Text variant="title" accessibilityRole="header" className="text-center">
          Sua autorização para guardar suas medições
        </Text>
      </View>

      <Card className="gap-3">
        <Text variant="body">
          O BP Tracker guarda os valores de pressão e pulso que você registra, com data, hora e
          observações, junto com o nome e o e-mail da sua conta Google.
        </Text>
        <Text variant="body">
          Esses dados servem só para mostrar o seu histórico e enviar os lembretes que você escolher.
          Eles não são vendidos nem usados para publicidade.
        </Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Ler a política de privacidade completa"
          onPress={onOpenPrivacyPolicy}
          className="min-h-[48px] flex-row items-center justify-between gap-2"
        >
          <Text variant="body" color={palette.primary} style={{ fontWeight: '600' }}>
            Ler a política de privacidade completa
          </Text>
          <ChevronRightIcon size={18} color={palette.primary} strokeWidth={2.25} />
        </Pressable>
      </Card>

      {/* Destacado e separado de qualquer outro texto (LGPD art. 11, I): um card só para a
          autorização, com borda primária. Linha inteira tocável — o ícone sozinho ficaria abaixo
          do alvo de 48dp (CLAUDE.md §4.7). O estado não depende só da cor: o ícone troca de forma
          (quadrado vazio ↔ quadrado com check). */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={CONSENT_AUTHORIZATION_TEXT}
        accessibilityState={{ checked: isAuthorized, disabled: isSaving }}
        disabled={isSaving}
        onPress={() => setIsAuthorized((current) => !current)}
        className="min-h-[56px] flex-row items-center gap-3 rounded-2xl border-2 px-4 py-4"
        style={{
          borderColor: palette.primary,
          backgroundColor: isAuthorized ? palette.primaryTint : palette.surface,
        }}
      >
        <View accessible={false}>
          <CheckboxIcon size={28} color={palette.primary} strokeWidth={2.25} />
        </View>
        <Text variant="body" className="flex-1" style={{ fontWeight: '600' }}>
          {CONSENT_AUTHORIZATION_TEXT}
        </Text>
      </Pressable>

      <View className="gap-3">
        <Button
          label="Continuar"
          size="lg"
          onPress={onAccept}
          disabled={!isAuthorized}
          loading={isSaving}
        />
        <Button
          label="Não autorizo"
          variant="ghost"
          onPress={() => setIsDeclineDialogOpen(true)}
          disabled={isSaving}
          loading={isSigningOut}
        />

        {error ? <InlineFeedback tone="danger" message={error} /> : null}
      </View>

      <ConfirmDialog
        visible={isDeclineDialogOpen}
        title="Sem autorização, o app não funciona"
        message="O BP Tracker precisa dessa autorização para guardar suas medições. Sem ela, não há como usar o app. Você pode sair agora e voltar quando quiser."
        confirmLabel="Sair"
        cancelLabel="Voltar"
        onConfirm={handleConfirmSignOut}
        onCancel={() => setIsDeclineDialogOpen(false)}
      />
    </Screen>
  );
}
