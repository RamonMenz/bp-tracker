import {
  DIASTOLIC_MAX,
  DIASTOLIC_MIN,
  PULSE_MAX,
  PULSE_MIN,
  SYSTOLIC_MAX,
  SYSTOLIC_MIN,
} from './reading.schema';

/** Os três campos numéricos como o formulário os guarda: string, possivelmente vazia. */
export interface BpNumericFields {
  systolic: string;
  diastolic: string;
  pulse: string;
}

export interface BpNumericFieldErrors {
  systolic: string | null;
  diastolic: string | null;
  pulse: string | null;
}

/**
 * Só reporta erro em campo PREENCHIDO: acusar "valor inválido" num campo vazio que o usuário ainda
 * nem tocou é ruído, não ajuda.
 */
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

/**
 * Validação de FEEDBACK dos três campos numéricos de uma medição — mensagens curtas por campo,
 * recalculadas a cada tecla, para o usuário corrigir antes de tentar salvar. Não substitui o
 * schema Zod: os hooks de escrita continuam sendo o portão único de entrada no repositório. As
 * faixas vêm de `reading.schema` justamente para as duas camadas não divergirem.
 *
 * Módulo à parte (e não uma função solta em `useReadingForm`) porque o formulário grande da tela
 * de registro e o pop-up da segunda medição precisam das MESMAS regras — em especial a de
 * "sistólica deve ser maior que a diastólica", que não pode existir em duas cópias divergentes.
 */
export function computeBpFieldErrors({ systolic, diastolic, pulse }: BpNumericFields): BpNumericFieldErrors {
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
  };
}

/**
 * O par é classificável/salvável assim que os dois campos obrigatórios estão válidos entre si — o
 * pulso, que é opcional, não entra na conta: um pulso fora de faixa não deve apagar a
 * classificação da pressão que o usuário acabou de digitar (quem barra o salvamento por causa do
 * pulso é o `canSubmit` de quem chama, não esta função).
 */
export function isBpPairValid(
  { systolic, diastolic }: BpNumericFields,
  errors: BpNumericFieldErrors,
): boolean {
  return systolic !== '' && diastolic !== '' && errors.systolic === null && errors.diastolic === null;
}
