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
import java.nio.ByteBuffer

// Exclusão global, inclusive entre views desmontadas cujo ML Kit ainda usa o buffer.
// Todas as transições e callbacks são na main queue.
private object PhotoLease { var owner: AferiPhotoView? = null }

class AferiPhotoView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onStatus by EventDispatcher()
  private val preview = PreviewView(context)
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

  init { addView(preview, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)) }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    preview.layout(0, 0, right - left, bottom - top)
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
        @Suppress("DEPRECATION")
        val analysis = ImageAnalysis.Builder().setTargetResolution(Size(1280, 960))
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
          ownedBytes = null
          try {
            val p = frame.planes
            if (frame.format != ImageFormat.YUV_420_888 || p.size != 3) throw IllegalArgumentException("frame-format")
            ownedBytes = FrameBytes.nv21(width, height,
              p[0].buffer, p[0].rowStride, p[0].pixelStride,
              p[1].buffer, p[1].rowStride, p[1].pixelStride,
              p[2].buffer, p[2].rowStride, p[2].pixelStride)
          } catch (_: Exception) {
            settle(mapOf("code" to "frame-failed"))
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
        status("ready")
      } catch (_: Exception) { fail("camera-failed") }
    }, ContextCompat.getMainExecutor(context))
  }
  fun recognize(promise: Promise) {
    if (!active || frames == null || processing || requested || result != null) {
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
