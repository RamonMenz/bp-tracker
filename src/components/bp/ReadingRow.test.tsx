import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Reading } from '@/types/models';

import { ReadingRow } from './ReadingRow';

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    systolic: 128,
    diastolic: 82,
    pulse: 70,
    measuredAt: new Date(2026, 7, 13, 8, 30, 0),
    createdAt: new Date(2026, 7, 13, 8, 30, 0),
    note: null,
    source: 'manual',
    ...overrides,
  };
}

/**
 * Regressão do BUG de acessibilidade: antes desta correção, a única forma de excluir uma medição
 * era o botão dentro de `renderRightActions` do Swipeable — inalcançável por gesto de swipe para
 * quem navega com TalkBack/VoiceOver ou por teclado na web (CLAUDE.md §4.7). O botão persistente
 * abaixo é o caminho garantido, sempre no DOM/árvore de acessibilidade, independente de swipe.
 */
describe('ReadingRow — exclusão acessível', () => {
  it('exclui pelo botão persistente, sem depender do gesto de swipe', async () => {
    const handleRequestDelete = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={handleRequestDelete}
      />,
    );

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    expect(handleRequestDelete).toHaveBeenCalledTimes(1);
    expect(handleRequestDelete).toHaveBeenCalledWith('reading-1');
  });

  /**
   * O botão revelado pelo swipe existe (é o atalho de gesto, mantido a pedido do CLAUDE.md), mas
   * fica escondido da árvore de acessibilidade — sem isso haveria dois elementos com o mesmo
   * rótulo "Excluir medição" na mesma linha, e `getByLabelText` (usado em todo o app e nos testes
   * de história) passaria a ser ambíguo.
   */
  it('expõe só um controle acessível chamado "Excluir medição" por linha', async () => {
    await render(
      <ReadingRow id="reading-1" reading={makeReading()} hasPendingWrites={false} onRequestDelete={jest.fn()} />,
    );

    expect(screen.getAllByLabelText('Excluir medição')).toHaveLength(1);
  });

  it('exclui via accessibilityAction "delete", o caminho que a rotor do leitor de tela usa', async () => {
    const handleRequestDelete = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={handleRequestDelete}
      />,
    );

    const row = screen.getByLabelText(/128 por 82/);
    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });

    expect(handleRequestDelete).toHaveBeenCalledTimes(1);
    expect(handleRequestDelete).toHaveBeenCalledWith('reading-1');
  });

  it('não deixa excluir de novo enquanto a exclusão desta linha já está em voo', async () => {
    const handleRequestDelete = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        isDeleting
        onRequestDelete={handleRequestDelete}
      />,
    );

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    expect(handleRequestDelete).not.toHaveBeenCalled();
  });
});
