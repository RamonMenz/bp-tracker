package expo.modules.aferiphoto;

import java.util.Map;

/** Entradas inteiramente sintéticas; não executa CameraX/ML Kit ou câmera física. */
public final class OcrLinePolicyTest {
  private static int checks;
  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("ocr-line-policy-mismatch");
    checks++;
  }
  private static boolean flag(OcrLinePolicy policy, String name) {
    return Boolean.TRUE.equals(policy.diagnostic().get(name));
  }
  public static void main(String[] args) {
    OcrLinePolicy empty = new OcrLinePolicy();
    for (Object value : empty.diagnostic().values()) {
      check("bridge-2".equals(value) || Boolean.FALSE.equals(value));
    }
    OcrLinePolicy textOnly = new OcrLinePolicy();
    textOnly.observeSdkText("SENTINELA-CLINICA 173/97");
    check(flag(textOnly, "sdkTextAsciiDigitPresent"));
    check(flag(textOnly, "sdkAsciiDigitPresent"));
    check(!flag(textOnly, "sdkLinesPresent"));
    check(!flag(textOnly, "bridgeAsciiDigitPresent"));
    OcrLinePolicy blockOnly = new OcrLinePolicy();
    blockOnly.observeSdkText("");
    blockOnly.observeBlockText("SENTINELA-CLINICA 173/97");
    check(flag(blockOnly, "sdkBlockAsciiDigitPresent"));
    check(flag(blockOnly, "sdkAsciiDigitPresent"));
    check(!flag(blockOnly, "sdkTextAsciiDigitPresent"));
    check(!flag(blockOnly, "sdkLineAsciiDigitPresent"));
    check(!flag(blockOnly, "bridgeLinesPresent"));
    OcrLinePolicy whitespace = new OcrLinePolicy();
    whitespace.observeSdkText("  "); whitespace.observeBlockText("  ");
    check(whitespace.accept("  ", true));
    check(!flag(whitespace, "sdkAsciiDigitPresent"));
    OcrLinePolicy valid = new OcrLinePolicy();
    check(valid.accept("SYS 120 DIA 80 PUL 72", true));
    check(flag(valid, "sdkAsciiDigitPresent"));
    check(flag(valid, "bridgeAsciiDigitPresent"));
    check(!flag(valid, "droppedWithoutBox"));
    OcrLinePolicy noDigits = new OcrLinePolicy();
    check(noDigits.accept("SYS DIA PUL OIl １２３", true));
    check(flag(noDigits, "sdkLinesPresent") && flag(noDigits, "bridgeLinesPresent"));
    check(!flag(noDigits, "sdkAsciiDigitPresent") && !flag(noDigits, "bridgeAsciiDigitPresent"));
    check(noDigits.accept("  ", true)); // Não altera a política de tokens vazios.

    OcrLinePolicy missingBox = new OcrLinePolicy();
    check(!missingBox.accept("SENTINELA-CLINICA 173/97", false));
    check(flag(missingBox, "sdkAsciiDigitPresent"));
    check(!flag(missingBox, "bridgeAsciiDigitPresent"));
    check(flag(missingBox, "asciiDigitDroppedWithoutBox"));
    check(!flag(missingBox, "asciiDigitDroppedLongText"));
    check(missingBox.accept("SYS", true));
    check(flag(missingBox, "bridgeLinesPresent"));

    OcrLinePolicy length = new OcrLinePolicy();
    check(length.accept("x".repeat(499) + "7", true));
    check(!length.accept("x".repeat(500) + "8", true));
    check(flag(length, "asciiDigitDroppedLongText"));
    check(flag(length, "bridgeAsciiDigitPresent"));
    OcrLinePolicy onlyLong = new OcrLinePolicy();
    check(!onlyLong.accept("x".repeat(500) + "8", true));
    check(!flag(onlyLong, "bridgeAsciiDigitPresent"));
    check(flag(onlyLong, "sdkAsciiDigitPresent"));
    // A primeira razão continua sendo caixa ausente para linhas com ambos os problemas.
    check(!missingBox.accept("x".repeat(501), false));
    check(!flag(missingBox, "droppedLongText"));

    OcrLinePolicy limited = new OcrLinePolicy();
    for (int i = 0; i < 499; i++) check(limited.accept("SYS", true));
    check(limited.accept("DIA", true)); // 500ª linha incluída.
    Map<String, Object> beforeLimit = limited.diagnostic();
    for (int i = 0; i < 1000; i++) check(!limited.accept("SENTINELA-CLINICA 173/97", true));
    check(flag(limited, "sdkAsciiDigitPresent"));
    check(!flag(limited, "bridgeAsciiDigitPresent"));
    check(flag(limited, "asciiDigitDroppedLineLimit"));
    check(Boolean.FALSE.equals(beforeLimit.get("droppedLineLimit"))); // Snapshot sem mutação tardia.
    OcrLinePolicy rejectedFirst = new OcrLinePolicy();
    for (int i = 0; i < 500; i++) check(!rejectedFirst.accept("SYS", false));
    check(!rejectedFirst.accept("120", true)); // Rejeitados também consomem o limite antigo.
    check(!flag(rejectedFirst, "bridgeLinesPresent"));
    check(flag(rejectedFirst, "asciiDigitDroppedLineLimit"));

    // Comparação com take(500).filter(box).filter(length) do código anterior.
    OcrLinePolicy equivalent = new OcrLinePolicy();
    for (int i = 0; i < 1001; i++) {
      String content = i % 3 == 0 ? "x".repeat(501) : "SYS 120";
      boolean hasBox = i % 5 != 0;
      check(equivalent.accept(content, hasBox) == (i < 500 && hasBox && content.length() <= 500));
    }
    // Nova tentativa não reutiliza flags da anterior.
    check(!flag(new OcrLinePolicy(), "sdkAsciiDigitPresent"));
    for (OcrLinePolicy policy : new OcrLinePolicy[] {
        empty, valid, missingBox, length, limited, rejectedFirst, textOnly, blockOnly, whitespace, equivalent}) {
      check(policy.diagnostic().size() == 14);
      for (Object value : policy.diagnostic().values()) check(value instanceof Boolean || "bridge-2".equals(value));
      check(!policy.diagnostic().toString().contains("SENTINELA"));
      check(!policy.diagnostic().toString().contains("173"));
      check(!policy.diagnostic().toString().contains("97"));
    }
    System.out.println("OcrLinePolicy: " + checks + " checks passed (synthetic; no CameraX/ML Kit proof)");
  }
}
