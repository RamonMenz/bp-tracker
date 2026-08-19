/**
 * Fragmentos de nome de campo que NUNCA podem aparecer em contexto de log ou relatório de crash.
 *
 * Dado de pressão arterial é dado sensível de saúde (LGPD) e não pode sair do dispositivo por
 * canal nenhum além do Firestore do próprio usuário (CLAUDE.md §4.5). `uid` é aceitável.
 *
 * A comparação é por SUBSTRING e case-insensitive, para pegar variações como `userEmail`,
 * `fcmToken` ou `authToken` — não só o nome exato. O custo é falso positivo em nomes inocentes
 * que contenham o fragmento (`tokenCount`, por exemplo): nesse caso renomeie a chave do log
 * (`deviceCount`). Falso positivo custa um rename; falso negativo vaza PII para o Crashlytics.
 */
export const FORBIDDEN_LOG_KEY_FRAGMENTS = [
  // Valores de medição (dado de saúde)
  'systolic',
  'diastolic',
  'pulse',
  'note',
  'reading',
  // Identificação pessoal
  'email',
  'displayname',
  'photourl',
  'phone',
  'cpf',
  'address',
  // Credenciais
  'token',
  'password',
  'secret',
  'apikey',
  'credential',
] as const;

export type ForbiddenLogKeyFragment = (typeof FORBIDDEN_LOG_KEY_FRAGMENTS)[number];

/**
 * Marca com `never` qualquer chave cujo nome contenha um fragmento proibido, fazendo a chamada
 * falhar na COMPILAÇÃO. É a primeira das três barreiras — ver `logError`.
 */
export type SafeLogContext<T> = {
  [K in keyof T]: Lowercase<K & string> extends `${string}${ForbiddenLogKeyFragment}${string}`
    ? never
    : T[K];
};

export type CrashReporter = {
  recordError: (scope: string, error: unknown, context: Record<string, unknown>) => void;
};

let crashReporter: CrashReporter | null = null;

/**
 * Conecta o Crashlytics (ou outro coletor) em produção.
 *
 * O logger não importa o Crashlytics direto de propósito: ele não existe no Firebase JS SDK que
 * este app usa — só em `@react-native-firebase/crashlytics`, que é módulo nativo e não tem
 * equivalente na web. Manter a dependência invertida deixa `logger.ts` puro, testável e igual nas
 * duas plataformas; quem conhece a plataforma injeta o coletor no bootstrap.
 *
 * ESTADO ATUAL (verificado no código, não hipótese):
 *   - NATIVO: conectado. `src/services/firebase/index.ts` chama `setCrashReporter(...)` no
 *     bootstrap, fora de `__DEV__`, com o adapter de `src/services/crashReporter.native.ts`
 *     (`@react-native-firebase/crashlytics`). Erro de produção no Android chega ao Crashlytics.
 *   - WEB: conectado. O mesmo bootstrap injeta `crashReporter.web.ts`, que usa `@sentry/browser`
 *     (não existe SDK web do Crashlytics). Erro de produção na web chega ao Sentry, agrupado pela
 *     tag `scope`, com o contexto já sanitizado como `extra` — sem inicializar quando a DSN não
 *     está configurada (ver RELEASE_CHECKLIST.md).
 */
export function setCrashReporter(reporter: CrashReporter | null): void {
  crashReporter = reporter;
}

const MAX_SANITIZE_DEPTH = 4;

function isForbiddenKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return FORBIDDEN_LOG_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/**
 * Coleta as chaves proibidas em profundidade. Um objeto aninhado (`{ user: { email } }`) passaria
 * batido por uma checagem só do primeiro nível, então a varredura é recursiva com limite de
 * profundidade (proteção contra estrutura cíclica ou muito profunda).
 */
function collectForbiddenKeys(value: unknown, depth: number, path: string, found: string[]): void {
  if (depth > MAX_SANITIZE_DEPTH || value === null || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenKeys(item, depth + 1, `${path}[${index}]`, found));
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const keyPath = path === '' ? key : `${path}.${key}`;

    if (isForbiddenKey(key)) {
      found.push(keyPath);
      continue;
    }

    collectForbiddenKeys(nested, depth + 1, keyPath, found);
  }
}

function removeForbiddenKeys(value: unknown, depth: number): unknown {
  if (depth > MAX_SANITIZE_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => removeForbiddenKeys(item, depth + 1));
  }

  const result: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    if (isForbiddenKey(key)) {
      result[key] = '[removido: campo proibido em log]';
      continue;
    }

    result[key] = removeForbiddenKeys(nested, depth + 1);
  }

  return result;
}

/**
 * Único ponto autorizado a usar `console` — em qualquer outro arquivo é proibido (CLAUDE.md §4.5).
 *
 * Três barreiras contra vazamento de PII/dado de saúde:
 *   1. COMPILAÇÃO — `SafeLogContext` rejeita chave com nome proibido (exato ou substring).
 *   2. DEV, em runtime — lança se uma chave proibida escapar da checagem de tipo (contexto montado
 *      dinamicamente, spread, chave computada). Falha alto e cedo, do jeito que a tarefa pede.
 *   3. PRODUÇÃO, em runtime — NUNCA lança: sanitiza e segue. Uma chamada de log não pode derrubar
 *      o app do usuário; o dado sensível é substituído antes de chegar ao coletor.
 *
 * A mensagem do `error` em si NÃO é sanitizada — só o `context`. Ver ressalva no README da fase.
 */
export function logError<T extends Record<string, unknown>>(
  scope: string,
  error: unknown,
  context?: T & SafeLogContext<T>,
): void {
  const forbidden: string[] = [];
  collectForbiddenKeys(context, 0, '', forbidden);

  if (forbidden.length > 0 && __DEV__) {
    throw new Error(
      `logError("${scope}"): contexto contém campo proibido (${forbidden.join(', ')}). ` +
        'Dado sensível de saúde e PII nunca podem ir para log ou Crashlytics (CLAUDE.md §4.5).',
    );
  }

  const safeContext = (forbidden.length > 0 ? removeForbiddenKeys(context, 0) : context) as
    | Record<string, unknown>
    | undefined;

  if (__DEV__) {
    console.error(`[${scope}]`, error, safeContext);
    return;
  }

  // No nativo isto entrega ao Crashlytics; na web o reporter injetado é um no-op declarado (ver
  // `setCrashReporter` acima). O `?.` cobre o intervalo antes do bootstrap rodar e o caso de
  // alguém ter chamado `setCrashReporter(null)`.
  crashReporter?.recordError(scope, error, safeContext ?? {});
}
