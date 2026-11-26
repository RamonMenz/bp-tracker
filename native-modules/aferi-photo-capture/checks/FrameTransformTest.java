package expo.modules.aferiphoto;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;

/** Somente pixels inventados/matrizes sintéticas; não é teste de CameraX/ML Kit. */
public final class FrameTransformTest {
  private static void check(boolean value) { if (!value) throw new AssertionError("synthetic-transform-mismatch"); }
  private static void near(double a, double b) { check(Math.abs(a - b) < 1e-8); }
  private static void fails(Runnable action) {
    try { action.run(); } catch (IllegalArgumentException | IllegalStateException expected) { return; }
    throw new AssertionError("invalid-transform-accepted");
  }
  private static byte[] pixels(int w, int h) {
    byte[] result = new byte[w * h * 3 / 2];
    for (int i = 0; i < w * h; i++) result[i] = (byte) i;
    for (int i = w * h; i < result.length; i += 2) { result[i] = (byte) (100 + i / 2); result[i + 1] = (byte) (200 + i / 2); }
    return result;
  }
  private static void rotation(int rotation) {
    int w = 8, h = 6, uw = rotation % 180 == 0 ? w : h, uh = rotation % 180 == 0 ? h : w;
    byte[] source = pixels(w, h), before = source.clone();
    FrameTransform.Plan p = FrameTransform.region(w, h, rotation, 0, 0, uw, uh, uw, uh);
    byte[] out = FrameTransform.nv21(source, p, () -> false);
    check(out != source && Arrays.equals(source, before));
    for (int divisor : new int[] {1, 2}) {
      int ow = uw / divisor, oh = uh / divisor, rw = w / divisor, rh = h / divisor;
      int offset = divisor == 2 ? w * h : 0, step = divisor == 2 ? 2 : 1;
      for (int y = 0; y < oh; y++) for (int x = 0; x < ow; x++) {
        int sx, sy;
        switch (rotation) {
          case 90: sx = y; sy = rh - 1 - x; break;
          case 180: sx = rw - 1 - x; sy = rh - 1 - y; break;
          case 270: sx = rw - 1 - y; sy = x; break;
          default: sx = x; sy = y;
        }
        for (int c = 0; c < step; c++) check(out[offset + (y * ow + x) * step + c] == source[offset + (sy * rw + sx) * step + c]);
      }
    }
    if (rotation == 0) check(Arrays.equals(source, out));
    // ROI nas bordas, inclusive crominância, e ida/volta de caixas de rótulo/número.
    FrameTransform.Plan cropped = FrameTransform.region(w, h, rotation, 2, 2, uw, uh, (uw - 2) * 2, (uh - 2) * 2);
    byte[] crop = FrameTransform.nv21(source, cropped, () -> false);
    check(crop.length == cropped.outputBytes());
    for (double x : new double[] {2.0 / uw, 0.5, 1}) for (double y : new double[] {2.0 / uh, 0.75, 1}) {
      double[] processed = cropped.toProcessedPoint(x, y);
      double[] back = cropped.toSourceBox(processed[0], processed[1], processed[0], processed[1]);
      near(x, back[0]); near(y, back[1]);
    }
    double[] full = cropped.toSourceBox(-10, -10, cropped.outputWidth + 10, cropped.outputHeight + 10);
    near(full[0], 2.0 / uw); near(full[1], 2.0 / uh);
    near(full[0] + full[2], 1); near(full[1] + full[3], 1);
  }
  private static void guide(int rotation) {
    int width = 1280, height = 960, w = rotation % 180 == 0 ? width : height, h = rotation % 180 == 0 ? height : width;
    int vw = 360, vh = 300;
    // Modelo de fill-center sintético: zoom e corte do preview conhecidos.
    double scale = Math.max((double) vw / w, (double) vh / h);
    double ox = (w - vw / scale) / 2, oy = (h - vh / scale) / 2;
    double[] matrix = {1 / scale, 0, ox, 0, 1 / scale, oy, 0, 0, 1};
    FrameTransform.Plan p = FrameTransform.fromPreview(width, height, rotation, vw, vh, matrix);
    double[] drawn = p.guideInPreview();
    near(drawn[0] / scale + ox, p.left); near(drawn[1] / scale + oy, p.top);
    near(drawn[2] / scale + ox, p.right); near(drawn[3] / scale + oy, p.bottom);
    check(p.outputWidth * p.outputHeight <= FrameBytes.MAX_FRAME_PIXELS);
    check(p.outputWidth <= 1600 && p.outputHeight <= 1600);
    check(p.ownedPixelBytes() <= FrameTransform.MAX_OWNED_PIXEL_BYTES);
    check(((p.left | p.top | p.right | p.bottom | p.outputWidth | p.outputHeight) & 1) == 0);
    check(p.matches(FrameTransform.fromPreview(width, height, rotation, vw, vh, matrix)));
    double[] changed = matrix.clone(); changed[2] += 0.5;
    check(!p.matches(FrameTransform.fromPreview(width, height, rotation, vw, vh, changed)));
    // Três pares sintéticos: números à esquerda e rótulos externos à direita.
    // A geometria de ambos atravessa ROI -> SDK processado -> quadro de origem.
    for (int row = 0; row < 3; row++) for (double fraction : new double[] {0.2, 0.8}) {
      double x = (p.left + (p.right - p.left) * fraction) / w;
      double y = (p.top + (p.bottom - p.top) * (0.2 + row * 0.3)) / h;
      double[] processed = p.toProcessedPoint(x, y), back = p.toSourceBox(processed[0], processed[1], processed[0] + 8, processed[1] + 6);
      near(x, back[0]); near(y, back[1]);
    }
  }
  public static void main(String[] args) {
    for (int rotation : new int[] {0, 90, 180, 270}) { rotation(rotation); guide(rotation); }
    byte[] uniform = new byte[8 * 6 * 3 / 2]; Arrays.fill(uniform, (byte) 173);
    FrameTransform.Plan up = FrameTransform.region(8, 6, 90, 0, 0, 6, 8, 12, 16);
    for (byte value : FrameTransform.nv21(uniform, up, () -> false)) check((value & 255) == 173);
    byte[] small = {0, 100, (byte) 200, (byte) 255, 88, (byte) 144};
    byte[] scaled = FrameTransform.nv21(small, FrameTransform.region(2, 2, 0, 0, 0, 2, 2, 4, 4), () -> false);
    check((scaled[5] & 255) == 72); check((scaled[16] & 255) == 88 && (scaled[17] & 255) == 144);
    AtomicInteger rows = new AtomicInteger();
    fails(() -> FrameTransform.nv21(uniform, up, () -> rows.incrementAndGet() > 2));
    fails(() -> FrameTransform.nv21(uniform, up, () -> true));
    fails(() -> FrameTransform.nv21(new byte[2], up, () -> false));
    fails(() -> FrameTransform.region(7, 6, 0, 0, 0, 6, 6, 6, 6));
    fails(() -> FrameTransform.region(8, 6, 45, 0, 0, 8, 6, 8, 6));
    fails(() -> FrameTransform.region(8, 6, 0, 1, 0, 8, 6, 8, 6));
    fails(() -> FrameTransform.region(8, 6, 0, 0, 0, 10, 6, 8, 6));
    fails(() -> FrameTransform.region(8, 6, 0, 0, 0, 8, 6, 18, 12));
    fails(() -> FrameTransform.region(1600, 1200, 0, 0, 0, 1600, 1200, 1920, 1080));
    fails(() -> FrameTransform.region(Integer.MAX_VALUE - 1, Integer.MAX_VALUE - 1, 0, 0, 0, 8, 6, 8, 6));
    for (double[] invalid : new double[][] {null, {}, {0,0,0,0,0,0,0,0,1},
        {1,0,0,0,1,0,1,0,1}, {1,.2,0,0,1,0,0,0,1}, {Double.NaN,0,0,0,1,0,0,0,1},
        {1,0,-1000,0,1,0,0,0,1}}) {
      fails(() -> FrameTransform.fromPreview(1280, 960, 0, 360, 300, invalid));
    }
    System.out.println("FrameTransform: rotations, Y/VU, interpolation, ROI/guide round trips, cancellation and allocation guards passed (synthetic)");
  }
}
