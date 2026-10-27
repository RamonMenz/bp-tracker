package expo.modules.aferivoice

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognitionSupport
import android.speech.RecognitionSupportCallback
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise

// Base TASK-05 (7fbe137), isolada da câmera. Sem gravador, URI/arquivo, rede ou logger.
class LocalSpeech(private val context: Context, private val status: (Int, String) -> Unit) {
  companion object { private var owner: LocalSpeech? = null }
  private val handler = Handler(Looper.getMainLooper())
  private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var recognizer: SpeechRecognizer? = null
  private var focus: AudioFocusRequest? = null
  private var pending: Promise? = null
  private var deadline: Runnable? = null
  private var activeId = 0
  private var phase = "idle"
  private var verified = false
  private var cleanupBlocked = false
  private var capturedAtMs = 0L
  private var finishRequested = false

  fun availability(): String = try {
    when {
      Build.VERSION.SDK_INT < 31 -> "local-unavailable"
      !SpeechRecognizer.isOnDeviceRecognitionAvailable(context) -> "local-unavailable"
      Build.VERSION.SDK_INT < 33 -> "language-unverified"
      else -> "ready" // Somente API local. Idioma instalado é checado em prepare.
    }
  } catch (_: Exception) { "local-unavailable" }

  private fun intent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    // Não usa EXTRA_PREFER_OFFLINE nem factory genérica/remota.
  }
  private fun current(id: Int) = activeId == id && id > 0 && !cleanupBlocked
  private fun timeout(ms: Long) {
    deadline?.let { handler.removeCallbacks(it) }
    val id = activeId
    val task = Runnable { if (current(id)) complete(mapOf("code" to "timeout")) }
    deadline = task; handler.postDelayed(task, ms)
  }
  fun prepare(id: Int, promise: Promise) {
    if (cleanupBlocked) { promise.resolve(mapOf("code" to "cleanup-failed")); return }
    if (id <= 0 || owner != null || activeId != 0) { promise.resolve(mapOf("code" to "resource-busy")); return }
    val available = availability()
    if (available != "ready") { promise.resolve(mapOf("code" to available)); return }
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      promise.resolve(mapOf("code" to "permission-denied")); return
    }
    owner = this; activeId = id; phase = "preparing"; pending = promise; verified = false
    try {
      if (Build.VERSION.SDK_INT < 33) { complete(mapOf("code" to "language-unverified")); return }
      val local = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
      recognizer = local; timeout(10000)
      local.checkRecognitionSupport(intent(), ContextCompat.getMainExecutor(context), object : RecognitionSupportCallback {
        override fun onSupportResult(support: RecognitionSupport) {
          if (!current(id) || phase != "preparing") return
          try {
            verified = support.installedOnDeviceLanguages.any { it.replace('_', '-').equals("pt-BR", ignoreCase = true) }
            if (!verified) { complete(mapOf("code" to "model-missing")); return }
            phase = "prepared"; timeout(5000)
            val target = pending; pending = null; target?.resolve(mapOf("code" to "ready"))
          } catch (_: Exception) { complete(mapOf("code" to "language-unverified")) }
        }
        override fun onError(error: Int) { if (current(id) && phase == "preparing") complete(mapOf("code" to "language-unverified")) }
      })
    } catch (_: Exception) { complete(mapOf("code" to "local-unavailable")) }
  }
  fun start(id: Int, promise: Promise) {
    if (!current(id) || phase != "prepared" || !verified) { promise.resolve(mapOf("code" to "language-unverified")); return }
    pending = promise
    if (availability() != "ready") { complete(mapOf("code" to "local-unavailable")); return }
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      complete(mapOf("code" to "permission-denied")); return
    }
    try {
      val local = recognizer ?: throw IllegalStateException()
      phase = "opening"; finishRequested = false
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setOnAudioFocusChangeListener({ change ->
          if (current(id) && change != AudioManager.AUDIOFOCUS_GAIN) complete(mapOf("code" to "interrupted"))
        }, handler).build()
      focus = request
      if (audio.requestAudioFocus(request) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        complete(mapOf("code" to "interrupted")); return
      }
      if (!current(id)) return
      local.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) { if (current(id) && phase == "opening") { phase = "listening"; status(id, "listening") } }
        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onPartialResults(partialResults: Bundle?) = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit
        override fun onEndOfSpeech() {
          if (current(id)) { phase = "recognizing"; status(id, "recognizing"); timeout(10000) }
        }
        override fun onError(error: Int) {
          if (!current(id)) return
          val code = when (error) {
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission-denied"
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-result"
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "model-missing"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "resource-busy"
            SpeechRecognizer.ERROR_AUDIO, SpeechRecognizer.ERROR_CLIENT -> "interrupted"
            else -> "engine-failed"
          }
          complete(mapOf("code" to code))
        }
        override fun onResults(results: Bundle?) {
          if (!current(id)) return
          // Não seleciona silenciosamente entre hipóteses distintas, mesmo com MAX_RESULTS=1.
          try {
            val texts = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.map { it.trim() }?.filter { it.isNotEmpty() }?.distinct()
            val text = texts?.singleOrNull()
            if (texts != null && texts.size > 1) complete(mapOf("code" to "ambiguous-result"))
            else if (text.isNullOrEmpty() || text.length > 2000) complete(mapOf("code" to "no-result"))
            else complete(mapOf("kind" to "transcript", "locale" to "pt-BR", "final" to true,
              "capturedAtMs" to capturedAtMs.toDouble(), "text" to text))
          } catch (_: Exception) { complete(mapOf("code" to "engine-failed")) }
        }
      })
      if (!current(id)) return
      capturedAtMs = System.currentTimeMillis(); timeout(30000)
      local.startListening(intent())
    } catch (_: Exception) { complete(mapOf("code" to "engine-failed")) }
  }
  fun finish(id: Int): Boolean {
    if (!current(id) || finishRequested || phase !in listOf("opening", "listening", "recognizing")) return false
    finishRequested = true
    return try {
      phase = "recognizing"; recognizer?.stopListening()
      if (current(id)) { timeout(10000); status(id, "recognizing") }
      true
    } catch (_: Exception) { complete(mapOf("code" to "engine-failed")); false }
  }
  fun cancel(id: Int): Boolean {
    if (cleanupBlocked) return false
    if (current(id)) complete(mapOf("code" to "cancelled"))
    return !cleanupBlocked // Callback de tentativa antiga nunca fecha uma nova.
  }
  fun interrupt() {
    val stop = Runnable { if (activeId != 0) complete(mapOf("code" to "interrupted")) }
    if (Looper.myLooper() == Looper.getMainLooper()) stop.run() else handler.post(stop)
  }
  private fun complete(result: Map<String, Any>) {
    val target = pending; pending = null
    activeId = 0; verified = false; capturedAtMs = 0L; finishRequested = false
    phase = "closing" // Invalida antes de cancel/destroy reentrantes.
    deadline?.let { handler.removeCallbacks(it) }; deadline = null
    val engine = recognizer; recognizer = null
    val request = focus; focus = null
    var clean = true
    try { engine?.cancel() } catch (_: Exception) { clean = false }
    try { engine?.destroy() } catch (_: Exception) { clean = false }
    try { request?.let { audio.abandonAudioFocusRequest(it) } } catch (_: Exception) { clean = false }
    cleanupBlocked = !clean; phase = if (clean) "idle" else "blocked"
    if (clean && owner === this) owner = null
    // Resolve somente depois de tentar todos os descartes. Falha bloqueia lease global.
    target?.resolve(if (clean) result else mapOf("code" to "cleanup-failed"))
  }
}
