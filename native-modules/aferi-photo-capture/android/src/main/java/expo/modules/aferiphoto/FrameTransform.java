package expo.modules.aferiphoto;

import java.util.function.BooleanSupplier;

/** ROI/orientação/escala NV21, sem Android, I/O, contraste ou reconhecimento. */
public final class FrameTransform {
  public static final String REVISION = "roi-1";
  public static final double GUIDE_MARGIN = 0.08;
  public static final int TARGET_LONG_EDGE = 1600;
  public static final int MAX_NV21_BYTES = FrameBytes.MAX_FRAME_PIXELS * 3 / 2;
  public static final int MAX_OWNED_PIXEL_BYTES = MAX_NV21_BYTES * 2;
  private FrameTransform() {}

  public static final class Plan {
    public final int sourceWidth, sourceHeight, rotation, uprightWidth, uprightHeight;
    public final int left, top, right, bottom, outputWidth, outputHeight;
    public final int viewWidth, viewHeight;
    private final double[] previewToUpright;
    private Plan(int width, int height, int rotation, int left, int top, int right, int bottom,
        int outWidth, int outHeight, int viewWidth, int viewHeight, double[] matrix) {
      if (!FrameBytes.acceptsDimensions(width, height) || !validRotation(rotation)
          || !FrameBytes.acceptsDimensions(outWidth, outHeight)) invalid();
      sourceWidth = width; sourceHeight = height; this.rotation = rotation;
      uprightWidth = rotation % 180 == 0 ? width : height;
      uprightHeight = rotation % 180 == 0 ? height : width;
      if (left < 0 || top < 0 || right > uprightWidth || bottom > uprightHeight
          || right <= left || bottom <= top || ((left | top | right | bottom) & 1) != 0
          || outWidth > 2L * (right - left) || outHeight > 2L * (bottom - top)
          || (long) width * height * 3 / 2 + (long) outWidth * outHeight * 3 / 2 > MAX_OWNED_PIXEL_BYTES) invalid();
      this.left = left; this.top = top; this.right = right; this.bottom = bottom;
      outputWidth = outWidth; outputHeight = outHeight;
      this.viewWidth = viewWidth; this.viewHeight = viewHeight;
      previewToUpright = matrix == null ? null : matrix.clone();
    }
    public int outputBytes() { return outputWidth * outputHeight * 3 / 2; }
    public int ownedPixelBytes() { return sourceWidth * sourceHeight * 3 / 2 + outputBytes(); }

    /** Caixa SDK processada (upright, pixels) -> quadro upright original normalizado. */
    public double[] toSourceBox(double x0, double y0, double x1, double y1) {
      if (!finite(x0, y0, x1, y1) || x1 < x0 || y1 < y0) invalid();
      double x = clamp(x0, 0, outputWidth), y = clamp(y0, 0, outputHeight);
      double r = clamp(x1, x, outputWidth), b = clamp(y1, y, outputHeight);
      double sx = (double) outputWidth / (right - left), sy = (double) outputHeight / (bottom - top);
      return new double[] {(left + x / sx) / uprightWidth, (top + y / sy) / uprightHeight,
          (r - x) / sx / uprightWidth, (b - y) / sy / uprightHeight};
    }

    /** Inversa para testes de ida/volta, sem estimar caixas de palavras. */
    public double[] toProcessedPoint(double x, double y) {
      if (!finite(x, y)) invalid();
      return new double[] {(x * uprightWidth - left) * outputWidth / (right - left),
          (y * uprightHeight - top) * outputHeight / (bottom - top)};
    }

    /** Guia desenhada é a projeção INVERSA do ROI efetivo, após alinhamento YUV. */
    public double[] guideInPreview() {
      if (previewToUpright == null) invalid();
      double[] m = previewToUpright;
      double det = m[0] * m[4] - m[1] * m[3];
      double[] xs = {left, right, right, left}, ys = {top, top, bottom, bottom};
      double minX = Double.POSITIVE_INFINITY, minY = minX, maxX = -minX, maxY = -minX;
      for (int i = 0; i < 4; i++) {
        double x = xs[i] - m[2], y = ys[i] - m[5];
        double vx = (m[4] * x - m[1] * y) / det, vy = (-m[3] * x + m[0] * y) / det;
        minX = Math.min(minX, vx); maxX = Math.max(maxX, vx);
        minY = Math.min(minY, vy); maxY = Math.max(maxY, vy);
      }
      if (!finite(minX, minY, maxX, maxY) || minX < -2 || minY < -2
          || maxX > viewWidth + 2 || maxY > viewHeight + 2) invalid();
      return new double[] {minX, minY, maxX, maxY};
    }

    /** Não aceitar outra geometria no frame de captura que a efetivamente desenhada. */
    public boolean matches(Plan other) {
      if (other == null || sourceWidth != other.sourceWidth || sourceHeight != other.sourceHeight
          || rotation != other.rotation || left != other.left || top != other.top || right != other.right
          || bottom != other.bottom || outputWidth != other.outputWidth || outputHeight != other.outputHeight
          || viewWidth != other.viewWidth || viewHeight != other.viewHeight
          || previewToUpright == null || other.previewToUpright == null) return false;
      for (int x : new int[] {0, viewWidth}) for (int y : new int[] {0, viewHeight}) {
        if (Math.abs(mapX(previewToUpright, x, y) - mapX(other.previewToUpright, x, y)) > 0.25
            || Math.abs(mapY(previewToUpright, x, y) - mapY(other.previewToUpright, x, y)) > 0.25) return false;
      }
      return true;
    }
  }

  /** Apenas para geometria pura; produção usa fromPreview, com parâmetros fixos. */
  static Plan region(int width, int height, int rotation, int left, int top, int right, int bottom, int outW, int outH) {
    return new Plan(width, height, rotation, left, top, right, bottom, outW, outH, 0, 0, null);
  }

  /** Matriz CameraX: pixels do PreviewView -> pixels upright do buffer COMPLETO. */
  public static Plan fromPreview(int width, int height, int rotation, int viewWidth, int viewHeight, double[] m) {
    if (!FrameBytes.acceptsDimensions(width, height) || !validRotation(rotation)
        || viewWidth <= 0 || viewHeight <= 0 || viewWidth > 100000 || viewHeight > 100000
        || m == null || m.length != 9 || !finite(m)) invalid();
    // Aceitar só transformação afim de retângulos (eixos ou quarter turn), sem perspectiva/shear.
    if (Math.abs(m[6]) > 1e-7 || Math.abs(m[7]) > 1e-7 || Math.abs(m[8] - 1) > 1e-7
        || Math.abs(m[0] * m[4] - m[1] * m[3]) < 1e-10
        || !((Math.abs(m[1]) < 1e-5 && Math.abs(m[3]) < 1e-5)
          || (Math.abs(m[0]) < 1e-5 && Math.abs(m[4]) < 1e-5))) invalid();
    int w = rotation % 180 == 0 ? width : height, h = rotation % 180 == 0 ? height : width;
    double[] vx = {viewWidth * GUIDE_MARGIN, viewWidth * (1 - GUIDE_MARGIN)};
    double[] vy = {viewHeight * GUIDE_MARGIN, viewHeight * (1 - GUIDE_MARGIN)};
    double l = Double.POSITIVE_INFINITY, t = l, r = -l, b = -l;
    for (double x : vx) for (double y : vy) {
      double ux = mapX(m, x, y), uy = mapY(m, x, y);
      l = Math.min(l, ux); r = Math.max(r, ux); t = Math.min(t, uy); b = Math.max(b, uy);
    }
    if (l < -0.01 || t < -0.01 || r > w + 0.01 || b > h + 0.01) invalid();
    int left = Math.max(0, (int) Math.floor(l / 2) * 2), top = Math.max(0, (int) Math.floor(t / 2) * 2);
    int right = Math.min(w, (int) Math.ceil(r / 2) * 2), bottom = Math.min(h, (int) Math.ceil(b / 2) * 2);
    double scale = Math.min(2.0, Math.min((double) TARGET_LONG_EDGE / Math.max(right - left, bottom - top),
        Math.sqrt((double) FrameBytes.MAX_FRAME_PIXELS / ((long) (right - left) * (bottom - top)))));
    int outW = (int) Math.floor((right - left) * scale / 2) * 2;
    int outH = (int) Math.floor((bottom - top) * scale / 2) * 2;
    Plan plan = new Plan(width, height, rotation, left, top, right, bottom, outW, outH, viewWidth, viewHeight, m);
    plan.guideInPreview(); // Validar a projeção desenhada antes de publicar ready.
    return plan;
  }

  /** Uma única alocação de pixels: amostragem bilinear direta Y e VU, em lattice separado. */
  public static byte[] nv21(byte[] source, Plan plan, BooleanSupplier cancelled) {
    if (plan == null || source == null || source.length != plan.sourceWidth * plan.sourceHeight * 3 / 2
        || plan.ownedPixelBytes() > MAX_OWNED_PIXEL_BYTES) invalid();
    checkCancelled(cancelled);
    byte[] output = new byte[plan.outputBytes()];
    resample(source, output, plan, false, cancelled);
    resample(source, output, plan, true, cancelled);
    return output;
  }

  private static void resample(byte[] source, byte[] output, Plan p, boolean chroma, BooleanSupplier cancelled) {
    int divisor = chroma ? 2 : 1;
    int ow = p.outputWidth / divisor, oh = p.outputHeight / divisor;
    int rw = p.sourceWidth / divisor, rh = p.sourceHeight / divisor;
    int left = p.left / divisor, top = p.top / divisor, width = (p.right - p.left) / divisor, height = (p.bottom - p.top) / divisor;
    int offset = chroma ? p.sourceWidth * p.sourceHeight : 0;
    int outOffset = chroma ? p.outputWidth * p.outputHeight : 0;
    for (int y = 0; y < oh; y++) {
      checkCancelled(cancelled);
      double uy = clamp(top + (y + 0.5) * height / oh - 0.5, top, top + height - 1);
      for (int x = 0; x < ow; x++) {
        double ux = clamp(left + (x + 0.5) * width / ow - 0.5, left, left + width - 1);
        double sx, sy;
        switch (p.rotation) {
          case 90: sx = uy; sy = rh - 1 - ux; break;
          case 180: sx = rw - 1 - ux; sy = rh - 1 - uy; break;
          case 270: sx = rw - 1 - uy; sy = ux; break;
          default: sx = ux; sy = uy;
        }
        int step = chroma ? 2 : 1, target = outOffset + (y * ow + x) * step;
        output[target] = sample(source, offset, rw, rh, step, 0, sx, sy);
        if (chroma) output[target + 1] = sample(source, offset, rw, rh, step, 1, sx, sy);
      }
    }
  }
  private static byte sample(byte[] bytes, int offset, int width, int height, int step, int channel, double x, double y) {
    int x0 = (int) Math.floor(x), y0 = (int) Math.floor(y), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
    double fx = x - x0, fy = y - y0;
    double a = (bytes[offset + (y0 * width + x0) * step + channel] & 255) * (1 - fx)
        + (bytes[offset + (y0 * width + x1) * step + channel] & 255) * fx;
    double b = (bytes[offset + (y1 * width + x0) * step + channel] & 255) * (1 - fx)
        + (bytes[offset + (y1 * width + x1) * step + channel] & 255) * fx;
    return (byte) Math.round(a * (1 - fy) + b * fy);
  }
  private static void checkCancelled(BooleanSupplier cancelled) {
    if (cancelled != null && cancelled.getAsBoolean()) throw new IllegalStateException("transform-cancelled");
  }
  private static boolean validRotation(int rotation) { return rotation == 0 || rotation == 90 || rotation == 180 || rotation == 270; }
  private static boolean finite(double... values) { for (double v : values) if (!Double.isFinite(v)) return false; return true; }
  private static double clamp(double v, double min, double max) { return Math.max(min, Math.min(max, v)); }
  private static double mapX(double[] m, double x, double y) { return m[0] * x + m[1] * y + m[2]; }
  private static double mapY(double[] m, double x, double y) { return m[3] * x + m[4] * y + m[5]; }
  private static void invalid() { throw new IllegalArgumentException("transform-geometry"); }
}
