import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';

import { classifyBloodPressure, type BpCategory } from '@/domain/bp-classification';

import {
  DIASTOLIC_MAX,
  DIASTOLIC_MIN,
  NOTE_MAX_LENGTH,
  PULSE_MAX,
  PULSE_MIN,
  SYSTOLIC_MAX,
  SYSTOLIC_MIN,
} from './reading.schema';
import { useAddReading } from './useAddReading';

export interface ReadingFieldErrors {
  systolic: string | null;
  diastolic: string | null;
  pulse: string | null;
  note: string | null;
}

export interface UseReadingFormResult {
  systolic: string;
  diastolic: string;
  pulse: string;
  note: string;
  measuredAt: Date;
  setSystolic: (value: string) => void;
  setDiastolic: (value: string) => void;
  setPulse: (value: string) => void;
  setNote: (value: string) => void;
  setMeasuredAt: (value: Date) => void;
  fieldErrors: ReadingFieldErrors;
  /**
   * Categoria do par já digitado, ou null enquanto ele não for classificável. Sempre recalculada,
   * nunca persistida — é função pura de (systolic, diastolic), como manda o domínio.
   */
  previewCategory: BpCategory | null;
  /** false enquanto faltar campo obrigatório ou houver erro de faixa — o botão Salvar espelha isto. */
  canSubmit: boolean;
  submit: () => Promise<boolean>;
  isSaving: boolean;
  submitError: string | null;
}

function rangeError(value: string, min: number, max: number): string | null {
  if (value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return `Informe um valor entre ${min} e ${max}.`;
  }

  return null;
}

// Mesma regra dos campos numéricos: só acusa erro quando o conteúdo já ultrapassa o limite, nunca
// num campo vazio (a observação é opcional).
function noteError(value: string, maxLength: number): string | null {
  if (value.length <= maxLength) {
    return null;
  }

  return `A observação deve ter no máximo ${maxLength} caracteres.`;
}

/**
 * Estado e validação do formulário de nova medição.
 *
 * A validação daqui é de FEEDBACK — mensagens curtas por campo, calculadas a cada tecla, para o
 * usuário corrigir antes de tentar salvar. Ela não substitui o schema Zod: `useAddReading`
 * continua sendo o portão único de entrada no repositório, e as faixas usadas aqui são
 * importadas de `reading.schema` justamente para as duas camadas não divergirem.
 *
 * Só reporta erro em campo preenchido: acusar "valor inválido" num campo vazio que o usuário
 * ainda nem tocou é ruído, não ajuda.
 */
export function useReadingForm(): UseReadingFormResult {
  const { addReading, isSaving, error: submitError } = useAddReading();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [note, setNote] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date());

  const fieldErrors = useMemo<ReadingFieldErrors>(() => {
    const systolicRange = rangeError(systolic, SYSTOLIC_MIN, SYSTOLIC_MAX);
    const diastolicRange = rangeError(diastolic, DIASTOLIC_MIN, DIASTOLIC_MAX);

    // A relação entre os dois só é checável quando ambos estão dentro da própria faixa; senão a
    // mensagem "menor que a sistólica" apareceria por cima de um valor que já é inválido sozinho.
    const isPairComparable = systolicRange === null && diastolicRange === null && systolic !== '' && diastolic !== '';
    const isPairInverted = isPairComparable && Number(systolic) <= Number(diastolic);

    return {
      systolic: systolicRange,
      diastolic: diastolicRange ?? (isPairInverted ? 'Deve ser menor que a sistólica.' : null),
      pulse: rangeError(pulse, PULSE_MIN, PULSE_MAX),
      note: noteError(note, NOTE_MAX_LENGTH),
    };
  }, [systolic, diastolic, pulse, note]);

  // O par é classificável assim que os dois campos estão válidos entre si — o pulso, que é
  // opcional, não entra na conta: um pulso fora de faixa não deve apagar a classificação da
  // pressão que o usuário acabou de digitar.
  const isPairValid =
    systolic !== '' && diastolic !== '' && fieldErrors.systolic === null && fieldErrors.diastolic === null;

  const previewCategory = isPairValid ? classifyBloodPressure(Number(systolic), Number(diastolic)) : null;

  // O pulso e a observação são opcionais, mas, uma vez preenchidos, um erro neles trava o Salvar
  // do mesmo jeito que um erro de faixa nos campos obrigatórios — o texto além do limite seria
  // rejeitado pelo schema Zod de qualquer forma, e é melhor barrar aqui, com a mensagem amigável
  // já visível no campo, do que deixar o submit falhar e mostrar o erro genérico do repositório.
  const canSubmit = isPairValid && fieldErrors.pulse === null && fieldErrors.note === null;

  async function submit(): Promise<boolean> {
    const success = await addReading({ systolic, diastolic, pulse, note, measuredAt });

    if (success) {
      // Falha de háptico (aparelho sem motor, web) não pode derrubar um salvamento que deu certo.
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setNote('');
      setMeasuredAt(new Date());
    }

    return success;
  }

  return {
    systolic,
    diastolic,
    pulse,
    note,
    measuredAt,
    setSystolic,
    setDiastolic,
    setPulse,
    setNote,
    setMeasuredAt,
    fieldErrors,
    previewCategory,
    canSubmit,
    submit,
    isSaving,
    submitError,
  };
}
