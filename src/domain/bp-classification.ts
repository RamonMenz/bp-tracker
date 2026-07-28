export type BpCategory = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';

/**
 * Classificação de referência AHA (PLAN §4.2). A ordem dos testes é a regra: as faixas se
 * sobrepõem, e a categoria correta é sempre a mais alta que qualquer um dos dois valores atinge
 * — 120/80 é estágio 1 pela diastólica, não "elevada" pela sistólica.
 *
 * O resultado NUNCA é persistido: é função pura de (systolic, diastolic) e é recalculado a cada
 * render, para que uma mudança na tabela de referência não deixe dado velho inconsistente no banco.
 */
export function classifyBloodPressure(systolic: number, diastolic: number): BpCategory {
  if (systolic > 180 || diastolic > 120) {
    return 'crisis';
  }

  if (systolic >= 140 || diastolic >= 90) {
    return 'stage2';
  }

  if (systolic >= 130 || diastolic >= 80) {
    return 'stage1';
  }

  // Aqui a diastólica já é < 80; só a sistólica decide entre elevada e normal.
  if (systolic >= 120) {
    return 'elevated';
  }

  return 'normal';
}
