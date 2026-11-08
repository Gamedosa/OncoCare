import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TermsScreen } from './TermsScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

describe('TermsScreen', () => {
  it('shows the complete draft as a preview without requesting acceptance', async () => {
    await render(<TermsScreen />);
    expect(screen.getByText('Termos de Uso do ElaConta')).toBeTruthy();
    expect(screen.getByText(/Prévia de uma minuta/)).toBeTruthy();
    expect(screen.getByText(/Responsável ou razão social: Gabriel Melo Dos Santos/)).toBeTruthy();
    expect(screen.getByText(/CPF ou CNPJ: \[CPF a definir\]/)).toBeTruthy();
    expect(screen.getByText('25. Contato')).toBeTruthy();
    expect(screen.getByText('Texto de aceite no cadastro')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /concordo|aceitar/i })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockBack).toHaveBeenCalled();
  });
});
