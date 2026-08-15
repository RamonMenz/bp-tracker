// Ponto de entrada único que o Firebase CLI carrega no deploy — cada export nomeado aqui vira
// uma Cloud Function publicada. Sem isso (ou com um export faltando), `firebase deploy --only
// functions` simplesmente não teria o que publicar (RELEASE_CHECKLIST.md).
export { dispatchReminders } from './scheduler/dispatchReminders';
export { onDeviceWrite } from './triggers/onDeviceWrite';
export { onUserDelete } from './triggers/onUserDelete';
export { onUserSettingsWrite } from './triggers/onUserSettingsWrite';
