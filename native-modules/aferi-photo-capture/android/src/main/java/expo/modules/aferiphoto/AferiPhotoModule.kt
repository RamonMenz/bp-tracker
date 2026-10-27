package expo.modules.aferiphoto

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AferiPhotoModule : Module() {
  private val cameras = mutableSetOf<AferiPhotoView>()
  override fun definition() = ModuleDefinition {
    Name("AferiPhotoCapture")
    AsyncFunction("requestCameraPermission") { promise: Promise ->
      val context = appContext.reactContext
      val permissions = appContext.permissions
      if (context == null || permissions == null) promise.resolve(false)
      else permissions.askForPermissions({
        promise.resolve(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
      }, Manifest.permission.CAMERA)
    }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { cameras.toList().forEach { it.cancel() } }
    OnDestroy { cameras.toList().forEach { it.destroyCapture() }; cameras.clear() }
    View(AferiPhotoView::class) {
      Events("onStatus")
      Prop("active") { view: AferiPhotoView, value: Boolean -> cameras.add(view); view.requestedActive = value }
      Prop("attemptId") { view: AferiPhotoView, value: Int -> view.attemptId = value }
      OnViewDidUpdateProps { view: AferiPhotoView -> view.applyProps() }
      AsyncFunction("recognize") { view: AferiPhotoView, promise: Promise -> view.recognize(promise) }
      AsyncFunction("cancelCapture") { view: AferiPhotoView, promise: Promise -> view.cancel(promise) }
      OnViewDestroys { view: AferiPhotoView -> cameras.remove(view); view.destroyCapture() }
    }
  }
}
