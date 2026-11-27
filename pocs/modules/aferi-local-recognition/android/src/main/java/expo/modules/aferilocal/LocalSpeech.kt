package expo.modules.aferilocal

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognitionSupport
import android.speech.RecognitionSupportCallback
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise

// Nenhum gravador, arquivo/URI, biblioteca de rede ou log de conteúdo.
class LocalSpeech(private val context: Context) {
  private val handler = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var pending: Promise? = null
  private var deadline: Runnable? = null
  private var verified = false
  private var generation = 0
  private var endedAt = 0L
  private var startedAt = 0L
  private var capturedAtMs = 0L

  private fun intent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
  }

  fun probe(promise: Promise) {
    cancel(); verified = false
    if (Build.VERSION.SDK_INT < 31 || !SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
      promise.resolve(mapOf("code" to "local-unavailable")); return
    }
    // API 31/32 possui factory local, mas sem checkRecognitionSupport não afirmamos pt-BR instalado.
    if (Build.VERSION.SDK_INT < 33) { promise.resolve(mapOf("code" to "language-unverified")); return }
    pending = promise
    val epoch = generation
    try {
      val local = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
      recognizer = local
      timeout(10000)
      local.checkRecognitionSupport(intent(), ContextCompat.getMainExecutor(context), object : RecognitionSupportCallback {
        override fun onSupportResult(support: RecognitionSupport) {
          if (epoch != generation) return
          verified = support.installedOnDeviceLanguages.any { it.equals("pt-BR", ignoreCase = true) }
          complete(mapOf("code" to if (verified) "ready" else "model-missing"))
        }
        override fun onError(error: Int) { if (epoch == generation) complete(mapOf("code" to "language-unverified")) }
      })
    } catch (_: Exception) { complete(mapOf("code" to "local-unavailable")) }
  }

  fun start(promise: Promise) {
    if (!verified || Build.VERSION.SDK_INT < 33) { promise.resolve(mapOf("code" to "language-unverified")); return }
    cancel()
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      promise.resolve(mapOf("code" to "permission-denied")); return
    }
    val epoch = generation
    pending = promise; startedAt = SystemClock.elapsedRealtime(); endedAt = 0; capturedAtMs = System.currentTimeMillis()
    try {
      val local = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
      recognizer = local
      local.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() { endedAt = SystemClock.elapsedRealtime() }
        override fun onPartialResults(partialResults: Bundle?) = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit
        override fun onError(error: Int) {
          if (epoch != generation) return
          val code = when (error) {
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission-denied"
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-result"
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "model-missing"
            else -> "engine-failed"
          }
          complete(mapOf("code" to code))
        }
        override fun onResults(results: Bundle?) {
          if (epoch != generation) return
          val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()
          if (text.isNullOrEmpty() || text.length > 4096) complete(mapOf("code" to "no-result"))
          else complete(mapOf("text" to text, "capturedAtMs" to capturedAtMs, "recognitionMs" to
            (SystemClock.elapsedRealtime() - if (endedAt > 0) endedAt else startedAt).toDouble()))
        }
      })
      timeout(30000); local.startListening(intent())
    } catch (_: Exception) { complete(mapOf("code" to "engine-failed")) }
  }

  fun finish() {
    endedAt = SystemClock.elapsedRealtime()
    try { recognizer?.stopListening() } catch (_: Exception) { complete(mapOf("code" to "engine-failed")) }
  }
  fun cancel() { generation++; complete(mapOf("code" to "cancelled")) }
  private fun timeout(ms: Long) {
    val task = Runnable { generation++; complete(mapOf("code" to "timeout")) }
    deadline = task; handler.postDelayed(task, ms)
  }
  private fun complete(result: Map<String, Any>) {
    val target = pending; pending = null
    deadline?.let { handler.removeCallbacks(it) }; deadline = null
    val engine = recognizer; recognizer = null
    // Uma falha em cancel não pode impedir a tentativa independente de destroy.
    try { engine?.cancel() } catch (_: Exception) { /* continuar liberação, sem erro bruto */ }
    try { engine?.destroy() } catch (_: Exception) { /* instância removida; inspeção real continua obrigatória */ }
    target?.resolve(result)
  }
}
