package expo.modules.aferilocal

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AferiLocalModule : Module() {
  private var speech: LocalSpeech? = null
  private val cameras = mutableSetOf<AferiCameraView>()

  override fun definition() = ModuleDefinition {
    Name("AferiLocalRecognition")
    AsyncFunction("requestPermission") { kind: String, promise: Promise ->
      val context = appContext.reactContext
      val permission = if (kind == "camera") Manifest.permission.CAMERA else Manifest.permission.RECORD_AUDIO
      val manager = appContext.permissions
      if (context == null || manager == null) promise.resolve(false)
      else manager.askForPermissions({
        promise.resolve(ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED)
      }, permission)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("probeVoice") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) promise.resolve(mapOf("code" to "local-unavailable"))
      else {
        val engine = speech ?: LocalSpeech(context).also { speech = it }
        engine.probe(promise)
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("startVoice") { promise: Promise ->
      val engine = speech
      if (engine == null) promise.resolve(mapOf("code" to "language-unverified")) else engine.start(promise)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("finishVoice") { speech?.finish() }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelVoice") { speech?.cancel() }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { speech?.cancel(); cameras.forEach { it.setActive(false) } }
    OnDestroy { speech?.cancel(); cameras.forEach { it.setActive(false) }; cameras.clear() }
    View(AferiCameraView::class) {
      Events("onStatus")
      Prop("active") { view: AferiCameraView, active: Boolean ->
        cameras.add(view)
        view.requestedActive = active
      }
      Prop("attemptId") { view: AferiCameraView, attemptId: Int -> view.attemptId = attemptId }
      OnViewDidUpdateProps { view: AferiCameraView -> view.setActive(view.requestedActive) }
      AsyncFunction("recognize") { view: AferiCameraView, promise: Promise -> view.recognize(promise) }
      AsyncFunction("cancelCapture") { view: AferiCameraView -> view.setActive(false) }
      OnViewDestroys { view: AferiCameraView -> cameras.remove(view); view.setActive(false) }
    }
  }
}
