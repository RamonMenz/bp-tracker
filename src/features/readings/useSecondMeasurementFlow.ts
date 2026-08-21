import { useEffect, useState } from 'react';

import { computeSessionAverage, type SessionReading } from '@/domain/session-average';

import { useUpdateReading } from './useUpdateReading';

/**
 * Sugestão de intervalo entre as duas medições — piso da faixa "1-2 minutos" do protocolo AHA,
 * para não testar a paciência de quem só queria uma segunda leitura rápida. NUNCA bloqueia
 * (ver cabeçalho de prompts_segunda_medicao_e_onboarding_tecnica.md) — é só o texto do contador.
 */
const SUGGESTED_INTERVAL_SECONDS = 60;

export type SecondMeasurementState = 'idle' | 'offer' | 'measuring' | 'summary';

/**
 * A primeira medição da sessão, com o que é preciso para depois ATUALIZAR o mesmo documento com
 * a média (em vez de criar uma segunda leitura separada — ver decisão de escopo no topo deste
 * arquivo). `note`/`measuredAt` são os valores que a atualização preserva; só o par sistólica/
 * diastólica (e o pulso, quando os dois lados o têm) muda para a média.
 */
export interface FirstMeasurement extends SessionReading {
  /** Id do documento já salvo no Firestore (devolvido por useAddReading/submit() no Prompt 4.1). */
  id: string;
  note: string | null;
  measuredAt: Date;
}

export interface UseSecondMeasurementFlowResult {
  state: SecondMeasurementState;
  /**
   * Segundos restantes da sugestão de espera, nunca negativo. Só é relevante em 'offer' e
   * 'measuring' — é 0 nos outros dois estados. NUNCA usado para desabilitar nada; é só o texto
   * do contador.
   */
  secondsRemaining: number;
  /**
   * Preenchido a partir de 'summary' em diante (computeSessionAverage do domínio); null nos
   * outros estados.
   */
  average: SessionReading | null;
  /**
   * Chame depois da PRIMEIRA medição salva com sucesso, com os valores JÁ CONVERTIDOS para
   * número, o id do documento e note/measuredAt (a tela deve fazer o snapshot dos campos do
   * formulário ANTES do submit assíncrono, porque useReadingForm limpa os campos para '' assim
   * que salva com sucesso). Só trata o caso 'idle' (vira a primeira medição da sessão,
   * idle→'offer', dispara o contador); em qualquer outro estado (a UI não deveria chamar nesses
   * casos, mas não lança) é NO-OP. A segunda medição não passa mais por aqui — ver
   * `submitSecondMeasurement`.
   */
  handleReadingSaved: (reading: FirstMeasurement) => void;
  /**
   * offer→'measuring'. Não reinicia o contador — ele já está rodando desde a primeira medição, o
   * tempo "sugerido" é entre as duas medições, não entre o toque no botão e a segunda.
   */
  acceptSecondMeasurement: () => void;
  /**
   * Chame com a segunda medição (só os 3 campos numéricos — sem passar pelo Firestore como
   * documento próprio). Fora de 'measuring' (ou sem uma primeira medição guardada) é NO-OP e
   * devolve `false` sem chamar updateReading. Em 'measuring', ATUALIZA o documento da primeira
   * medição (`firstReading.id`) com a média das duas, preservando note/measuredAt originais — não
   * cria um segundo documento. Sucesso leva measuring→'summary' com a média calculada; falha
   * mantém o estado em 'measuring', com `saveError` preenchido, para o usuário tentar de novo.
   */
  submitSecondMeasurement: (second: SessionReading) => Promise<boolean>;
  /**
   * Reflete o `isSaving` de useUpdateReading — só é relevante durante 'measuring', enquanto
   * `submitSecondMeasurement` está em voo.
   */
  isSaving: boolean;
  /**
   * Mensagem amigável já traduzida por useUpdateReading (nunca error.message cru — CLAUDE.md
   * §4.3) — só é relevante durante 'measuring', depois de um `submitSecondMeasurement` que falhou.
   */
  saveError: string | null;
  /**
   * De 'offer' OU 'measuring' de volta para 'idle', descartando tudo (a primeira medição já está
   * salva no Firestore de qualquer forma — só o ESTADO DA SESSÃO no cliente é descartado).
   * Disponível nos dois estados: o usuário pode desistir depois de já ter aceito.
   */
  decline: () => void;
  /** 'summary'→'idle'. Fecha o card de resumo depois que o usuário já viu a média. */
  dismissSummary: () => void;
}

/**
 * Máquina de estados da sugestão de segunda medição (protocolo AHA — Sugestão de Produto #5 do
 * roadmap): idle → offer (primeira medição salva, aguardando decisão) → measuring (usuário
 * aceitou, aguardando a segunda) → summary (média calculada) → idle. Sem UI aqui — a tela
 * consome este hook.
 *
 * Não bloqueia nada: `secondsRemaining` é só o texto do contador, nunca uma condição de
 * habilitar/desabilitar botão.
 */
export function useSecondMeasurementFlow(): UseSecondMeasurementFlowResult {
  const update = useUpdateReading();

  const [state, setState] = useState<SecondMeasurementState>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [average, setAverage] = useState<SessionReading | null>(null);

  // Guardada para poder calcular a média quando a segunda medição chegar E para saber QUAL
  // documento atualizar (firstReading.id) — não faz parte do resultado exposto pelo hook.
  const [firstReading, setFirstReading] = useState<FirstMeasurement | null>(null);

  // O contador só roda enquanto há uma sugestão pendente ('offer') ou a segunda medição sendo
  // aguardada ('measuring') — ao sair dos dois o interval é limpo (CLAUDE.md §3.4: todo listener
  // precisa de cleanup), sem deixar vazamento entre sessões.
  useEffect(() => {
    if (state !== 'offer' && state !== 'measuring') {
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  function handleReadingSaved(reading: FirstMeasurement): void {
    if (state === 'idle') {
      setFirstReading(reading);
      setSecondsRemaining(SUGGESTED_INTERVAL_SECONDS);
      setState('offer');
      return;
    }

    // Qualquer outro estado ('offer', 'measuring', 'summary'): a segunda medição não passa mais
    // por aqui (ver submitSecondMeasurement) — a UI não deveria chamar handleReadingSaved nesses
    // casos, e a função é NO-OP em vez de lançar.
  }

  /**
   * Segunda medição: ATUALIZA o documento da primeira (firstReading.id) com a média das duas, em
   * vez de criar um segundo documento — note/measuredAt da primeira medição são preservados.
   */
  async function submitSecondMeasurement(second: SessionReading): Promise<boolean> {
    if (state !== 'measuring' || firstReading === null) {
      return false;
    }

    const nextAverage = computeSessionAverage(firstReading, second);

    const success = await update.updateReading(firstReading.id, {
      systolic: String(nextAverage.systolic),
      diastolic: String(nextAverage.diastolic),
      pulse: nextAverage.pulse === null ? '' : String(nextAverage.pulse),
      note: firstReading.note ?? '',
      measuredAt: firstReading.measuredAt,
    });

    if (success) {
      setAverage(nextAverage);
      setState('summary');
    }

    return success;
  }

  function acceptSecondMeasurement(): void {
    if (state !== 'offer') {
      return;
    }

    setState('measuring');
  }

  function decline(): void {
    if (state !== 'offer' && state !== 'measuring') {
      return;
    }

    setState('idle');
    setFirstReading(null);
    setSecondsRemaining(0);
  }

  function dismissSummary(): void {
    if (state !== 'summary') {
      return;
    }

    setState('idle');
    setFirstReading(null);
    setAverage(null);
  }

  return {
    state,
    secondsRemaining,
    average,
    handleReadingSaved,
    acceptSecondMeasurement,
    submitSecondMeasurement,
    isSaving: update.isSaving,
    saveError: update.error,
    decline,
    dismissSummary,
  };
}
