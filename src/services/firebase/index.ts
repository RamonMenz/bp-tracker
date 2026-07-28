// O Metro resolve './firebase' para firebase.native.ts ou firebase.web.ts conforme a plataforma —
// é o que mantém a diferença de plataforma fora do código de aplicação (CLAUDE.md §3.3).
export { app, auth, firestore } from './firebase';
