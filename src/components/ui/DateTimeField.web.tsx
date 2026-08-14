import { useEffect, useRef, type ChangeEvent, type CSSProperties, type KeyboardEvent } from 'react';

import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

/**
 * Intervalo de minutos aceito pelo seletor. O @react-native-community/datetimepicker não exporta
 * este tipo, então ele é redeclarado aqui — e igual em `DateTimeField.native.tsx`, para as duas
 * implementações manterem a mesma assinatura.
 */
export type MinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

export interface DateTimeFieldProps {
  /** Valor atualmente selecionado. */
  value: Date;
  mode: 'datetime' | 'time';
  /** Chamado a cada valor escolhido. Só o `Date` — quem chama não precisa saber do evento do input. */
  onChange: (date: Date) => void;
  /**
   * Chamado quando o seletor deixa de estar em uso — Enter, Esc ou saída do foco.
   * É o que permite à tela zerar o estado de "aberto"; sem ele o campo ficaria preso aberto para
   * sempre depois do primeiro toque.
   */
  onClose: () => void;
  /** Só faz sentido em `mode="datetime"`. */
  maximumDate?: Date;
  /** Só faz sentido em `mode="time"`. */
  minuteInterval?: MinuteInterval;
  accessibilityLabel?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Formato exigido pelo input: `HH:mm` (`time`) ou `YYYY-MM-DDTHH:mm` (`datetime-local`), sempre no
 * fuso LOCAL. `toISOString()` não serve aqui — converteria para UTC e deslocaria a hora exibida.
 */
function toInputValue(date: Date, mode: DateTimeFieldProps['mode']): string {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (mode === 'time') {
    return time;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

/**
 * Converte o valor do input de volta para `Date` — a fronteira onde a string do DOM vira o tipo
 * que o resto do app usa. Devolve `null` enquanto o campo está vazio ou incompleto (o navegador
 * emite `change` com string vazia quando o usuário limpa um dos segmentos), caso em que não há
 * nada a propagar.
 *
 * No modo `time` o input só carrega hora e minuto, então a data vem de `reference`: trocar o
 * horário de um lembrete não pode mudar o dia por baixo.
 */
function fromInputValue(inputValue: string, mode: DateTimeFieldProps['mode'], reference: Date): Date | null {
  if (mode === 'time') {
    const match = /^(\d{2}):(\d{2})/.exec(inputValue);

    if (match === null) {
      return null;
    }

    const date = new Date(reference);
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(inputValue);

  if (match === null) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0, 0);
}

/**
 * Seletor de data/hora na web.
 *
 * Existe em par com `DateTimeField.native.tsx` porque o @react-native-community/datetimepicker não
 * tem implementação web: fora de Android/iOS o pacote cai em `src/datetimepicker.js`, que renderiza
 * `null` e só imprime um `console.warn` — o toque não abria nada e o `onChange` nunca disparava,
 * deixando a tela presa no estado "aberto".
 *
 * A troca é pelo input do próprio navegador (`datetime-local` / `time`), e não por um calendário
 * desenhado à mão: ele já é operável por teclado, anunciado por leitor de tela e localizado no
 * formato do sistema — exatamente o que o CLAUDE.md §4.7 exige, sem código para manter.
 *
 * `onChange` dispara a cada valor completo e `onClose` só ao sair do campo (Enter, Esc ou blur):
 * o `change` do input também acontece no meio da digitação, então fechar nele arrancaria o campo
 * da tela antes de o usuário terminar de digitar a data.
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
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;

    // `showPicker()` não existe em todo navegador (Safari e Firefox antigos) nem fora do DOM.
    if (typeof input?.showPicker !== 'function') {
      return;
    }

    try {
      // Abre o calendário/relógio do navegador já no primeiro toque, em vez de exigir um segundo
      // clique dentro do campo — o app precisa registrar em ≤10s e 4 toques (CLAUDE.md §1).
      input.showPicker();
    } catch {
      // Só abre com ativação recente do usuário; sem ela o navegador lança NotAllowedError. Não
      // há o que tratar: o campo já está focado e continua operável pelo ícone ou digitando.
    }
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const date = fromInputValue(event.target.value, mode, value);

    if (date === null) {
      return;
    }

    // Sem recorte por `maximumDate` aqui de propósito: o atributo `max` já bloqueia o seletor do
    // navegador, e um valor digitado à mão acima do limite é recusado com mensagem em português
    // pelo schema da medição — melhor do que reescrever em silêncio o que a pessoa digitou.
    onChange(date);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' || event.key === 'Escape') {
      onClose();
    }
  }

  const inputStyle: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    // §4.7: alvo de toque ≥ 48dp e corpo de texto ≥ 16px (que na web também evita o zoom
    // automático do Safari em campo focado).
    minHeight: 48,
    fontSize: 16,
    fontFamily: 'inherit',
    padding: '0 16px',
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.surface,
    color: palette.text,
    // Faz o navegador desenhar o calendário/relógio nativo no mesmo tema do app.
    colorScheme: scheme,
  };

  return (
    <input
      ref={inputRef}
      // O campo só existe enquanto está sendo editado — quem o montou acabou de tocar no carimbo
      // e quer justamente digitar ali. Focar por conta própria é o equivalente ao diálogo que o
      // seletor nativo abre em cima da tela, e é o que faz o Esc/Tab de saída chegarem até aqui.
      autoFocus
      type={mode === 'time' ? 'time' : 'datetime-local'}
      value={toInputValue(value, mode)}
      max={maximumDate === undefined ? undefined : toInputValue(maximumDate, mode)}
      step={minuteInterval === undefined ? undefined : minuteInterval * 60}
      aria-label={accessibilityLabel}
      style={inputStyle}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onClose}
    />
  );
}
