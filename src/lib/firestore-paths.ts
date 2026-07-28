// Fonte única de verdade dos caminhos de coleção — nenhum outro arquivo deve montar
// um caminho do Firestore como string literal (CLAUDE.md §3.2).
export function userDocPath(uid: string): string {
  return `users/${uid}`;
}

export function readingsCollectionPath(uid: string): string {
  return `users/${uid}/readings`;
}

export function readingDocPath(uid: string, readingId: string): string {
  return `users/${uid}/readings/${readingId}`;
}
