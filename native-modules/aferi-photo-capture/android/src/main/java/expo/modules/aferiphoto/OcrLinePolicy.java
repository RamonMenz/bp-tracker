package expo.modules.aferiphoto;

import java.util.LinkedHashMap;
import java.util.Map;

/** Política da bridge e projeção transitória: nunca retém texto, caixas ou valores. */
public final class OcrLinePolicy {
  public static final int MAX_LINES = 500;
  public static final int MAX_TEXT_LENGTH = 500;
  private int considered = 0;
  private boolean sdkLines, sdkDigits, bridgeLines, bridgeDigits;
  private boolean sdkTextDigits, sdkBlockDigits;
  private boolean noBox, longText, lineLimit;
  private boolean digitsNoBox, digitsLongText, digitsLineLimit;

  private static boolean hasAsciiDigit(String text) {
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      if (c >= '0' && c <= '9') return true;
    }
    return false;
  }

  // Apenas presença: não cria tokens a partir de Text ou TextBlock.
  public void observeSdkText(String text) { sdkTextDigits |= hasAsciiDigit(text); }
  public void observeBlockText(String text) { sdkBlockDigits |= hasAsciiDigit(text); }

  /** Mantém take(500) ANTES dos filtros, inclusive para linhas descartadas. */
  public boolean accept(String text, boolean hasBox) {
    boolean digits = hasAsciiDigit(text);
    sdkLines = true;
    sdkDigits |= digits;
    if (considered == MAX_LINES) {
      lineLimit = true; digitsLineLimit |= digits; return false;
    }
    considered++;
    if (!hasBox) { noBox = true; digitsNoBox |= digits; return false; }
    if (text.length() > MAX_TEXT_LENGTH) {
      longText = true; digitsLongText |= digits; return false;
    }
    bridgeLines = true;
    bridgeDigits |= digits;
    return true;
  }

  public Map<String, Object> diagnostic() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("revision", "bridge-2");
    result.put("sdkLinesPresent", sdkLines);
    result.put("sdkAsciiDigitPresent", sdkTextDigits || sdkBlockDigits || sdkDigits);
    result.put("sdkTextAsciiDigitPresent", sdkTextDigits);
    result.put("sdkBlockAsciiDigitPresent", sdkBlockDigits);
    result.put("sdkLineAsciiDigitPresent", sdkDigits);
    result.put("bridgeLinesPresent", bridgeLines);
    result.put("bridgeAsciiDigitPresent", bridgeDigits);
    result.put("droppedWithoutBox", noBox);
    result.put("droppedLongText", longText);
    result.put("droppedLineLimit", lineLimit);
    result.put("asciiDigitDroppedWithoutBox", digitsNoBox);
    result.put("asciiDigitDroppedLongText", digitsLongText);
    result.put("asciiDigitDroppedLineLimit", digitsLineLimit);
    return result;
  }
}
