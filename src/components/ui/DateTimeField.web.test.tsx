import { fireEvent, render, screen, type RenderResult } from '@testing-library/react-native';

import { DateTimeField, type DateTimeFieldProps } from './DateTimeField.web';

const VALUE = new Date(2026, 7, 13, 8, 30, 0);

function renderField(props: Partial<DateTimeFieldProps> = {}): Promise<RenderResult> {
  return render(
    <DateTimeField
      value={VALUE}
      mode="datetime"
      accessibilityLabel="Horário"
      onChange={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
  );
}

/**
 * O contrato desta implementação é a conversão na fronteira: o `<input>` só fala string, o resto
 * do app só fala `Date` (CLAUDE.md §3.2 — nem as rotas nem as features lidam com o formato do DOM).
 * Sem isso o campo volta a ser o que era antes desta correção: um seletor que não devolve nada.
 */
describe('DateTimeField (web)', () => {
  it('entrega um Date no fuso local a partir do valor do input de data e hora', async () => {
    const handleChange = jest.fn();

    await renderField({ accessibilityLabel: 'Horário da medição', onChange: handleChange });

    const input = screen.getByLabelText('Horário da medição');
    // O valor exibido é o local, não o UTC que `toISOString()` produziria.
    expect(input.props.value).toBe('2026-08-13T08:30');

    await fireEvent(input, 'change', { target: { value: '2026-08-12T21:45' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(new Date(2026, 7, 12, 21, 45, 0, 0));
  });

  it('mantém o dia do valor atual ao trocar só o horário', async () => {
    const handleChange = jest.fn();

    await renderField({ mode: 'time', minuteInterval: 15, onChange: handleChange });

    const input = screen.getByLabelText('Horário');
    expect(input.props.value).toBe('08:30');

    await fireEvent(input, 'change', { target: { value: '14:15' } });

    expect(handleChange).toHaveBeenCalledWith(new Date(2026, 7, 13, 14, 15, 0, 0));
  });

  /**
   * `mode="date"` existe para o range de exportação (Prompt 6.3), que filtra por dia — pedir hora
   * ali seria ruído. O input nasce como `type="date"` e a data resultante é sempre meia-noite
   * local, sem herdar a hora do valor atual.
   */
  it('entrega um Date à meia-noite local a partir do valor do input só de data', async () => {
    const handleChange = jest.fn();

    await renderField({ mode: 'date', accessibilityLabel: 'Data', onChange: handleChange });

    const input = screen.getByLabelText('Data');
    expect(input.props.type).toBe('date');
    expect(input.props.value).toBe('2026-08-13');

    await fireEvent(input, 'change', { target: { value: '2026-08-01' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(new Date(2026, 7, 1, 0, 0, 0, 0));
  });

  it('ignora valor vazio ou incompleto no modo date, sem propagar data inválida', async () => {
    const handleChange = jest.fn();

    await renderField({ mode: 'date', accessibilityLabel: 'Data', onChange: handleChange });

    await fireEvent(screen.getByLabelText('Data'), 'change', { target: { value: '' } });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('ignora valor vazio ou incompleto em vez de propagar uma data inválida', async () => {
    const handleChange = jest.fn();

    await renderField({ onChange: handleChange });

    await fireEvent(screen.getByLabelText('Horário'), 'change', { target: { value: '' } });

    expect(handleChange).not.toHaveBeenCalled();
  });

  /**
   * Regressão do efeito colateral que motivou a correção: na web o `onChange` do picker nativo
   * nunca disparava, então o estado "aberto" da tela ficava preso depois do primeiro toque.
   */
  it('avisa que terminou ao pressionar Esc e ao sair do campo', async () => {
    const handleClose = jest.fn();

    await renderField({ onClose: handleClose });

    const input = screen.getByLabelText('Horário');

    await fireEvent(input, 'keyDown', { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    await fireEvent(input, 'blur');
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
