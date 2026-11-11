package expo.modules.aferiphoto

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.os.Handler
import android.os.Looper
import android.util.Size
import android.view.ViewGroup.LayoutParams
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.Observer
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.nio.ByteBuffer

// Exclusão global, inclusive entre views desmontadas cujo ML Kit ainda usa o buffer.
// Todas as transições e callbacks são na main queue.
private object PhotoLease { var owner: AferiPhotoView? = null }

class AferiPhotoView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // PreviewView adiciona TextureView depois do bind. O requestLayout desses
  // filhos precisa medir/layout Android, mesmo sem outro commit de layout Yoga.
  override val shouldUseAndroidLayout: Boolean = true
  private val onStatus by EventDispatcher()
  private val preview = PreviewView(context)
  private var previewObserver: Observer<PreviewView.StreamState>? = null
  private var previewReady = false
  private val handler = Handler(Looper.getMainLooper())
  private var provider: ProcessCameraProvider? = null
  private var frames: ImageAnalysis? = null
  private var surface: Preview? = null
  private var recognizer: TextRecognizer? = null
  private var active = false
  private var disposed = false
  private var generation = 0
  private var boundAttempt = -1
  private var endedAttempt = -2
  private var processing = false
  private var requested = false
  private var result: Promise? = null
  private var frameDeadline: Runnable? = null
  private var ownedBytes: ByteArray? = null
  private val closing = mutableListOf<Promise>()
  var requestedActive = false
  var attemptId = 0

  init {
    // TextureView compoe o preview dentro da hierarquia React/ScrollView.
    preview.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    addView(preview, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }
  private fun status(code: String) {
    if (!disposed) onStatus(mapOf("status" to code, "attemptId" to boundAttempt))
  }
  private fun settle(value: Map<String, Any?>) { val target = result; result = null; target?.resolve(value) }
  private fun clearDeadline() { frameDeadline?.let { handler.removeCallbacks(it) }; frameDeadline = null }

  fun applyProps() {
    if (boundAttempt != attemptId) { cancel(); boundAttempt = attemptId }
    if (requestedActive) open() else cancel()
  }
  private fun open() {
    if (disposed || active || endedAttempt == boundAttempt) return
    if (PhotoLease.owner != null) { status("resource-busy"); return }
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      status("permission-denied"); return
    }
    PhotoLease.owner = this
    active = true
    val epoch = ++generation
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      if (!active || generation != epoch || disposed) return@addListener
      try {
        val owner = appContext.currentActivity as? LifecycleOwner
        if (owner == null) { fail("camera-failed"); return@addListener }
        provider = future.get()
        surface = Preview.Builder().build().also { it.setSurfaceProvider(preview.surfaceProvider) }
        // O tamanho alvo antigo era uma preferencia, nao um teto. Filtrar antes
        // do bind para nunca selecionar um quadro que o copiador recusaria.
        val selector = ResolutionSelector.Builder()
          .setResolutionStrategy(ResolutionStrategy(Size(1280, 960), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
          .setResolutionFilter { sizes, _ -> sizes.filter { FrameBytes.acceptsDimensions(it.width, it.height) } }
          .build()
        val analysis = ImageAnalysis.Builder().setResolutionSelector(selector)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
        frames = analysis
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { frame ->
          if (!active || !requested || processing) { frame.close(); return@setAnalyzer }
          requested = false
          clearDeadline()
          val width = frame.width
          val height = frame.height
          val rotation = frame.imageInfo.rotationDegrees
          val capturedAtMs = System.currentTimeMillis()
          // Somente metadados tecnicos; nunca bytes, pixels ou texto reconhecido.
          val diagnostic = mutableMapOf<String, Any?>("revision" to "frame-1",
            "width" to width, "height" to height, "format" to frame.format,
            "rotation" to rotation, "maxPixels" to FrameBytes.MAX_FRAME_PIXELS)
          ownedBytes = null
          try {
            val p = frame.planes
            diagnostic["planeCount"] = p.size
            diagnostic["planes"] = p.take(3).map { plane ->
              val buffer = plane.buffer
              mapOf("rowStride" to plane.rowStride, "pixelStride" to plane.pixelStride,
                "position" to buffer.position(), "limit" to buffer.limit())
            }
            if (frame.format != ImageFormat.YUV_420_888 || p.size != 3) throw IllegalArgumentException("frame-format")
            ownedBytes = FrameBytes.nv21(width, height,
              p[0].buffer, p[0].rowStride, p[0].pixelStride,
              p[1].buffer, p[1].rowStride, p[1].pixelStride,
              p[2].buffer, p[2].rowStride, p[2].pixelStride)
          } catch (error: Exception) {
            diagnostic["reason"] = when (error.message) {
              "frame-format" -> "frame-format"
              "frame-size" -> "frame-size"
              "frame-stride" -> "frame-stride"
              "frame-plane" -> "frame-plane"
              else -> "frame-copy"
            }
            settle(mapOf("code" to "frame-failed", "frameDiagnostic" to diagnostic.toMap()))
          } finally { frame.close() }
          // O ImageProxy já está fechado. A câmera pode ser liberada imediatamente,
          // pois o ML Kit lerá apenas nossa cópia NV21, sem URI/arquivo.
          if (!stopCamera()) { ownedBytes = null; fail("cleanup-failed"); return@setAnalyzer }
          val bytes = ownedBytes
          if (bytes == null) { fail("frame-failed"); return@setAnalyzer }
          processing = true
          val recognitionEpoch = generation
          try {
            val image = InputImage.fromByteBuffer(ByteBuffer.wrap(bytes), width, height, rotation, InputImage.IMAGE_FORMAT_NV21)
            recognizer!!.process(image)
              .addOnSuccessListener(ContextCompat.getMainExecutor(context)) { text ->
                if (active && recognitionEpoch == generation && !disposed) {
                  val w = if (rotation % 180 == 0) width else height
                  val h = if (rotation % 180 == 0) height else width
                  val tokens = text.textBlocks.flatMap { it.lines }.take(500).mapNotNull { line ->
                    val box = line.boundingBox ?: return@mapNotNull null
                    if (line.text.length > 500) return@mapNotNull null
                    val x = (box.left.toDouble() / w).coerceIn(0.0, 1.0)
                    val y = (box.top.toDouble() / h).coerceIn(0.0, 1.0)
                    mapOf("text" to line.text, "confidence" to null, "box" to mapOf(
                      "x" to x, "y" to y,
                      "width" to (box.width().toDouble() / w).coerceIn(0.0, 1.0 - x),
                      "height" to (box.height().toDouble() / h).coerceIn(0.0, 1.0 - y)))
                  }
                  settle(mapOf("kind" to "ocr", "coordinateSpace" to "upright-frame",
                    "capturedAtMs" to capturedAtMs, "tokens" to tokens))
                }
              }
              .addOnFailureListener(ContextCompat.getMainExecutor(context)) { settle(mapOf("code" to "engine-failed")) }
              .addOnCompleteListener(ContextCompat.getMainExecutor(context)) {
                processing = false; ownedBytes = null; active = false; generation++
                releaseIdle()
              }
          } catch (_: Exception) {
            processing = false; ownedBytes = null
            fail("engine-failed")
          }
        }
        provider!!.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, surface!!, analysis)
        // Em modo COMPATIBLE, STREAMING confirma que o preview iniciou.
        // Bind concluido sozinho nao garante imagem e nao habilita o obturador.
        val observer = Observer<PreviewView.StreamState> { state ->
          if (active && generation == epoch && !disposed) {
            val wasReady = previewReady
            previewReady = state == PreviewView.StreamState.STREAMING
            if (previewReady && !wasReady) status("ready")
          }
        }
        previewObserver = observer
        preview.previewStreamState.observe(owner, observer)
      } catch (_: Exception) { fail("camera-failed") }
    }, ContextCompat.getMainExecutor(context))
  }
  fun recognize(promise: Promise) {
    if (!active || !previewReady || frames == null || processing || requested || result != null) {
      promise.resolve(mapOf("code" to "resource-busy")); return
    }
    result = promise; requested = true
    endedAttempt = boundAttempt
    val timeout = Runnable { settle(mapOf("code" to "timeout")); cancel() }
    frameDeadline = timeout; handler.postDelayed(timeout, 10000)
  }
  fun cancel(promise: Promise? = null) {
    if (active || processing || requested) endedAttempt = boundAttempt
    active = false; generation++; requested = false; clearDeadline()
    settle(mapOf("code" to "cancelled"))
    stopCamera()
    if (promise != null) closing.add(promise)
    // Não fechar o reconhecedor nem perder a referência do buffer durante leitura.
    if (!processing) { ownedBytes = null; releaseIdle() }
  }
  fun destroyCapture() { disposed = true; cancel() }
  private fun fail(code: String) { settle(mapOf("code" to code)); cancel(); status(code) }
  private fun stopCamera(): Boolean {
    return try {
      previewObserver?.let { preview.previewStreamState.removeObserver(it) }
      previewObserver = null; previewReady = false
      frames?.clearAnalyzer()
      val uses = listOfNotNull(frames, surface)
      if (uses.isNotEmpty()) provider?.unbind(*uses.toTypedArray())
      frames = null; surface = null; provider = null
      true
    } catch (_: Exception) { false }
  }
  private fun releaseIdle() {
    var released = stopCamera()
    try { recognizer?.close(); recognizer = null } catch (_: Exception) { released = false }
    if (released && PhotoLease.owner === this) PhotoLease.owner = null
    if (!released) status("cleanup-failed")
    val waiters = closing.toList(); closing.clear()
    waiters.forEach { it.resolve(released) }
  }
}
