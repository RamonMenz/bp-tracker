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
 * O botão de excluir é sempre visível, sem gesto nenhum envolvido — acessível por toque, teclado
 * na web e TalkBack/VoiceOver igualmente (CLAUDE.md §4.7).
 */
describe('ReadingRow — exclusão acessível', () => {
  it('exclui pelo botão de excluir', async () => {
    const handleRequestDelete = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={handleRequestDelete}
        onRequestEdit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    expect(handleRequestDelete).toHaveBeenCalledTimes(1);
    expect(handleRequestDelete).toHaveBeenCalledWith('reading-1');
  });

  it('expõe só um controle acessível chamado "Excluir medição" por linha', async () => {
    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={jest.fn()}
        onRequestEdit={jest.fn()}
      />,
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
        onRequestEdit={jest.fn()}
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
        onRequestEdit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    expect(handleRequestDelete).not.toHaveBeenCalled();
  });
});

/**
 * A linha era, até aqui, um bloco só de leitura com um único caminho de ação (excluir). O toque
 * para editar mora no MESMO nó acessível que já carrega a leitura da medição — e o botão de
 * excluir segue fora dele, o que é justamente o que impede um de capturar o toque do outro.
 */
describe('ReadingRow — edição', () => {
  it('pede a edição ao tocar no corpo da linha, com o id da medição', async () => {
    const handleRequestEdit = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={jest.fn()}
        onRequestEdit={handleRequestEdit}
      />,
    );

    fireEvent.press(screen.getByLabelText(/128 por 82/));

    expect(handleRequestEdit).toHaveBeenCalledTimes(1);
    expect(handleRequestEdit).toHaveBeenCalledWith('reading-1');
  });

  it('anuncia o corpo da linha como botão, sem mexer no rótulo que já lê a medição', async () => {
    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={jest.fn()}
        onRequestEdit={jest.fn()}
      />,
    );

    const row = screen.getByLabelText(/128 por 82/);

    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityHint).toBe('Toque para editar esta medição.');
  });

  /** O toque de editar não pode "roubar" o do excluir — são dois alvos irmãos, não aninhados. */
  it('não pede edição ao tocar no botão de excluir', async () => {
    const handleRequestEdit = jest.fn();
    const handleRequestDelete = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={handleRequestDelete}
        onRequestEdit={handleRequestEdit}
      />,
    );

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    expect(handleRequestDelete).toHaveBeenCalledWith('reading-1');
    expect(handleRequestEdit).not.toHaveBeenCalled();
  });

  /** Mesma lógica no sentido inverso: editar não dispara a exclusão. */
  it('não exclui ao tocar no corpo da linha', async () => {
    const handleRequestDelete = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        onRequestDelete={handleRequestDelete}
        onRequestEdit={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText(/128 por 82/));

    expect(handleRequestDelete).not.toHaveBeenCalled();
  });

  it('não abre a edição de uma linha que já está sendo excluída', async () => {
    const handleRequestEdit = jest.fn();

    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading()}
        hasPendingWrites={false}
        isDeleting
        onRequestDelete={jest.fn()}
        onRequestEdit={handleRequestEdit}
      />,
    );

    fireEvent.press(screen.getByLabelText(/128 por 82/));

    expect(handleRequestEdit).not.toHaveBeenCalled();
  });
});

/**
 * Antes desta linha, `note` era um campo só de escrita: salvo no Firestore e exportado no CSV,
 * mas sem lugar nenhum no app onde reaparecesse depois de gravado. Esta é a primeira exibição.
 */
describe('ReadingRow — observação', () => {
  it('mostra a observação salva junto da linha', async () => {
    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading({ note: 'Medi após caminhada.' })}
        hasPendingWrites={false}
        onRequestDelete={jest.fn()}
        onRequestEdit={jest.fn()}
      />,
    );

    expect(screen.getByText('Medi após caminhada.')).toBeTruthy();
  });

  it('não mostra nada quando a medição não tem observação', async () => {
    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading({ note: null })}
        hasPendingWrites={false}
        onRequestDelete={jest.fn()}
        onRequestEdit={jest.fn()}
      />,
    );

    // 128/80, "mmHg" e o horário continuam lá — só a linha extra da observação não existe.
    expect(screen.getByText('128/82')).toBeTruthy();
  });

  it('inclui a observação no accessibilityLabel da linha', async () => {
    await render(
      <ReadingRow
        id="reading-1"
        reading={makeReading({ note: 'Medi após caminhada.' })}
        hasPendingWrites={false}
        onRequestDelete={jest.fn()}
        onRequestEdit={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/observação: Medi após caminhada\./)).toBeTruthy();
  });
});
