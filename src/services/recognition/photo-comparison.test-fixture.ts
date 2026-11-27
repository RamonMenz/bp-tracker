/** Somente fixtures inventadas para testes; nunca importadas pela demo ou reconhecedor. */
export function photoComparisonFixture() {
  function observation(systolic: number) {
    return { kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000,
      tokens: [`SYS ${systolic}`, 'DIA 80', 'PUL 72'].map((text, index) => ({ text, confidence: null,
        box: { x: 0.2, y: 0.24 + index * 0.08, width: 0.2, height: 0.03 } })),
      bridgeDiagnostic: { revision: 'bridge-2', sdkLinesPresent: true, sdkAsciiDigitPresent: true,
        sdkTextAsciiDigitPresent: true, sdkBlockAsciiDigitPresent: true, sdkLineAsciiDigitPresent: true,
        bridgeLinesPresent: true, bridgeAsciiDigitPresent: true, droppedWithoutBox: false,
        droppedLongText: false, droppedLineLimit: false, asciiDigitDroppedWithoutBox: false,
        asciiDigitDroppedLongText: false, asciiDigitDroppedLineLimit: false },
    };
  }
  return { kind: 'photo-comparison', revision: 'roi-1', original: observation(120), processed: observation(130),
    transformDiagnostic: { revision: 'roi-1', sourceWidth: 1280, sourceHeight: 960, rotation: 90,
      left: 80, top: 240, right: 880, bottom: 640, outputWidth: 1600, outputHeight: 800,
      ownedPixelBytes: 3763200, maxOwnedPixelBytes: 5760000 },
  };
}
