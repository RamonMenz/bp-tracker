package expo.modules.aferiphoto;

public final class CaptureRunTest {
  private static void check(boolean value) { if (!value) throw new AssertionError("capture-run-mismatch"); }
  private static void fails(Runnable action) {
    try { action.run(); } catch (IllegalStateException expected) { return; }
    throw new AssertionError("overlapping-pass-accepted");
  }
  private static CaptureRun run() { return new CaptureRun(new byte[72], FrameTransform.region(8,6,0,0,0,8,6,16,12)); }
  public static void main(String[] args) {
    CaptureRun single = new CaptureRun(new byte[72], null);
    check(single.beginOriginal().length == 72); single.cancel();
    check(!single.isDone() && single.retainedPixelBytes() == 72);
    single.completeOriginal(); check(single.isDone() && single.retainedPixelBytes() == 0);
    CaptureRun original = run();
    original.beginOriginal(); fails(original::beginOriginal); fails(original::beginProcessed);
    original.cancel(); check(original.retainedPixelBytes() == 72 && !original.isDone());
    original.completeOriginal(); check(original.isDone() && original.retainedPixelBytes() == 0);
    check(!original.beginTransform()); check(original.beginProcessed() == null);
    CaptureRun between = run(); between.beginOriginal(); between.completeOriginal(); between.cancel();
    check(between.isDone() && between.retainedPixelBytes() == 0 && !between.beginTransform());
    CaptureRun transform = run(); transform.beginOriginal(); transform.completeOriginal();
    check(transform.beginTransform()); byte[] source = transform.transformSource(); transform.cancel();
    check(!transform.isDone() && transform.retainedPixelBytes() == source.length);
    transform.completeTransform(new byte[transform.plan.outputBytes()]);
    check(transform.isDone() && transform.retainedPixelBytes() == 0 && transform.beginProcessed() == null);
    CaptureRun ready = run(); ready.beginOriginal(); ready.completeOriginal(); ready.beginTransform();
    ready.completeTransform(new byte[ready.plan.outputBytes()]); ready.cancel();
    check(ready.isDone() && ready.beginProcessed() == null && ready.retainedPixelBytes() == 0);
    CaptureRun processed = run(); processed.beginOriginal(); processed.completeOriginal(); processed.beginTransform();
    byte[] output = FrameTransform.nv21(processed.transformSource(), processed.plan, processed::isCancelled);
    processed.completeTransform(output); check(processed.beginProcessed() == output);
    processed.cancel(); check(!processed.isDone() && processed.retainedPixelBytes() == 72 + output.length);
    fails(processed::beginOriginal); processed.completeProcessed();
    check(processed.isDone() && processed.retainedPixelBytes() == 0);
    CaptureRun failed = run(); failed.beginOriginal(); failed.completeOriginal(); failed.beginTransform();
    failed.completeTransform(null); check(failed.isDone() && failed.retainedPixelBytes() == 0);
    CaptureRun success = run(); success.beginOriginal(); success.completeOriginal(); success.beginTransform();
    success.completeTransform(new byte[success.plan.outputBytes()]); success.beginProcessed(); success.completeProcessed();
    check(success.isDone() && !success.isCancelled() && success.retainedPixelBytes() == 0);
    fails(success::completeProcessed); // Completion duplicado não restaura buffers.
    CaptureRun invalidOutput = run(); invalidOutput.beginOriginal(); invalidOutput.completeOriginal(); invalidOutput.beginTransform();
    fails(invalidOutput::beginProcessed);
    fails(() -> invalidOutput.completeTransform(new byte[6]));
    check(!invalidOutput.isDone() && invalidOutput.retainedPixelBytes() == 72);
    invalidOutput.completeTransform(null); // Worker encerrado, saída inválida: liberação explícita.
    check(invalidOutput.isDone() && invalidOutput.retainedPixelBytes() == 0);
    CaptureRun early = run(); early.cancel(); early.cancel();
    check(early.isDone() && early.retainedPixelBytes() == 0); fails(early::beginOriginal);
    System.out.println("CaptureRun: sequential completions, cancellation at every boundary and ownership guards passed (simulated SDK completions)");
  }
}
