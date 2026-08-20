import { fireEvent, render, screen } from '@testing-library/react-native';

import { CATEGORY_LABEL } from '@/components/bp/BpCategoryBadge';
import type { BpCategory } from '@/domain/bp-classification';

import { OnboardingScreen } from './OnboardingScreen';

const ALL_CATEGORIES: BpCategory[] = ['normal', 'elevated', 'stage1', 'stage2', 'crisis'];

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Avança do passo 1 até o passo informado tocando "Próximo" — o mesmo caminho do usuário.
 *
 * O `await` em cada toque não é enfeite: nesta versão do @testing-library/react-native
 * `fireEvent.press` devolve uma Promise, e sem esperá-la a asserção seguinte roda antes de o
 * React aplicar a troca de passo.
 */
async function goToStep(stepNumber: number): Promise<void> {
  for (let current = 1; current < stepNumber; current += 1) {
    await fireEvent.press(screen.getByLabelText('Próximo'));
  }
}

describe('OnboardingScreen — navegação entre passos', () => {
  it('avança do passo 1 ao 4 tocando "Próximo" três vezes', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    expect(screen.getByText('Bem-vindo(a) ao BP Tracker')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Próximo'));
    expect(screen.getByText('Como medir corretamente')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Próximo'));
    expect(screen.getByText('O que significa cada categoria')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Próximo'));
    expect(screen.getByText('Pronto para começar')).toBeTruthy();

    // No último passo o "Próximo" dá lugar aos dois caminhos de conclusão — mostrar os três ao
    // mesmo tempo daria dois significados diferentes para "seguir em frente".
    expect(screen.queryByLabelText('Próximo')).toBeNull();
    expect(screen.getByLabelText('Começar a registrar')).toBeTruthy();
    expect(screen.getByLabelText('Configurar lembretes')).toBeTruthy();
  });

  it('volta ao passo anterior ao tocar "Voltar"', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    await goToStep(2);
    expect(screen.getByText('Como medir corretamente')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(screen.getByText('Bem-vindo(a) ao BP Tracker')).toBeTruthy();
    expect(screen.queryByText('Como medir corretamente')).toBeNull();
  });

  /** Não há passo anterior ao primeiro — oferecer "Voltar" ali seria um botão que não faz nada. */
  it('não oferece "Voltar" no passo 1', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    expect(screen.queryByLabelText('Voltar')).toBeNull();
  });

  /**
   * Simétrico ao passo 1, mas por outro motivo: o passo final é uma tela de fechamento com dois
   * caminhos de conclusão, e uma terceira ação ali faria as três competirem entre si.
   */
  it('não oferece "Voltar" no passo 4', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    await goToStep(4);

    expect(screen.queryByLabelText('Voltar')).toBeNull();
  });
});

describe('OnboardingScreen — saídas da apresentação', () => {
  it('chama onFinish ao tocar "Pular" no passo 1', async () => {
    const onFinish = jest.fn();
    await render(<OnboardingScreen onFinish={onFinish} />);

    await fireEvent.press(screen.getByLabelText('Pular apresentação'));

    expect(onFinish).toHaveBeenCalledTimes(1);
    // Sem argumento nenhum — e não com o evento de toque do Pressable, que é o que um
    // `onPress={onFinish}` cru entregaria no lugar do destino.
    expect(onFinish).toHaveBeenCalledWith();
  });

  it('chama onFinish ao tocar "Começar a registrar" no passo 4', async () => {
    const onFinish = jest.fn();
    await render(<OnboardingScreen onFinish={onFinish} />);

    await goToStep(4);
    await fireEvent.press(screen.getByLabelText('Começar a registrar'));

    expect(onFinish).toHaveBeenCalledTimes(1);
    // Concluir não pede destino: a rota manda o usuário para a Home, o caminho padrão de saída.
    expect(onFinish).toHaveBeenCalledWith();
  });

  /**
   * "Configurar lembretes" sai pelo MESMO `onFinish` das outras saídas, só que pedindo um destino.
   * A tela não navega: quem traduz `'settings'` em rota é `app/onboarding`. Este teste é o que
   * trava esse contrato — se alguém voltar a chamar o roteador daqui, ele continua passando, mas
   * a ausência de qualquer mock de expo-router neste arquivo faz o componente quebrar.
   */
  it('encerra a apresentação pedindo o destino Ajustes ao tocar "Configurar lembretes"', async () => {
    const onFinish = jest.fn();
    await render(<OnboardingScreen onFinish={onFinish} />);

    await goToStep(4);
    await fireEvent.press(screen.getByLabelText('Configurar lembretes'));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith('settings');
  });
});

/**
 * Passo que deu nome à Sugestão de Produto #7 do roadmap: como medir, não o que o valor significa.
 * Vem antes das categorias de propósito — a orientação de manuseio é o que o usuário precisa ANTES
 * da primeira medição; a leitura do resultado só importa depois que existe um resultado.
 */
describe('OnboardingScreen — passo da técnica de medição', () => {
  it('mostra as quatro orientações de medição no passo 2', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    await goToStep(2);

    expect(screen.getByText('Como medir corretamente')).toBeTruthy();
    expect(screen.getByText(/Descanse 5 minutos sentado\(a\) e em silêncio/)).toBeTruthy();
    expect(screen.getByText(/Apoie o braço na altura do coração/)).toBeTruthy();
    expect(screen.getByText(/Mantenha os pés apoiados no chão/)).toBeTruthy();
    expect(screen.getByText(/espere cerca de 1 minuto/)).toBeTruthy();
  });

  /**
   * O texto sobre a segunda medição descreve um comportamento REAL do app (o card sugerido por
   * `useSecondMeasurementFlow` na tela de registro), não uma promessa futura.
   */
  it('conta que o próprio app sugere a segunda medição', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    await goToStep(2);

    expect(screen.getByText(/o app sugere isso automaticamente depois da primeira medição/)).toBeTruthy();
  });

  it('fica entre a apresentação das funcionalidades e as categorias', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    // Passo 1: ainda não apareceu.
    expect(screen.queryByText('Como medir corretamente')).toBeNull();

    await goToStep(2);
    expect(screen.getByText('Como medir corretamente')).toBeTruthy();
    // E não divide a tela com o passo seguinte.
    expect(screen.queryByText('O que significa cada categoria')).toBeNull();

    // Um toque a mais a partir daqui — `goToStep` conta sempre do passo 1.
    await fireEvent.press(screen.getByLabelText('Próximo'));
    expect(screen.getByText('O que significa cada categoria')).toBeTruthy();
    expect(screen.queryByText('Como medir corretamente')).toBeNull();
  });
});

describe('OnboardingScreen — passo das categorias', () => {
  it('mostra as 5 categorias com os rótulos de CATEGORY_LABEL', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    await goToStep(3);

    for (const category of ALL_CATEGORIES) {
      expect(screen.getByText(CATEGORY_LABEL[category])).toBeTruthy();
    }
  });

  /**
   * CLAUDE.md §1: o app registra, não diagnostica. A tela que ensina as categorias é justamente
   * onde esse aviso não pode faltar.
   */
  it('mantém o aviso de que a classificação não substitui avaliação médica', async () => {
    await render(<OnboardingScreen onFinish={jest.fn()} />);

    await goToStep(3);

    expect(screen.getByText(/não substitui avaliação médica/)).toBeTruthy();
  });
});
