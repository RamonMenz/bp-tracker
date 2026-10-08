import { fireEvent, render, screen } from '@testing-library/react-native';

import { CONSENT_AUTHORIZATION_TEXT, ConsentScreen, type ConsentScreenProps } from './ConsentScreen';

function renderScreen(overrides: Partial<ConsentScreenProps> = {}) {
  const props: ConsentScreenProps = {
    onAccept: jest.fn(),
    onSignOut: jest.fn(),
    onOpenPrivacyPolicy: jest.fn(),
    isSaving: false,
    isSigningOut: false,
    error: null,
    ...overrides,
  };

  return { props, rendered: render(<ConsentScreen {...props} />) };
}

describe('ConsentScreen', () => {
  it('mostra o texto exato da autorização, desmarcado por padrão', async () => {
    const { rendered } = renderScreen();
    await rendered;

    const checkbox = screen.getByRole('checkbox', { name: CONSENT_AUTHORIZATION_TEXT });
    expect(checkbox.props.accessibilityState?.checked).toBe(false);
    expect(CONSENT_AUTHORIZATION_TEXT).toBe(
      'Autorizo o tratamento dos meus dados de pressão arterial para registro e lembretes',
    );
  });

  it('não deixa continuar sem marcar a autorização', async () => {
    const { props, rendered } = renderScreen();
    await rendered;

    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(continueButton);

    expect(props.onAccept).not.toHaveBeenCalled();
  });

  it('registra o aceite depois de marcar a autorização e tocar em Continuar', async () => {
    const { props, rendered } = renderScreen();
    await rendered;

    await fireEvent.press(screen.getByRole('checkbox', { name: CONSENT_AUTHORIZATION_TEXT }));

    expect(screen.getByRole('checkbox', { name: CONSENT_AUTHORIZATION_TEXT }).props.accessibilityState?.checked).toBe(
      true,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(props.onAccept).toHaveBeenCalledTimes(1);
  });

  it('desmarcar de novo volta a bloquear o Continuar', async () => {
    const { props, rendered } = renderScreen();
    await rendered;

    const checkbox = screen.getByRole('checkbox', { name: CONSENT_AUTHORIZATION_TEXT });
    await fireEvent.press(checkbox);
    await fireEvent.press(screen.getByRole('checkbox', { name: CONSENT_AUTHORIZATION_TEXT }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(props.onAccept).not.toHaveBeenCalled();
  });

  it('"Não autorizo" explica que o app não funciona sem a autorização e só sai com confirmação', async () => {
    const { props, rendered } = renderScreen();
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Não autorizo' }));

    expect(screen.getByText('Sem autorização, o app não funciona')).toBeTruthy();
    expect(props.onSignOut).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(props.onSignOut).toHaveBeenCalledTimes(1);
    expect(props.onAccept).not.toHaveBeenCalled();
  });

  it('"Voltar" no aviso fecha sem sair', async () => {
    const { props, rendered } = renderScreen();
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Não autorizo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(props.onSignOut).not.toHaveBeenCalled();
  });

  it('abre a política completa pelo link', async () => {
    const { props, rendered } = renderScreen();
    await rendered;

    await fireEvent.press(screen.getByRole('link', { name: 'Ler a política de privacidade completa' }));

    expect(props.onOpenPrivacyPolicy).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro amigável recebido', async () => {
    const { rendered } = renderScreen({ error: 'Não foi possível registrar sua autorização. Tente novamente.' });
    await rendered;

    expect(screen.getByText('Não foi possível registrar sua autorização. Tente novamente.')).toBeTruthy();
  });
});
