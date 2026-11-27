package expo.modules.aferilocal

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Size
import android.view.ViewGroup.LayoutParams
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

// Todos os acessos ocorrem na main queue. Uma tarefa não cancelável impede outra
// câmera/instância de adquirir novo frame até o callback liberar o lease antigo.
private object CameraWork { var inFlight = false }

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
class AferiCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onStatus by EventDispatcher()
  private val preview = PreviewView(context)
  private val handler = Handler(Looper.getMainLooper())
  private var provider: ProcessCameraProvider? = null
  private var recognizer: TextRecognizer? = null
  private var analysis: ImageAnalysis? = null
  private var previewUseCase: Preview? = null
  private var active = false
  private var generation = 0
  private var pending: Promise? = null
  private var processing = false
  private var initializedMs = 0.0
  private var deadline: Runnable? = null
  var requestedActive = false
  var attemptId = 0

  init { addView(preview, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)) }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    preview.layout(0, 0, right - left, bottom - top)
  }

  fun setActive(value: Boolean) {
    if (value == active) return
    active = value
    generation++
    if (!value) {
      pending?.resolve(mapOf("code" to "cancelled")); pending = null
      deadline?.let { handler.removeCallbacks(it) }; deadline = null
      // Nunca fechar um frame que o ML Kit ainda está lendo.
      if (!processing) release()
      return
    }
    if (processing || CameraWork.inFlight) { active = false; onStatus(mapOf("status" to "camera-failed", "attemptId" to attemptId)); return }
    val epoch = generation
    val eventAttemptId = attemptId
    val started = SystemClock.elapsedRealtime()
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      if (!active || epoch != generation) return@addListener
      try {
        val owner = appContext.currentActivity as? LifecycleOwner
        if (owner == null) { failCamera(); return@addListener }
        val cameraProvider = future.get()
        provider = cameraProvider
        val surface = Preview.Builder().build().also { it.setSurfaceProvider(preview.surfaceProvider) }
        @Suppress("DEPRECATION")
        val frames = ImageAnalysis.Builder().setTargetResolution(Size(1280, 960))
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        previewUseCase = surface; analysis = frames
        frames.setAnalyzer(ContextCompat.getMainExecutor(context)) { frame ->
          val target = pending
          if (!active || target == null || processing) { frame.close(); return@setAnalyzer }
          pending = null; processing = true
          deadline?.let { handler.removeCallbacks(it) }; deadline = null
          val readingEpoch = generation
          val image = frame.image
          if (image == null) {
            frame.close(); processing = false; target.resolve(mapOf("code" to "camera-failed")); return@setAnalyzer
          }
          val start = SystemClock.elapsedRealtime()
          val capturedAtMs = System.currentTimeMillis()
          CameraWork.inFlight = true
          try {
            val rotation = frame.imageInfo.rotationDegrees
            val width = if (rotation % 180 == 0) frame.width else frame.height
            val height = if (rotation % 180 == 0) frame.height else frame.width
            recognizer!!.process(InputImage.fromMediaImage(image, rotation))
              .addOnSuccessListener { result ->
                if (!active || readingEpoch != generation) target.resolve(mapOf("code" to "cancelled"))
                else {
                  val tokens = result.textBlocks.flatMap { it.lines }.take(500).mapNotNull { line ->
                    val box = line.boundingBox ?: return@mapNotNull null
                    if (line.text.length > 500) return@mapNotNull null
                    mapOf("text" to line.text, "confidence" to null, "box" to mapOf(
                      "x" to (box.left.toDouble() / width).coerceIn(0.0, 1.0),
                      "y" to (box.top.toDouble() / height).coerceIn(0.0, 1.0),
                      "width" to (box.width().toDouble() / width).coerceIn(0.0, 1.0),
                      "height" to (box.height().toDouble() / height).coerceIn(0.0, 1.0)))
                  }
                  target.resolve(mapOf("kind" to "ocr", "coordinateSpace" to "upright-frame", "capturedAtMs" to capturedAtMs,
                    "tokens" to tokens, "initializationMs" to initializedMs,
                    "recognitionMs" to (SystemClock.elapsedRealtime() - start).toDouble()))
                }
              }
              .addOnFailureListener { target.resolve(mapOf("code" to "engine-failed")) }
              .addOnCompleteListener {
                frame.close(); processing = false; CameraWork.inFlight = false
                // Captura única: preview e reconhecedor não ficam ativos na revisão.
                active = false; generation++; release()
              }
          } catch (_: Exception) {
            frame.close(); processing = false; CameraWork.inFlight = false
            target.resolve(mapOf("code" to "engine-failed")); active = false; release()
          }
        }
        cameraProvider.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, surface, frames)
        initializedMs = (SystemClock.elapsedRealtime() - started).toDouble()
        onStatus(mapOf("status" to "ready", "attemptId" to eventAttemptId))
      } catch (_: Exception) { failCamera() }
    }, ContextCompat.getMainExecutor(context))
  }

  fun recognize(promise: Promise) {
    if (!active || analysis == null || processing || pending != null) {
      promise.resolve(mapOf("code" to "camera-failed")); return
    }
    pending = promise
    val timeout = Runnable {
      pending?.resolve(mapOf("code" to "timeout")); pending = null; setActive(false)
    }
    deadline = timeout; handler.postDelayed(timeout, 10000)
  }

  private fun failCamera() { active = false; generation++; release(); onStatus(mapOf("status" to "camera-failed", "attemptId" to attemptId)) }
  private fun release() {
    analysis?.clearAnalyzer()
    val useCases = listOfNotNull(analysis, previewUseCase)
    if (useCases.isNotEmpty()) provider?.unbind(*useCases.toTypedArray())
    analysis = null; previewUseCase = null; recognizer?.close(); recognizer = null
  }
}
