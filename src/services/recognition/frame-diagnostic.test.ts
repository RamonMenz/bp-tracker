import { describeFrameFailure } from './frame-diagnostic';

const sample = () => ({ revision: 'frame-1', reason: 'frame-size', width: 1920, height: 1080,
  format: 35, rotation: 90, planeCount: 3,
  planes: [{ rowStride: 1920, pixelStride: 1, position: 0, limit: 2073600 }],
});

test('projeta somente motivo, dimensoes e strides tecnicos', () => {
  const lines = describeFrameFailure({ ...sample(), text: 'SENTINELA', image: 'SENTINELA', systolic: 120 });
  expect(lines).toEqual([
    'quadro:motivo=frame-size',
    'quadro:1920x1080; formato=35; planos=3; rot=90',
    'plano0:linha=1920; pixel=1; pos=0; limite=2073600',
  ]);
  expect(JSON.stringify(lines)).not.toContain('SENTINELA');
});

test.each([null, 'SENTINELA', {}, { ...sample(), reason: 'SENTINELA' },
  { ...sample(), width: '1920' }, { ...sample(), height: NaN },
  { ...sample(), rotation: '90' }, { ...sample(), revision: 'unknown' },
])('metadado malformado nao e serializado', value => {
  expect(describeFrameFailure(value)).toEqual([]);
});

test('limita os planos e rejeita campo textual de buffer', () => {
  const data = sample();
  expect(describeFrameFailure({ ...data, planes: Array(50).fill(data.planes[0]) })).toHaveLength(5);
  const result = describeFrameFailure({ ...data, planes: [{ ...data.planes[0], limit: 'SENTINELA' }] });
  expect(result).toHaveLength(2);
  expect(JSON.stringify(result)).not.toContain('SENTINELA');
});
