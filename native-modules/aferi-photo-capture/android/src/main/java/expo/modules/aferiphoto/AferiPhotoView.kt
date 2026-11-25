package expo.modules.aferiphoto

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.os.Handler
import android.os.Looper
import android.util.Size
import android.view.ViewGroup.LayoutParams
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
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
import com.google.mlkit.vision.text.Text as RecognizedText
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.nio.ByteBuffer
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// Exclusão global, inclusive entre views desmontadas cujo ML Kit ainda usa o buffer.
// Todas as transições e callbacks são na main queue.
private object PhotoLease { var owner: AferiPhotoView? = null }

class AferiPhotoView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // PreviewView adiciona TextureView depois do bind. O requestLayout desses
  // filhos precisa medir/layout Android, mesmo sem outro commit de layout Yoga.
  override val shouldUseAndroidLayout: Boolean = true
  private val onStatus by EventDispatcher()
  private val preview = PreviewView(context)
  private val guide = CaptureGuide(context) { maybeReady() }
  private val previewLayer = FrameLayout(context)
  private var previewObserver: Observer<PreviewView.StreamState>? = null
  private var previewReady = false
  private var readyAnnounced = false
  private var boundComparison = false
  private var boundViewWidth = 0
  private var boundViewHeight = 0
  private var boundRotation = 0
  private var waitingForLayout = false
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
  private var captureRun: CaptureRun? = null
  private var worker: ExecutorService? = null
  private var originalObservation: Map<String, Any?>? = null
  private val closing = mutableListOf<Promise>()
  var requestedActive = false
  var attemptId = 0
  var requestedComparison = false

  init {
    // TextureView compoe o preview dentro da hierarquia React/ScrollView.
    preview.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    preview.scaleType = PreviewView.ScaleType.FILL_CENTER
    // ExpoView é LinearLayout: a guia e o PreviewView precisam do MESMO FrameLayout.
    previewLayer.addView(preview, FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    previewLayer.addView(guide, FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    addView(previewLayer, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    if (active && boundComparison && !sameViewGeometry()) fail("geometry-unavailable")
    else if (requestedActive && boundComparison && waitingForLayout && !active && !disposed) open()
  }
  private fun sameViewGeometry() = preview.width == boundViewWidth && preview.height == boundViewHeight
    && preview.display?.rotation == boundRotation
  private fun maybeReady() {
    if (active && previewReady && !readyAnnounced && (!boundComparison || guide.drawn != null)) {
      readyAnnounced = true; status("ready")
    }
  }
  private fun status(code: String) {
    if (!disposed) onStatus(mapOf("status" to code, "attemptId" to boundAttempt))
  }
  private fun settle(value: Map<String, Any?>) { val target = result; result = null; target?.resolve(value) }
  private fun clearDeadline() { frameDeadline?.let { handler.removeCallbacks(it) }; frameDeadline = null }

  fun applyProps() {
    if (boundAttempt != attemptId || boundComparison != requestedComparison) {
      cancel(); boundAttempt = attemptId; boundComparison = requestedComparison
    }
    if (requestedActive) open() else cancel()
  }
  private fun open() {
    if (disposed || active || endedAttempt == boundAttempt) return
    if (boundComparison && (preview.width <= 0 || preview.height <= 0 || preview.display == null)) {
      waitingForLayout = true; return
    }
    waitingForLayout = false
    if (PhotoLease.owner != null) { status("resource-busy"); return }
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      status("permission-denied"); return
    }
    // Congelar antes da solicitação assíncrona: onLayout pode ocorrer enquanto o provider ainda abre.
    boundViewWidth = preview.width; boundViewHeight = preview.height
    boundRotation = preview.display?.rotation ?: 0
    PhotoLease.owner = this
    active = true
    val epoch = ++generation
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      if (!active || generation != epoch || disposed) return@addListener
      if (boundComparison && !sameViewGeometry()) { fail("geometry-unavailable"); return@addListener }
      try {
        val owner = appContext.currentActivity as? LifecycleOwner
        if (owner == null) { fail("camera-failed"); return@addListener }
        provider = future.get()
        val previewBuilder = Preview.Builder()
        if (boundComparison) previewBuilder.setTargetRotation(boundRotation)
        surface = previewBuilder.build().also { it.setSurfaceProvider(preview.surfaceProvider) }
        // O tamanho alvo antigo era uma preferencia, nao um teto. Filtrar antes
        // do bind para nunca selecionar um quadro que o copiador recusaria.
        val selector = ResolutionSelector.Builder()
          .setResolutionStrategy(ResolutionStrategy(Size(1280, 960), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
          .setResolutionFilter { sizes, _ -> sizes.filter { FrameBytes.acceptsDimensions(it.width, it.height) } }
          .build()
        val analysisBuilder = ImageAnalysis.Builder().setResolutionSelector(selector)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        if (boundComparison) analysisBuilder.setTargetRotation(boundRotation)
        val analysis = analysisBuilder.build()
        frames = analysis
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { frame ->
          if (!active || processing) { frame.close(); return@setAnalyzer }
          if (!requested) {
            try {
              if (boundComparison) {
                if (!sameViewGeometry()) fail("geometry-unavailable")
                else if (guide.drawn == null) {
                  try { guide.show(CaptureGuide.project(frame, preview)) }
                  catch (_: Exception) { /* Ainda sem transformação: não publicar ready. */ }
                }
              }
            } finally { frame.close() }
            return@setAnalyzer
          }
          requested = false
          clearDeadline()
          val width = frame.width
          val height = frame.height
          val rotation = frame.imageInfo.rotationDegrees
          val capturedAtMs = System.currentTimeMillis()
          var frameGeometry: Map<String, Any?>? = null
          var plan: FrameTransform.Plan? = null
          // Somente metadados tecnicos; nunca bytes, pixels ou texto reconhecido.
          val diagnostic = mutableMapOf<String, Any?>("revision" to "frame-1",
            "width" to width, "height" to height, "format" to frame.format,
            "rotation" to rotation, "maxPixels" to FrameBytes.MAX_FRAME_PIXELS)
          ownedBytes = null
          try {
            if (boundComparison) {
              if (!sameViewGeometry() || guide.drawn?.matches(CaptureGuide.project(frame, preview)) != true) {
                throw IllegalArgumentException("guide-unavailable")
              }
              plan = guide.drawn
            }
            // Diagnóstico opcional dentro do try/finally que fecha o ImageProxy.
            // Uma falha de metadados não muda a cópia/reconhecimento nem expõe erro.
            frameGeometry = try {
              val previewSize = surface?.resolutionInfo?.resolution
              val crop = frame.cropRect
              mapOf("width" to width, "height" to height,
                "rotation" to rotation, "cropMatchesBuffer" to (crop.left == 0 && crop.top == 0 && crop.right == width && crop.bottom == height),
                "mapping" to if (plan != null) "shared-viewport-roi" else "unavailable",
                "previewViewWidth" to preview.width, "previewViewHeight" to preview.height,
                "previewBufferWidth" to previewSize?.width, "previewBufferHeight" to previewSize?.height)
            } catch (_: Exception) { null } // Projeção JS informa geometria indisponível.
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
            settle(if (boundComparison && (plan == null || error.message == "guide-unavailable"))
              mapOf("code" to "geometry-unavailable")
            else mapOf("code" to "frame-failed", "frameDiagnostic" to diagnostic.toMap()))
          } finally { frame.close() }
          // O ImageProxy já está fechado. A câmera pode ser liberada imediatamente,
          // pois o ML Kit lerá apenas nossa cópia NV21, sem URI/arquivo.
          if (!stopCamera()) { ownedBytes = null; fail("cleanup-failed"); return@setAnalyzer }
          val bytes = ownedBytes
          if (bytes == null) { fail("frame-failed"); return@setAnalyzer }
          processing = true
          try {
            val run = CaptureRun(bytes, plan)
            captureRun = run; ownedBytes = null // Transferência de ownership, sem cópia adicional.
            startPass(run, false, width, height, rotation, capturedAtMs, frameGeometry, generation)
          } catch (_: Exception) { processing = false; ownedBytes = null; fail("engine-failed") }
        }
        if (boundComparison) {
          val viewport = preview.viewPort ?: throw IllegalArgumentException("guide-unavailable")
          val group = UseCaseGroup.Builder().setViewPort(viewport).addUseCase(surface!!).addUseCase(analysis).build()
          provider!!.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, group)
        } else provider!!.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, surface!!, analysis)
        // Em modo COMPATIBLE, STREAMING confirma que o preview iniciou.
        // Bind concluido sozinho nao garante imagem e nao habilita o obturador.
        val observer = Observer<PreviewView.StreamState> { state ->
          if (active && generation == epoch && !disposed) {
            previewReady = state == PreviewView.StreamState.STREAMING
            maybeReady()
          }
        }
        previewObserver = observer
        preview.previewStreamState.observe(owner, observer)
      } catch (_: Exception) { fail("camera-failed") }
    }, ContextCompat.getMainExecutor(context))
  }
  private fun current(run: CaptureRun, epoch: Int) = captureRun === run && active && !disposed
    && generation == epoch && !run.isCancelled

  private fun observation(text: RecognizedText, width: Int, height: Int, rotation: Int,
    capturedAtMs: Long, geometry: Map<String, Any?>?, plan: FrameTransform.Plan?): Map<String, Any?> {
    val w = if (rotation % 180 == 0) width else height
    val h = if (rotation % 180 == 0) height else width
    val policy = OcrLinePolicy()
    policy.observeSdkText(text.text)
    val tokens = text.textBlocks.asSequence().onEach { policy.observeBlockText(it.text) }
      .flatMap { it.lines.asSequence() }.mapNotNull { line ->
        val content = line.text
        val box = line.boundingBox
        if (!policy.accept(content, box != null) || box == null) return@mapNotNull null
        val normalized = if (plan != null) plan.toSourceBox(box.left.toDouble(), box.top.toDouble(), box.right.toDouble(), box.bottom.toDouble())
        else {
          val x = (box.left.toDouble() / w).coerceIn(0.0, 1.0)
          val y = (box.top.toDouble() / h).coerceIn(0.0, 1.0)
          doubleArrayOf(x, y, (box.width().toDouble() / w).coerceIn(0.0, 1.0 - x),
            (box.height().toDouble() / h).coerceIn(0.0, 1.0 - y))
        }
        mapOf("text" to content, "confidence" to null, "box" to mapOf(
          "x" to normalized[0], "y" to normalized[1], "width" to normalized[2], "height" to normalized[3]))
      }.toList()
    return mapOf("kind" to "ocr", "coordinateSpace" to "upright-frame", "capturedAtMs" to capturedAtMs,
      "tokens" to tokens, "bridgeDiagnostic" to (policy.diagnostic() + ("frame" to geometry)))
  }

  private fun startPass(run: CaptureRun, processed: Boolean, width: Int, height: Int, rotation: Int,
    capturedAtMs: Long, geometry: Map<String, Any?>?, epoch: Int) {
    if (!current(run, epoch)) { run.cancel(); if (run.isDone) finishRun(run); return }
    val bytes = if (processed) run.beginProcessed() else run.beginOriginal()
    if (bytes == null) { finishRun(run); return }
    var acceptedBySdk = false
    try {
      val image = InputImage.fromByteBuffer(ByteBuffer.wrap(bytes), width, height, rotation, InputImage.IMAGE_FORMAT_NV21)
      val task = recognizer!!.process(image)
      acceptedBySdk = true
      // Completion do SDK é a única transição que libera um buffer em voo ou permite a próxima passagem.
      task.addOnCompleteListener(ContextCompat.getMainExecutor(context)) { completed ->
        if (processed) run.completeProcessed() else run.completeOriginal()
        if (!current(run, epoch)) { finishRun(run); return@addOnCompleteListener }
        if (!completed.isSuccessful) { fail("engine-failed"); return@addOnCompleteListener }
        try {
          val output = observation(completed.result, width, height, rotation, capturedAtMs, geometry, if (processed) run.plan else null)
          if (run.plan == null) { settle(output); finishRun(run) }
          else if (processed) {
            settle(mapOf("kind" to "photo-comparison", "revision" to FrameTransform.REVISION,
              "original" to originalObservation, "processed" to output,
              "transformDiagnostic" to transformDiagnostic(run.plan)))
            finishRun(run)
          } else {
            originalObservation = output
            // Post separado: cancelamento pode impedir trabalho/segunda chamada entre as passagens.
            handler.post { transformThenProcess(run, capturedAtMs, geometry, epoch) }
          }
        } catch (_: Exception) { fail("engine-failed") }
      }
    } catch (_: Exception) {
      if (!acceptedBySdk) {
        if (processed) run.completeProcessed() else run.completeOriginal()
        fail("engine-failed")
      } else {
        // Registro de listener falhou após aceitação: não presumir completion ou liberar RAM em uso.
        settle(mapOf("code" to "cleanup-failed")); active = false; generation++; run.cancel(); status("cleanup-failed")
      }
    }
  }
  private fun transformThenProcess(run: CaptureRun, capturedAtMs: Long, geometry: Map<String, Any?>?, epoch: Int) {
    if (captureRun !== run) return
    if (!current(run, epoch)) { run.cancel(); if (run.isDone) finishRun(run); return }
    if (!run.beginTransform()) { finishRun(run); return }
    val source = run.transformSource()
    try {
      val executor = worker ?: Executors.newSingleThreadExecutor().also { worker = it }
      executor.execute {
        val transformed = try { FrameTransform.nv21(source, run.plan) { run.isCancelled } } catch (_: Exception) { null }
        handler.post {
          if (captureRun !== run) return@post
          try { run.completeTransform(transformed) }
          catch (_: Exception) { run.completeTransform(null); fail("frame-failed"); return@post }
          if (!current(run, epoch)) { finishRun(run); return@post }
          if (transformed == null) { fail("frame-failed"); return@post }
          handler.post {
            if (captureRun === run) startPass(run, true, run.plan.outputWidth, run.plan.outputHeight, 0, capturedAtMs, geometry, epoch)
          }
        }
      }
    } catch (_: Exception) { run.completeTransform(null); fail("frame-failed") }
  }
  private fun transformDiagnostic(plan: FrameTransform.Plan) = mapOf(
    "revision" to FrameTransform.REVISION, "sourceWidth" to plan.sourceWidth, "sourceHeight" to plan.sourceHeight,
    "rotation" to plan.rotation, "left" to plan.left, "top" to plan.top, "right" to plan.right, "bottom" to plan.bottom,
    "outputWidth" to plan.outputWidth, "outputHeight" to plan.outputHeight,
    "ownedPixelBytes" to plan.ownedPixelBytes(), "maxOwnedPixelBytes" to FrameTransform.MAX_OWNED_PIXEL_BYTES)

  private fun finishRun(run: CaptureRun) {
    if (captureRun !== run || !run.isDone) return
    captureRun = null; originalObservation = null; processing = false; ownedBytes = null
    worker?.shutdown(); worker = null; active = false; generation++
    releaseIdle()
  }
  fun recognize(promise: Promise) {
    requestFrame(promise, false)
  }
  fun evaluate(promise: Promise) { requestFrame(promise, true) }
  private fun requestFrame(promise: Promise, comparison: Boolean) {
    if (comparison != boundComparison) { promise.resolve(mapOf("code" to "unsupported")); return }
    if (!active || !previewReady || !readyAnnounced || frames == null || processing || requested || result != null) {
      promise.resolve(mapOf("code" to "resource-busy")); return
    }
    result = promise; requested = true
    endedAttempt = boundAttempt
    val timeout = Runnable { settle(mapOf("code" to "timeout")); cancel() }
    frameDeadline = timeout; handler.postDelayed(timeout, 10000)
  }
  fun cancel(promise: Promise? = null) {
    if (active || processing || requested) endedAttempt = boundAttempt
    active = false; generation++; requested = false; waitingForLayout = false; clearDeadline()
    originalObservation = null
    captureRun?.cancel()
    settle(mapOf("code" to "cancelled"))
    stopCamera()
    if (promise != null) closing.add(promise)
    // Não fechar o reconhecedor nem perder a referência do buffer durante leitura.
    if (!processing || captureRun?.isDone == true) {
      processing = false; ownedBytes = null; captureRun = null; worker?.shutdown(); worker = null
      releaseIdle()
    }
  }
  fun destroyCapture() { disposed = true; cancel() }
  private fun fail(code: String) { settle(mapOf("code" to code)); cancel(); status(code) }
  private fun stopCamera(): Boolean {
    return try {
      previewObserver?.let { preview.previewStreamState.removeObserver(it) }
      previewObserver = null; previewReady = false; readyAnnounced = false; guide.clear()
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
