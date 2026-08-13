import { Modal, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  /** Rótulo da ação que confirma. Sempre explícito ("Excluir", "Excluir definitivamente"): é ele
   *  que nomeia a consequência, não a cor do botão (CLAUDE.md §4.7). */
  confirmLabel: string;
  cancelLabel?: string;
  /** Pinta o confirmar com a paleta de perigo. Reforço visual do que o `confirmLabel` já diz. */
  isDestructive?: boolean;
  onConfirm: () => void;
  /** Ausente = diálogo de aviso: um botão só, que apenas dispensa (o "OK" do antigo Alert). */
  onCancel?: () => void;
}

/** Scrim sobre a tela — slate-900 translúcido, o mesmo tom da sombra dos cards. */
const BACKDROP_COLOR = 'rgba(15, 23, 42, 0.55)';

/**
 * Diálogo de confirmação sobre o `Modal` do React Native.
 *
 * Existe porque `Alert.alert` **não funciona na web**: o react-native-web o define como um método
 * vazio (`static alert() {}`), então nem o diálogo aparece nem o array de botões é lido — o
 * `onPress` da ação é descartado em silêncio. `Modal`, ao contrário, tem implementação real lá
 * (portal + trap de foco), e é a única primitiva que se comporta igual nas duas plataformas.
 *
 * Componente controlado: quem abre é quem fecha. Ele não guarda estado de visibilidade nem
 * dispara a ação sozinho — a tela decide o que fazer em `onConfirm`/`onCancel`.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Sem `onCancel` não há o que cancelar: o confirmar vira o "OK" que só dispensa o aviso.
  const handleDismiss = onCancel ?? onConfirm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Botão físico "voltar" do Android: sem isto o diálogo vira uma armadilha na única
      // plataforma nativa do app. Cai sempre na saída segura, nunca na ação destrutiva.
      onRequestClose={handleDismiss}
    >
      {/* Fundo sem toque para fechar, de propósito: reproduz o `cancelable: false` que o
          Alert.alert usava por padrão, para não dispensar por engano um aviso irreversível. */}
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: BACKDROP_COLOR }}>
        <Card
          accessibilityViewIsModal
          accessibilityRole="alert"
          elevation="flat"
          className="w-full max-w-[420px] gap-2"
        >
          <Text variant="sectionHeader">{title}</Text>
          <Text variant="body">{message}</Text>

          {/* Empilhado e em largura cheia, não lado a lado: com o texto ampliado (o app nunca
              desativa allowFontScaling — §4.7) rótulos como "Excluir definitivamente" não cabem
              em meia linha. Cancelar vem PRIMEIRO por segurança: o trap de foco do
              react-native-web foca o primeiro descendente focável ao abrir, então a ação neutra
              é a que recebe o foco inicial — e a ordem de leitura bate com a ordem visual. */}
          <View className="mt-2 gap-2">
            {onCancel ? <Button label={cancelLabel} variant="secondary" onPress={onCancel} /> : null}
            <Button
              label={confirmLabel}
              variant={isDestructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
