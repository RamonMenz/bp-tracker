import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

export interface SecondMeasurementOfferDialogProps {
  visible: boolean;
  secondsRemaining: number;
  onAccept: () => void;
  onDecline: () => void;
}

/** Scrim sobre a tela — mesmo tom de ConfirmDialog.tsx, para os pop-ups do app não divergirem. */
const BACKDROP_COLOR = 'rgba(15, 23, 42, 0.55)';

/**
 * Texto de apoio do contador. Nunca é "Aguarde..." sozinho: o app não bloqueia nada aqui — o
 * intervalo é sugestão do protocolo, e quem quiser medir antes pode (CLAUDE.md §1, interface
 * calma). Por isso o zero vira um convite, não um "liberado".
 */
function countdownLabel(secondsRemaining: number): string {
  return secondsRemaining > 0 ? `Sugestão: aguarde mais ${secondsRemaining}s` : 'Pode medir quando quiser';
}

/**
 * Pop-up do CONVITE para a segunda medição (protocolo AHA), no molde de `ConfirmDialog` e de
 * `SecondMeasurementDialog` — Card dentro de um Modal transparente, com o mesmo scrim e o mesmo
 * tratamento do botão físico "voltar" do Android.
 *
 * Era um card comum no scroll da tela, abaixo do formulário: o convite chegava a existir, mas
 * passava despercebido logo depois de salvar a primeira medição. Como pop-up, ele aparece na hora
 * — e o fluxo fica contínuo: salvar a 1ª → este convite → o pop-up da 2ª medição.
 *
 * O tom é informativo, nunca prescritivo — o app registra, não diagnostica (CLAUDE.md §1).
 *
 * Componente burro (CLAUDE.md §3.4): só props entram e desenho sai. Quem decide quando abrir,
 * fechar e o que fazer em cada saída é `useSecondMeasurementFlow`.
 */
export function SecondMeasurementOfferDialog({
  visible,
  secondsRemaining,
  onAccept,
  onDecline,
}: SecondMeasurementOfferDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Botão físico "voltar" do Android: sem isto o pop-up vira uma armadilha na única plataforma
      // nativa do app. Cai na saída segura — a primeira medição já está salva de qualquer forma.
      onRequestClose={onDecline}
    >
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: BACKDROP_COLOR }}>
        <Card accessibilityViewIsModal elevation="flat" className="w-full max-w-[420px] gap-3">
          {/* Texto puro, sem ícone e sem numberOfLines — mesmo padrão do "Segunda medição" (título
              de SecondMeasurementDialog) e do title de ConfirmDialog. Aqui a pergunta inteira
              quebra em quantas linhas precisar, inclusive com a fonte ampliada pelo usuário (§4.7). */}
          <Text variant="sectionHeader">Quer confirmar com uma segunda medição?</Text>

          <Text variant="body">
            O protocolo clínico sugere medir de novo em cerca de 1 minuto, para reduzir a variação da
            primeira leitura.
          </Text>

          <Text variant="caption">{countdownLabel(secondsRemaining)}</Text>

          {/* Empilhado e em largura cheia, mesmo motivo dos outros dois diálogos: com o texto
              ampliado (o app nunca desativa allowFontScaling — §4.7) os rótulos não cabem em
              meia linha. */}
          <View className="gap-2">
            <Button label="Medir novamente" variant="secondary" onPress={onAccept} />
            <Button label="Não, obrigado" variant="ghost" onPress={onDecline} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
