import { render, screen } from '@testing-library/react-native';

import { ClockIcon } from './icons';
import { SectionHeader } from './SectionHeader';

/**
 * Cobertura da §4.7: título curto continua truncando em 1 linha (comportamento de sempre em
 * Ajustes, LastReadingCard etc.), mas um título longo pode pedir mais linhas via
 * `titleNumberOfLines` — sem essa via de escape o texto seria cortado só por não caber.
 */
describe('SectionHeader', () => {
  it('trunca o título em 1 linha por padrão', async () => {
    await render(<SectionHeader title="Última medição" icon={ClockIcon} />);

    expect(screen.getByText('Última medição').props.numberOfLines).toBe(1);
  });

  it('permite mais linhas para um título longo via titleNumberOfLines', async () => {
    await render(
      <SectionHeader title="Quer confirmar com uma segunda medição?" icon={ClockIcon} titleNumberOfLines={2} />,
    );

    expect(screen.getByText('Quer confirmar com uma segunda medição?').props.numberOfLines).toBe(2);
  });
});
