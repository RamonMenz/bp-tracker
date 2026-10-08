/**
 * URL pública da política de privacidade (public/privacidade.html, servida pela Vercel).
 *
 * Constante, não variável de ambiente: a URL não é segredo, e uma variável a mais seria mais um
 * item a esquecer no EAS de produção — o link quebraria em silêncio.
 *
 * Placeholder deliberado até a política ser publicada (Prompt 1.2): o link abre um endereço que
 * não existe, deixando óbvio (em vez de fingir sucesso) que falta configurar.
 */
export const PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo';

/**
 * Versão da política que o usuário precisa ter aceitado (LGPD art. 11, I). Gravada junto com o
 * aceite em `users/{uid}.privacyConsent.version`. Quando a política mudar de forma relevante,
 * troque o valor — quem aceitou uma versão anterior passa pelo consentimento de novo. Acompanha a
 * data de vigência de public/privacidade.html. Máximo de 32 caracteres (firestore.rules).
 */
export const PRIVACY_POLICY_VERSION = '2026-10-01';
