package expo.modules.aferiphoto;

/** Ownership e sequência de uma captura; cada completion é chamado só após o trabalho real encerrar. */
public final class CaptureRun {
  private enum Stage { NEW, ORIGINAL, BETWEEN, TRANSFORMING, READY_PROCESSED, PROCESSED, DONE }
  private Stage stage = Stage.NEW;
  private volatile boolean cancelled;
  private byte[] original, processed;
  public final FrameTransform.Plan plan;

  public CaptureRun(byte[] original, FrameTransform.Plan plan) {
    if (original == null || original.length > FrameTransform.MAX_NV21_BYTES
        || (plan != null && original.length != plan.sourceWidth * plan.sourceHeight * 3 / 2)) invalid();
    this.original = original; this.plan = plan;
  }
  public byte[] beginOriginal() { require(Stage.NEW); stage = Stage.ORIGINAL; return original; }
  public void completeOriginal() {
    require(Stage.ORIGINAL);
    if (cancelled || plan == null) finish(); else stage = Stage.BETWEEN;
  }
  public boolean beginTransform() {
    if (stage == Stage.DONE && cancelled) return false;
    require(Stage.BETWEEN); stage = Stage.TRANSFORMING; return true;
  }
  public byte[] transformSource() { require(Stage.TRANSFORMING); return original; }
  public void completeTransform(byte[] output) {
    require(Stage.TRANSFORMING);
    if (cancelled || output == null) { finish(); return; }
    if (output.length != plan.outputBytes() || (long) original.length + output.length > FrameTransform.MAX_OWNED_PIXEL_BYTES) invalid();
    processed = output; stage = Stage.READY_PROCESSED;
  }
  public byte[] beginProcessed() {
    if (stage == Stage.DONE && cancelled) return null;
    require(Stage.READY_PROCESSED); stage = Stage.PROCESSED; return processed;
  }
  public void completeProcessed() { require(Stage.PROCESSED); finish(); }
  public void cancel() {
    cancelled = true;
    // Operações já em voo retêm seus buffers até o respectivo completion.
    if (stage != Stage.ORIGINAL && stage != Stage.PROCESSED && stage != Stage.TRANSFORMING) finish();
  }
  public boolean isCancelled() { return cancelled; }
  public boolean isDone() { return stage == Stage.DONE; }
  public int retainedPixelBytes() { return (original == null ? 0 : original.length) + (processed == null ? 0 : processed.length); }
  private void finish() { original = null; processed = null; stage = Stage.DONE; }
  private void require(Stage expected) { if (stage != expected || (cancelled && stage == Stage.NEW)) invalid(); }
  private static void invalid() { throw new IllegalStateException("capture-sequence"); }
}
