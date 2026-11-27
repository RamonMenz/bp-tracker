package expo.modules.aferiphoto

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.view.View
import androidx.camera.core.ImageProxy
import androidx.camera.view.PreviewView
import androidx.camera.view.TransformExperimental
import androidx.camera.view.transform.CoordinateTransform
import androidx.camera.view.transform.ImageProxyTransformFactory

/** Somente geometria técnica. Nenhum frame, pixel, resultado ou caixa OCR nesta View. */
@androidx.annotation.OptIn(markerClass = [TransformExperimental::class])
class CaptureGuide(context: Context, private val onDrawn: () -> Unit) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = 0xff2563eb.toInt(); style = Paint.Style.STROKE; strokeWidth = 3 * resources.displayMetrics.density
  }
  private var pending: FrameTransform.Plan? = null
  var drawn: FrameTransform.Plan? = null
    private set
  init { importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO; isClickable = false }
  fun show(plan: FrameTransform.Plan) { pending = plan; invalidate() }
  fun clear() { pending = null; drawn = null; invalidate() }
  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val plan = pending ?: return
    val rect = plan.guideInPreview()
    canvas.drawRect(rect[0].toFloat(), rect[1].toFloat(), rect[2].toFloat(), rect[3].toFloat(), paint)
    drawn = plan
    onDrawn()
  }
  companion object {
    fun project(frame: ImageProxy, preview: PreviewView): FrameTransform.Plan {
      val target = preview.outputTransform ?: throw IllegalArgumentException("guide-unavailable")
      val factory = ImageProxyTransformFactory().apply {
        // false mantém coordenadas do buffer inteiro, inclusive offset do crop de ViewPort.
        setUsingCropRect(false)
        setUsingRotationDegrees(true)
      }
      val matrix = Matrix()
      CoordinateTransform(target, factory.getOutputTransform(frame)).transform(matrix)
      val values = FloatArray(9)
      matrix.getValues(values)
      return FrameTransform.fromPreview(frame.width, frame.height, frame.imageInfo.rotationDegrees,
        preview.width, preview.height, DoubleArray(9) { values[it].toDouble() })
    }
  }
}
