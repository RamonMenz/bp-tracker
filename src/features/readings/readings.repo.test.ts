import { addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

import { logError } from '@/lib/logger';
import type { ReadingInput } from '@/types/models';

import { addReading, updateReading, deleteReading, getAllReadings } from './readings.repo';

jest.mock('@/services/firebase', () => ({ firestore: {} }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(), getDocs: jest.fn(), query: jest.fn(), orderBy: jest.fn(), serverTimestamp: () => 'SERVER-TIME',
  collection: (_db: unknown, path: string) => path, doc: (_db: unknown, path: string) => path,
}));
const mockAdd = jest.mocked(addDoc);
const mockUpdate = jest.mocked(updateDoc);
const INPUT: ReadingInput = { systolic: 125, diastolic: 85, pulse: null, note: null,
  measuredAt: new Date('2026-01-02T10:00:00Z'), source: 'manual', sessionReadings: null };
beforeEach(() => {
  jest.clearAllMocks();
  mockAdd.mockResolvedValue({ id: 'synthetic-id' } as Awaited<ReturnType<typeof addDoc>>);
  mockUpdate.mockResolvedValue(undefined);
});
test.each(['manual', 'photo', 'voice'] as const)('cria %s no caminho do dono, somente whitelist e timestamp do servidor', async source => {
  await expect(addReading('alice', { ...INPUT, source })).resolves.toBe('synthetic-id');
  expect(mockAdd).toHaveBeenCalledWith('users/alice/readings', { ...INPUT, source, createdAt: 'SERVER-TIME' });
});
test('update preserva source existente por omissão, createdAt e detalhes da sessão', async () => {
  const input = { ...INPUT, sessionReadings: [
    { systolic: 120, diastolic: 80, pulse: 70 }, { systolic: 130, diastolic: 90, pulse: 80 },
  ] as ReadingInput['sessionReadings'] };
  await updateReading('alice', 'reading-1', input);
  const { source: _source, ...changes } = input;
  expect(mockUpdate).toHaveBeenCalledWith('users/alice/readings/reading-1', changes);
  expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('source');
  expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('createdAt');
});
test.each(['transcript', 'audio', 'image', 'rawText', 'confidence'])('repositório recusa %s antes de chegar ao SDK', async key => {
  await expect(addReading('alice', { ...INPUT, [key]: 'SENTINELA' })).rejects.toThrow('Não foi possível salvar');
  expect(mockAdd).not.toHaveBeenCalled();
});
test('erro bruto de SDK na atualização não chega ao logger', async () => {
  mockUpdate.mockRejectedValue(new Error('SENTINELA-CLINICA'));
  await expect(updateReading('alice', 'reading-1', INPUT)).rejects.toThrow('Não foi possível salvar');
  expect(logError).toHaveBeenCalledWith('readings.update', new Error('reading-update-failed'), { uid: 'alice' });
});

test('exclusão não encaminha mensagem potencialmente clínica do SDK ao logger', async () => {
  jest.mocked(deleteDoc).mockRejectedValue(Object.assign(new Error('SENTINELA-SINTETICA'), { code: 'permission-denied' }));
  await expect(deleteReading('alice', 'synthetic-id')).rejects.toThrow('Sem permissão para excluir');
  expect(logError).toHaveBeenCalledWith('readings.delete', new Error('reading-delete-failed'), { uid: 'alice' });
});
test('export descarta documento inválido sem logar conteúdo do erro e preserva os válidos', async () => {
  const good = { ...INPUT, createdAt: INPUT.measuredAt };
  const bad = { ...good, measuredAt: { toDate: () => { throw new Error('SENTINELA-SINTETICA'); } } };
  jest.mocked(getDocs).mockResolvedValue({ docs: [
    { id: 'bad-synthetic', data: () => bad }, { id: 'good-synthetic', data: () => good },
  ] } as unknown as Awaited<ReturnType<typeof getDocs>>);
  expect(await getAllReadings('alice')).toHaveLength(1);
  expect(logError).toHaveBeenCalledWith('readings.parse', new Error('reading-parse-failed'), { uid: 'alice', docId: 'bad-synthetic' });
});
