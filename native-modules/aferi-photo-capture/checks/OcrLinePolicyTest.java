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
      check("bridge-1".equals(value) || Boolean.FALSE.equals(value));
    }
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

    for (OcrLinePolicy policy : new OcrLinePolicy[] {empty, valid, missingBox, length, limited, rejectedFirst}) {
      check(policy.diagnostic().size() == 11);
      for (Object value : policy.diagnostic().values()) check(value instanceof Boolean || "bridge-1".equals(value));
      check(!policy.diagnostic().toString().contains("SENTINELA"));
      check(!policy.diagnostic().toString().contains("173"));
      check(!policy.diagnostic().toString().contains("97"));
    }
    System.out.println("OcrLinePolicy: " + checks + " checks passed (synthetic; no CameraX/ML Kit proof)");
  }
}
