import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '@/features/auth/useSession';

import { addReading } from './readings.repo';
import { useAddReading } from './useAddReading';

jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('./readings.repo', () => ({ addReading: jest.fn() }));
test('hook manual continua manual mesmo com origem e conteúdo assistido injetados em runtime', async () => {
  jest.mocked(useSession).mockReturnValue({ user: { uid: 'alice' }, isLoading: false } as ReturnType<typeof useSession>);
  jest.mocked(addReading).mockResolvedValue('synthetic-id');
  const { result } = await renderHook(useAddReading);
  const values = { systolic: '120', diastolic: '80', pulse: '', note: '',
    measuredAt: new Date('2026-01-02T10:00:00Z'), source: 'photo', transcript: 'SENTINELA' };
  await act(async () => { await result.current.addReading(values); });
  expect(addReading).toHaveBeenCalledWith('alice', { systolic: 120, diastolic: 80, pulse: null,
    note: null, measuredAt: values.measuredAt, source: 'manual', sessionReadings: null });
});
