import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

/**
 * Intervalo de minutos aceito pelo seletor. O @react-native-community/datetimepicker não exporta
 * este tipo, então ele é redeclarado aqui — e igual em `DateTimeField.web.tsx`, para as duas
 * implementações manterem a mesma assinatura.
 */
export type MinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

export interface DateTimeFieldProps {
  /** Valor atualmente selecionado. */
  value: Date;
  mode: 'datetime' | 'time' | 'date';
  /** Chamado a cada valor escolhido. Só o `Date` — quem chama não precisa saber do evento nativo. */
  onChange: (date: Date) => void;
  /**
   * Chamado quando o seletor deixa de estar em uso — confirmação, cancelamento ou saída do foco.
   * É o que permite à tela zerar o estado de "aberto"; sem ele o campo ficaria preso aberto para
   * sempre depois do primeiro toque.
   */
  onClose: () => void;
  /** Faz sentido em `mode="datetime"` ou `mode="date"`. */
  maximumDate?: Date;
  /** Só faz sentido em `mode="time"`. */
  minuteInterval?: MinuteInterval;
  accessibilityLabel?: string;
}

/**
 * Seletor de data/hora nativo (Android/iOS).
 *
 * Existe em par com `DateTimeField.web.tsx` porque o @react-native-community/datetimepicker não
 * tem implementação web: fora de Android/iOS o pacote cai em `src/datetimepicker.js`, que
 * renderiza `null` e só imprime um `console.warn` (CLAUDE.md §3.3 — diferença de plataforma por
 * extensão de arquivo, não por `if (Platform.OS)` espalhado pelas telas).
 *
 * Nota sobre `mode="datetime"`: o diálogo do Android só conhece `date` e `time`, e cai no de data
 * quando recebe `datetime`. É o comportamento que já existia antes deste componente; mudá-lo
 * (encadear os dois diálogos) é outra tarefa.
 */
export function DateTimeField({
  value,
  mode,
  onChange,
  onClose,
  maximumDate,
  minuteInterval,
  accessibilityLabel,
}: DateTimeFieldProps) {
  function handleValueChange(_event: unknown, date: Date): void {
    onChange(date);

    // Único ponto onde iOS e Android divergem, e não dá para separar por extensão de arquivo (o
    // tsconfig só resolve o sufixo ".native"): no Android o seletor é um DIÁLOGO que se fecha
    // sozinho ao confirmar — a tela precisa saber disso, senão o estado "aberto" fica preso. No
    // iOS ele é inline e emite a cada giro da roda; fechar no primeiro evento tiraria o controle
    // da tela antes de o usuário terminar de ajustar.
    if (Platform.OS !== 'ios') {
      onClose();
    }
  }

  return (
    <DateTimePicker
      value={value}
      mode={mode}
      maximumDate={maximumDate}
      minuteInterval={minuteInterval}
      accessibilityLabel={accessibilityLabel}
      onValueChange={handleValueChange}
      // Cancelar (botão "cancelar", toque fora, botão voltar) também precisa liberar o estado.
      onDismiss={onClose}
    />
  );
}
