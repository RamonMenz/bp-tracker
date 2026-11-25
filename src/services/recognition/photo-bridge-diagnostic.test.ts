import { describePhotoBridge } from './photo-bridge-diagnostic';

const sample = () => ({
  revision: 'bridge-1', sdkLinesPresent: true, sdkAsciiDigitPresent: true,
  bridgeLinesPresent: true, bridgeAsciiDigitPresent: false,
  droppedWithoutBox: true, droppedLongText: false, droppedLineLimit: false,
  asciiDigitDroppedWithoutBox: true, asciiDigitDroppedLongText: false, asciiDigitDroppedLineLimit: false,
  frame: { width: 1280, height: 960, rotation: 90, cropMatchesBuffer: true,
    previewViewWidth: 360, previewViewHeight: 300, previewBufferWidth: 1920, previewBufferHeight: 1080 },
});

test('distingue linhas do SDK, tokens exportados e motivo de descarte sem inferir acerto', () => {
  expect(describePhotoBridge(sample())).toEqual([
    'bridge:revisao=bridge-1', 'sdk:linhas=presente', 'sdk:digitos-ascii=presente',
    'bridge:linhas=presente', 'bridge:digitos-ascii=ausente',
    'descarte:sem-caixa=presente', 'descarte:linha-longa=ausente', 'descarte:limite-linhas=ausente',
    'digitos-descartados:sem-caixa=presente', 'digitos-descartados:linha-longa=ausente',
    'digitos-descartados:limite-linhas=ausente',
    'quadro:buffer=1280x960; orientado=960x1280; rot=90', 'quadro:crop-camera=buffer-completo',
    'preview:view=360x300; buffer=1920x1080; escala=fill-center',
    'preview:transformacao-para-analise=nao-estabelecida',
  ]);
});

test.each([0, 90, 180, 270])('dimensões orientadas com rotação %s, sem projetar ROI do preview', rotation => {
  const data = sample(); data.frame.rotation = rotation;
  const upright = rotation % 180 === 0 ? '1280x960' : '960x1280';
  expect(describePhotoBridge(data)).toContain(`quadro:buffer=1280x960; orientado=${upright}; rot=${rotation}`);
  expect(describePhotoBridge(data)).toContain('preview:transformacao-para-analise=nao-estabelecida');
});

test('cropRect parcial e resolução de preview indisponível não são tratados como ROI aplicada', () => {
  const data = sample();
  expect(describePhotoBridge({ ...data, frame: { ...data.frame, cropMatchesBuffer: false,
    previewBufferWidth: null, previewBufferHeight: null } })).toEqual(expect.arrayContaining([
    'quadro:crop-camera=parcial-ignorado', 'preview:view=360x300; buffer=indisponivel; escala=fill-center',
  ]));
});

test('somente booleanos e dimensões técnicas passam: texto/caixas/valores/confiança/hora não passam', () => {
  const sensitive = { text: 'SENTINELA-CLINICA 173/97', tokens: ['SENTINELA'], systolic: 173,
    capturedAtMs: 1793001600000, confidence: 0.873, box: { x: 0.123, y: 0.456 } };
  const data = sample();
  const report = describePhotoBridge({ ...data, ...sensitive, frame: { ...data.frame, ...sensitive } });
  expect(report).toEqual(describePhotoBridge(data));
  expect(report.join(' ')).not.toMatch(/SENTINELA|173|97|1793001600000|0\.873|0\.123|0\.456|tokens|confidence|capturedAtMs/);
});

test.each([null, [], 'SENTINELA', {}, { ...sample(), revision: 'SENTINELA' },
  { ...sample(), sdkAsciiDigitPresent: 'SENTINELA' }, { ...sample(), bridgeLinesPresent: 1 },
  { ...sample(), asciiDigitDroppedLineLimit: null },
])('diagnóstico ausente/antigo/malformado é indisponível, nunca ausência de dígitos', value => {
  expect(describePhotoBridge(value)).toEqual(['bridge:diagnostico-indisponivel']);
});

test.each([
  { width: 0 }, { height: 959 }, { width: 1920, height: 1080 }, { rotation: '90' },
  { rotation: 45 }, { previewViewWidth: NaN }, { previewViewHeight: Infinity },
  { previewBufferWidth: null }, { previewBufferHeight: -1 }, { cropMatchesBuffer: 'SENTINELA' },
  { width: 'SENTINELA' }, { previewBufferWidth: 100001 },
])('geometria inválida é isolada sem perder os sinais da bridge ou refletir dados: %s', fields => {
  const data = sample();
  const report = describePhotoBridge({ ...data, frame: { ...data.frame, ...fields } });
  expect(report).toContain('sdk:digitos-ascii=presente');
  expect(report.at(-1)).toBe('quadro:geometria-indisponivel');
  expect(report.join(' ')).not.toMatch(/SENTINELA|NaN|Infinity/);
  expect(report).not.toContain('sdk:digitos-ascii=ausente');
});
