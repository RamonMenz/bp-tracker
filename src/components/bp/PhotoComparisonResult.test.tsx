import { render, screen } from '@testing-library/react-native';

import { parsePhotoComparison } from '@/services/recognition/photo-comparison';
import { photoComparisonFixture } from '@/services/recognition/photo-comparison.test-fixture';

import { PhotoComparisonResult } from './PhotoComparisonResult';

test('original e processado têm rótulos/valores separados e não oferecem confirmação ou edição', async () => {
  await render(<PhotoComparisonResult result={parsePhotoComparison(photoComparisonFixture())} />);
  expect(screen.getByText('Original · quadro completo')).toBeTruthy();
  expect(screen.getByText('Processado · região da guia')).toBeTruthy();
  expect(screen.getByText('SYS: 120 · DIA: 80 · PUL: 72')).toBeTruthy();
  expect(screen.getByText('SYS: 130 · DIA: 80 · PUL: 72')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  expect(screen.queryByText(/Confirmar e salvar/)).toBeNull();
});
