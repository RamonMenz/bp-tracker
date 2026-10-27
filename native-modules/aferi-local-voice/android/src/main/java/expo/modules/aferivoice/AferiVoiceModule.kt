package expo.modules.aferivoice

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AferiVoiceModule : Module() {
  private var speech: LocalSpeech? = null
  private fun engine(): LocalSpeech? {
    val context = appContext.reactContext ?: return null
    return speech ?: LocalSpeech(context) { id, status ->
      sendEvent("onVoiceStatus", mapOf("attemptId" to id, "status" to status))
    }.also { speech = it }
  }
  override fun definition() = ModuleDefinition {
    Name("AferiLocalVoice")
    Events("onVoiceStatus")
    AsyncFunction("availability") { promise: Promise -> promise.resolve(mapOf("code" to (engine()?.availability() ?: "local-unavailable"))) }.runOnQueue(Queues.MAIN)
    AsyncFunction("requestMicrophonePermission") { promise: Promise ->
      val context = appContext.reactContext
      val permissions = appContext.permissions
      if (context == null || permissions == null) promise.resolve(false)
      else permissions.askForPermissions({
        promise.resolve(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
      }, Manifest.permission.RECORD_AUDIO)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("prepare") { id: Int, promise: Promise ->
      val local = engine()
      if (local == null) promise.resolve(mapOf("code" to "local-unavailable")) else local.prepare(id, promise)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("start") { id: Int, promise: Promise ->
      val local = speech
      if (local == null) promise.resolve(mapOf("code" to "language-unverified")) else local.start(id, promise)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("finish") { id: Int -> speech?.finish(id) ?: false }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancel") { id: Int -> speech?.cancel(id) ?: true }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { speech?.interrupt() }
    OnActivityDestroys { speech?.interrupt() }
    OnDestroy { speech?.interrupt() }
  }
}
