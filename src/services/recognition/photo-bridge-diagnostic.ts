const FLAGS = [
  ['sdkLinesPresent', 'sdk:linhas'],
  ['sdkAsciiDigitPresent', 'sdk:digitos-ascii'],
  ['bridgeLinesPresent', 'bridge:linhas'],
  ['bridgeAsciiDigitPresent', 'bridge:digitos-ascii'],
  ['droppedWithoutBox', 'descarte:sem-caixa'],
  ['droppedLongText', 'descarte:linha-longa'],
  ['droppedLineLimit', 'descarte:limite-linhas'],
  ['asciiDigitDroppedWithoutBox', 'digitos-descartados:sem-caixa'],
  ['asciiDigitDroppedLongText', 'digitos-descartados:linha-longa'],
  ['asciiDigitDroppedLineLimit', 'digitos-descartados:limite-linhas'],
] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function dimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 100000;
}
function describeGeometry(value: unknown): readonly string[] {
  const frame = record(value);
  if (!frame || !dimension(frame.width) || !dimension(frame.height)
    || frame.width % 2 !== 0 || frame.height % 2 !== 0 || frame.width * frame.height > 1920000
    || typeof frame.rotation !== 'number' || ![0, 90, 180, 270].includes(frame.rotation)
    || typeof frame.cropMatchesBuffer !== 'boolean'
    || !dimension(frame.previewViewWidth) || !dimension(frame.previewViewHeight)
    || !((frame.previewBufferWidth === null && frame.previewBufferHeight === null)
      || (dimension(frame.previewBufferWidth) && dimension(frame.previewBufferHeight)))) {
    return ['quadro:geometria-indisponivel'];
  }
  const swapsAxes = frame.rotation === 90 || frame.rotation === 270;
  const uprightWidth = swapsAxes ? frame.height : frame.width;
  const uprightHeight = swapsAxes ? frame.width : frame.height;
  const previewBuffer = frame.previewBufferWidth === null ? 'indisponivel'
    : `${frame.previewBufferWidth}x${frame.previewBufferHeight}`;
  return [
    `quadro:buffer=${frame.width}x${frame.height}; orientado=${uprightWidth}x${uprightHeight}; rot=${frame.rotation}`,
    frame.cropMatchesBuffer ? 'quadro:crop-camera=buffer-completo' : 'quadro:crop-camera=parcial-ignorado',
    `preview:view=${frame.previewViewWidth}x${frame.previewViewHeight}; buffer=${previewBuffer}; escala=fill-center`,
    'preview:transformacao-para-analise=nao-estabelecida',
  ];
}

/** Só na revisão da demo; APK antigo/malformado nunca equivale a SDK sem dígitos. */
export function describePhotoBridge(value: unknown): readonly string[] {
  const data = record(value);
  if (!data || data.revision !== 'bridge-1' || !FLAGS.every(([key]) => typeof data[key] === 'boolean')) {
    return ['bridge:diagnostico-indisponivel'];
  }
  return [
    'bridge:revisao=bridge-1',
    ...FLAGS.map(([key, label]) => `${label}=${data[key] ? 'presente' : 'ausente'}`),
    ...describeGeometry(data.frame),
  ];
}
