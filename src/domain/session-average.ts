export interface SessionReading {
  systolic: number;
  diastolic: number;
  pulse: number | null;
}

/**
 * Média de duas medições de uma mesma sessão (protocolo AHA: duas medições com 1-2 min de
 * intervalo, reportando a média). Pura e sem I/O — testável sem emulador.
 *
 * systolic/diastolic: média simples arredondada com Math.round — mesma regra de arredondamento
 * usada em average() de src/features/readings/useReadingsTrend.ts.
 *
 * pulse: só calcula a média se as DUAS medições tiverem pulso registrado. Se qualquer uma das
 * duas estiver com pulso null, o resultado também é null — não faz sentido "completar" um pulso
 * que não foi medido com o valor do outro, isso inventaria um dado que nunca existiu.
 */
export function computeSessionAverage(
  first: SessionReading,
  second: SessionReading,
): SessionReading {
  const pulse =
    first.pulse === null || second.pulse === null
      ? null
      : Math.round((first.pulse + second.pulse) / 2);

  return {
    systolic: Math.round((first.systolic + second.systolic) / 2),
    diastolic: Math.round((first.diastolic + second.diastolic) / 2),
    pulse,
  };
}
