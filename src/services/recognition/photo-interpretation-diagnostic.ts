import { inspectPhotoText } from '@/domain/interpret-photo';

import type { CandidateField, CandidateSet, OcrObservation } from '@/domain/assisted-entry';

function describeField(field: CandidateField): string {
  if (field.status === 'candidate') return 'candidato';
  if (field.status === 'missing') return 'ausente';
  if (field.status === 'uncertain') {
    switch (field.reason) {
      case 'ambiguous-label': return 'incerto-rotulo-ambiguo';
      case 'mixed-scale': return 'incerto-escala';
      case 'unidentified-number': return 'incerto-numero-sem-rotulo';
      case 'unreadable': return 'incerto-ilegivel-ou-distante';
    }
  }
  return 'indefinido';
}

/** Projeção local da demo. Só literais fixos; sem texto, valores, caixas ou hora. */
export function describePhotoInterpretation(observation: OcrObservation, candidates: CandidateSet): readonly string[] {
  const signals = inspectPhotoText(observation);
  return [
    observation.tokens.some(token => token.text.trim().length > 0) ? 'ocr:linhas-presentes' : 'ocr:sem-linhas-utilizaveis',
    `associacao:SYS=${describeField(candidates.fields.systolic)}`,
    `associacao:DIA=${describeField(candidates.fields.diastolic)}`,
    `associacao:PUL=${describeField(candidates.fields.pulse)}`,
    signals.hasAsciiDigit ? 'ocr:digitos-ascii-presentes' : 'ocr:sem-digitos-ascii',
    signals.labels.systolic ? 'rotulo:SYS=presente' : 'rotulo:SYS=ausente',
    signals.labels.diastolic ? 'rotulo:DIA=presente' : 'rotulo:DIA=ausente',
    signals.labels.pulse ? 'rotulo:PUL=presente' : 'rotulo:PUL=ausente',
  ];
}
