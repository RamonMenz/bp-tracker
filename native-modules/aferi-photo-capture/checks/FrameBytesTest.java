package expo.modules.aferiphoto;

import java.nio.ByteBuffer;
import java.util.Arrays;

public final class FrameBytesTest {
  private static int dimensionChecks = 0;
  private static void dimensions(int width, int height, boolean accepted) {
    if (FrameBytes.acceptsDimensions(width, height) != accepted) throw new AssertionError("frame-dimension-policy");
    dimensionChecks++;
  }
  private static void equal(byte[] actual, byte[] expected) {
    if (!Arrays.equals(actual, expected)) throw new AssertionError("synthetic-frame-mismatch");
  }
  private static void fails(Runnable action) {
    try { action.run(); } catch (IllegalArgumentException expected) { return; }
    throw new AssertionError("invalid-frame-accepted");
  }
  public static void main(String[] args) {
    ByteBuffer y = ByteBuffer.wrap(new byte[] {1,2,3,4,5,6,7,8});
    ByteBuffer u = ByteBuffer.wrap(new byte[] {11,12});
    ByteBuffer v = ByteBuffer.wrap(new byte[] {21,22});
    byte[] expected = {1,2,3,4,5,6,7,8,21,11,22,12};
    equal(FrameBytes.nv21(4,2,y,4,1,u,2,1,v,2,1), expected);
    // Row padding e pixelStride=2, buffers cromáticos com offsets independentes.
    ByteBuffer padded = ByteBuffer.wrap(new byte[] {0,1,2,3,4,0,0,5,6,7,8,0,0});
    padded.position(1);
    ByteBuffer interleavedU = ByteBuffer.wrap(new byte[] {0,11,0,12});
    interleavedU.position(1);
    ByteBuffer interleavedV = ByteBuffer.wrap(new byte[] {21,0,22,0});
    equal(FrameBytes.nv21(4,2,padded,6,1,interleavedU,4,2,interleavedV,4,2), expected);
    if (padded.position() != 1 || interleavedU.position() != 1) throw new AssertionError("buffer-position-mutated");
    fails(() -> FrameBytes.nv21(3,2,y,4,1,u,2,1,v,2,1));
    fails(() -> FrameBytes.nv21(4000,3000,y,4,1,u,2,1,v,2,1));
    fails(() -> FrameBytes.nv21(4,2,y,100,1,u,2,1,v,2,1));
    fails(() -> FrameBytes.nv21(4,2,y,4,0,u,2,1,v,2,1));
    equal(FrameBytes.nv21(4,2,y.asReadOnlyBuffer(),4,1,u,2,1,v,2,1), expected);
    dimensions(1280, 960, true);
    dimensions(1440, 1080, true);
    dimensions(1600, 1200, true);
    dimensions(1920, 1000, true);
    dimensions(1920, 1080, false);
    dimensions(1922, 1000, false);
    dimensions(1920, 1440, false);
    dimensions(0, 960, false);
    dimensions(-2, 960, false);
    dimensions(1279, 960, false);
    dimensions(2147483646, 2147483646, false);
    System.out.println("FrameBytes: 8 buffer checks and " + dimensionChecks + " dimension checks passed (synthetic; no camera/ML Kit proof)");
  }
}
