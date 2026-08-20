import { useEffect, useState } from 'react';

import { computeSessionAverage, type SessionReading } from '@/domain/session-average';

/**
 * Sugestão de intervalo entre as duas medições — piso da faixa "1-2 minutos" do protocolo AHA,
 * para não testar a paciência de quem só queria uma segunda leitura rápida. NUNCA bloqueia
 * (ver cabeçalho de prompts_segunda_medicao_e_onboarding_tecnica.md) — é só o texto do contador.
 */
const SUGGESTED_INTERVAL_SECONDS = 60;

export type SecondMeasurementState = 'idle' | 'offer' | 'measuring' | 'summary';

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
   * Chame depois de qualquer medição salva com sucesso, com os valores JÁ CONVERTIDOS para
   * número (a tela deve fazer o snapshot dos campos do formulário ANTES do submit assíncrono,
   * porque useReadingForm limpa os campos para '' assim que salva com sucesso). Esta função
   * decide sozinha o que fazer com o estado atual: em 'idle', vira a primeira medição da sessão
   * (idle→'offer', dispara o contador); em 'measuring', vira a segunda (calcula a média,
   * measuring→'summary'); em qualquer outro estado (a UI não deveria chamar nesses casos, mas
   * não lança) é NO-OP.
   */
  handleReadingSaved: (reading: SessionReading) => void;
  /**
   * offer→'measuring'. Não reinicia o contador — ele já está rodando desde a primeira medição, o
   * tempo "sugerido" é entre as duas medições, não entre o toque no botão e a segunda.
   */
  acceptSecondMeasurement: () => void;
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
  const [state, setState] = useState<SecondMeasurementState>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [average, setAverage] = useState<SessionReading | null>(null);

  // Guardada só para poder calcular a média quando a segunda medição chegar — não faz parte do
  // resultado exposto pelo hook.
  const [firstReading, setFirstReading] = useState<SessionReading | null>(null);

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

  function handleReadingSaved(reading: SessionReading): void {
    if (state === 'idle') {
      setFirstReading(reading);
      setSecondsRemaining(SUGGESTED_INTERVAL_SECONDS);
      setState('offer');
      return;
    }

    if (state === 'measuring' && firstReading !== null) {
      setAverage(computeSessionAverage(firstReading, reading));
      setState('summary');
      return;
    }

    // 'offer', 'summary', ou 'measuring' sem uma primeira medição guardada (não deveria
    // acontecer — não há como calcular a média sem os dois lados): a UI não deveria chamar
    // handleReadingSaved nesses casos, e a função é NO-OP em vez de lançar.
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
    decline,
    dismissSummary,
  };
}
