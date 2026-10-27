import type { CandidateField, CandidateSet, ClinicalField, FinalTranscript } from './assisted-entry';

const UNITS = ['zero', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function spell(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n === 100) return 'cem';
  const base = n < 100 ? TENS[Math.floor(n / 10)] : HUNDREDS[Math.floor(n / 100)];
  const rest = n % (n < 100 ? 10 : 100);
  return base + (rest ? ` e ${spell(rest)}` : '');
}

// Uma gramática finita evita somar palavras arbitrárias ("vinte oitenta").
const NUMBERS = new Map(Array.from({ length: 1000 }, (_, n) => [spell(n), n]));
const NUMBER_WORDS = new Set([...UNITS, ...TEENS, ...TENS, ...HUNDREDS, 'cem']);
type Numeric = { value: number; decimal: boolean; tenths: number };
type Token = string | Numeric;
type Reason = Extract<CandidateField, { status: 'uncertain' }>['reason'];
const LABELS: Readonly<Record<string, ClinicalField>> = {
  sistolica: 'systolic', diastolica: 'diastolic', pulso: 'pulse',
};

function integer(text: string): number | undefined {
  return /^\d{1,6}$/.test(text) ? Number(text) : NUMBERS.get(text);
}

function numeric(text: string): Numeric | undefined {
  const parts = text.split(' virgula ');
  const whole = integer(parts[0]);
  if (whole === undefined || parts.length > 2) return;
  if (parts.length === 1) return { value: whole, decimal: false, tenths: whole * 10 };
  const digit = integer(parts[1]);
  // Uma casa decimal, inclusive zero; nunca arredondar nem truncar.
  if (digit === undefined || digit > 9 || /^\d{2,}$/.test(parts[1])) return;
  return { value: whole + digit / 10, decimal: true, tenths: whole * 10 + digit };
}

function tokenize(text: string): Token[] {
  const words = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\bcatorze\b/g, 'quatorze')
    .replace(/(\d)[,.](\d)/g, '$1 virgula $2')
    .replace(/\//g, ' por ')
    .replace(/[,;:.!?]/g, ' | ')
    .trim().split(/\s+/).filter(Boolean);
  const result: Token[] = [];
  for (let i = 0; i < words.length;) {
    if (NUMBER_WORDS.has(words[i]) || /^\d+$/.test(words[i])) {
      let end = i + 1;
      while (end < words.length && (NUMBER_WORDS.has(words[end])
        || /^\d+$/.test(words[end]) || words[end] === 'virgula'
        || (words[end] === 'e' && NUMBER_WORDS.has(words[end + 1])))) end++;
      result.push(numeric(words.slice(i, end).join(' ')) ?? 'invalid-number');
      i = end;
    } else result.push(words[i++]);
  }
  return result.filter(token => token !== '|');
}

function isNumber(token: Token | undefined): token is Numeric {
  return typeof token === 'object' && token !== null;
}

/** Somente transcrição final pt-BR. Sem I/O, estado global clínico ou validação clínica. */
export function interpretVoice(input: FinalTranscript): CandidateSet {
  // Defesa de runtime: um cast na futura bridge não deve aceitar resultado parcial.
  if (input.kind !== 'transcript' || input.final !== true || input.locale !== 'pt-BR'
    || typeof input.text !== 'string' || !Number.isFinite(input.capturedAtMs)
    || input.capturedAtMs < 0) throw new Error('invalid-final-transcript');
  const fields: Record<ClinicalField, CandidateField> = {
    systolic: { status: 'missing' }, diastolic: { status: 'missing' }, pulse: { status: 'missing' },
  };
  const output: CandidateSet = { modality: 'voice', capturedAtMs: input.capturedAtMs, fields };
  // Limite de parser, não limite de áudio. Sem incluir conteúdo em erros.
  if (input.text.length > 2000) {
    for (const key of Object.keys(fields) as ClinicalField[]) fields[key] = { status: 'uncertain', reason: 'unreadable' };
    return output;
  }
  const tokens = tokenize(input.text);
  const used = new Set<number>();
  const assigned = new Set<ClinicalField>();
  function uncertain(key: ClinicalField, reason: Reason) {
    fields[key] = { status: 'uncertain', reason };
  }
  function assign(key: ClinicalField, value: CandidateField) {
    if (assigned.has(key)) uncertain(key, 'ambiguous-label');
    else fields[key] = value;
    assigned.add(key);
  }
  const pairSeparators = tokens.flatMap((t, i) => t === 'por' ? [i] : []);
  for (const i of pairSeparators) {
    used.add(i);
    const left = tokens[i - 1];
    const right = tokens[i + 1];
    const pair: [ClinicalField, Token | undefined, number][] = [
      ['systolic', left, i - 1], ['diastolic', right, i + 1],
    ];
    const colloquial = isNumber(left) && isNumber(right)
      && left.value >= 5 && left.value <= 30 && right.value >= 3 && right.value <= 20;
    const mixed = isNumber(left) && isNumber(right) && !colloquial
      && (left.value < 30 || right.value < 30 || left.decimal || right.decimal);
    for (const [key, token, index] of pair) {
      if (token === 'invalid-number' || isNumber(token)) used.add(index);
      assign(key, pairSeparators.length > 1 ? { status: 'uncertain', reason: 'multiple-pairs' }
        : mixed ? { status: 'uncertain', reason: 'mixed-scale' }
          : isNumber(token) && !colloquial && (token.value < 30 || token.decimal)
            ? { status: 'uncertain', reason: 'mixed-scale' }
          : isNumber(token) ? { status: 'candidate', value: colloquial ? token.tenths : token.value,
              basis: colloquial ? 'colloquial-pair' : 'explicit-phrase' }
            : token === 'invalid-number' ? { status: 'uncertain', reason: 'unreadable' } : { status: 'missing' });
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const label = tokens[i];
    const key = typeof label === 'string' ? LABELS[label] : undefined;
    if (!key) continue;
    used.add(i);
    let next = i + 1;
    if (tokens[next] === 'de' || tokens[next] === 'e') used.add(next++);
    const token = tokens[next];
    // Um número não pode ser simultaneamente pulso rotulado e lado de um par.
    // Estruturas sobrepostas ficam explícitas, mesmo se os valores coincidirem.
    if (used.has(next) && (isNumber(token) || token === 'invalid-number')) {
      uncertain('systolic', 'ambiguous-label');
      uncertain('diastolic', 'ambiguous-label');
      assign(key, { status: 'uncertain', reason: 'ambiguous-label' });
      continue;
    }
    if (isNumber(token) || token === 'invalid-number') used.add(next);
    assign(key, isNumber(token) && !token.decimal ? { status: 'candidate', value: token.value, basis: 'label' }
      : token === 'invalid-number' || isNumber(token) ? { status: 'uncertain', reason: 'unreadable' } : { status: 'missing' });
  }
  // Não selecionar a última correção, nem interpretar uma negação como confirmação.
  const correction = tokens.some(t => typeof t === 'string'
    && ['nao', 'corrigindo', 'corrijo', 'desculpa', 'alias', 'digo', 'ou', 'correcao'].includes(t));
  const prefix = /^(?:a |minha )?pressao(?: arterial)?(?: esta| e| foi| deu)?(?: de)?\b/;
  const remainder = tokens.filter((_, i) => !used.has(i));
  const extraNumber = remainder.some(t => isNumber(t) || t === 'invalid-number');
  const prose = remainder.filter(t => typeof t === 'string').join(' ')
    .replace(prefix, '').replace(/\b(?:e|mmhg|bpm)\b/g, '').trim();
  for (const key of Object.keys(fields) as ClinicalField[]) {
    if (correction && fields[key].status !== 'missing') uncertain(key, 'multiple-pairs');
    else if (pairSeparators.length > 1 && key !== 'pulse') uncertain(key, 'multiple-pairs');
    else if ((extraNumber || prose) && fields[key].status === 'candidate') uncertain(key, 'unidentified-number');
  }
  return output;
}
