package expo.modules.aferiphoto;

import java.nio.ByteBuffer;

/** Cópia YUV_420_888 -> NV21 em RAM. Independente de Android para testar strides reais. */
public final class FrameBytes {
  private FrameBytes() {}
  public static byte[] nv21(int width, int height,
      ByteBuffer y, int yRow, int yPixel, ByteBuffer u, int uRow, int uPixel,
      ByteBuffer v, int vRow, int vPixel) {
    if (width <= 0 || height <= 0 || (width & 1) != 0 || (height & 1) != 0
        || (long) width * height > 1920000) throw new IllegalArgumentException("frame-size");
    if (yRow <= 0 || yPixel <= 0 || uRow <= 0 || uPixel <= 0 || vRow <= 0 || vPixel <= 0)
      throw new IllegalArgumentException("frame-stride");
    byte[] bytes = new byte[width * height * 3 / 2];
    int offset = 0;
    for (int row = 0; row < height; row++) {
      for (int col = 0; col < width; col++) bytes[offset++] = sample(y, row, col, yRow, yPixel);
    }
    for (int row = 0; row < height / 2; row++) {
      for (int col = 0; col < width / 2; col++) {
        bytes[offset++] = sample(v, row, col, vRow, vPixel);
        bytes[offset++] = sample(u, row, col, uRow, uPixel);
      }
    }
    return bytes;
  }
  private static byte sample(ByteBuffer buffer, int row, int col, int rowStride, int pixelStride) {
    long index = (long) buffer.position() + (long) row * rowStride + (long) col * pixelStride;
    if (index < 0 || index >= buffer.limit()) throw new IllegalArgumentException("frame-plane");
    return buffer.get((int) index);
  }
}
