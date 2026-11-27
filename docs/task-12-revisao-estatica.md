# TASK-12 V1 — revisão estática do reconhecimento Android

| Classe | Achado |
|---|---|
| Risco de compilação | As assinaturas usadas em `SpeechRecognizer`, `RecognitionSupportCallback` e `RecognitionListener` correspondem à referência Android. O SDK de compilação deve ser 33 ou superior. A configuração de referência do autor usa SDK 36 e a compilação Kotlin segue pendente. |
| Risco de comportamento corrigido | A factory local exige registrar o listener antes de qualquer comando. O listener agora é registrado antes de `checkRecognitionSupport` e ignora resultados de fala fora da captura. A consulta continua usando seu callback próprio no executor principal. |
| Risco de comportamento | O serviço pode responder `ERROR_CANNOT_CHECK_SUPPORT` (14, API 33). Qualquer erro desse callback vira `language-unverified`, com zero início de escuta. API 31/32 tem factory local, mas carece dessa consulta. |
| Risco de comportamento | Um serviço local presente pode falhar ao iniciar, recusar o idioma ou competir pelo foco exclusivo de áudio. A API oferece suporte verificável por intenção, e o teste no aparelho precisa medir arranque, foco e liberação real do microfone. |
| Observação | Distingue-se ausência de serviço de ausência de pt-BR na lista instalada. A lista de idiomas online, suportados para download ou pendentes não comprova prontidão. O probe inicial `ready` só permite avançar à preparação, cujo `ready` comprova o pacote. |
| Observação | Na captura, 9 vira `permission-denied`, 6/7 viram `no-result`, 12/13 viram `model-missing`, 8 vira `resource-busy`, 3/5 viram `interrupted` e os demais (inclusive rede/servidor) viram `engine-failed`. O código 12 indica idioma não suportado pelo serviço; 13 indica idioma suportado, mas indisponível. Ambos bloqueiam a tentativa, sem promessa de que existe pacote para instalar. |
| Observação | `triggerModelDownload(Intent)` existe desde API 33 e o overload com executor e listener desde API 34. O código 15 indica que o serviço não oferece eventos de download. A avaliação Android apenas consulta o estado do modelo. |
| Observação | O módulo Expo usa a fila principal e a visibilidade de `RecognitionService` está declarada no manifesto. O adaptador JS valida respostas, aguarda liberação e recebe só a transcrição final transitória no fluxo de revisão. Os mocks cobrem a decisão de não iniciar sem prontidão e o descarte após cancelamento. A ordem das chamadas Kotlin foi conferida por revisão, e precisa de confirmação em execução. |

Fontes oficiais: [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer),
[RecognitionSupport](https://developer.android.com/reference/android/speech/RecognitionSupport) e
[RecognitionSupportCallback](https://developer.android.com/reference/android/speech/RecognitionSupportCallback).
