import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/shared/query/testing';
import type { Profile } from '@/features/auth/schemas';
import { DiaryDayScreen } from './DiaryDayScreen';

let mockProfile: Profile;
let mockParams: { day: string; patientId?: string };
let mockLinked: unknown;
const mockPush = jest.fn();
jest.mock('@/features/auth/AuthProvider', () => ({ useSignedInAuth: () => ({ profile: mockProfile }) }));
jest.mock('@/features/patients/hooks', () => ({ useLinkedPatient: () => ({ data: mockLinked }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../dayHooks', () => ({
  useDiaryDayEntries: () => ({
    entries: [{
      id: '00000000-0000-4000-8000-000000000002', content: 'Registro fictício', mood: null,
      createdAt: new Date('2026-11-07T13:00:00Z'), hasAudio: false,
    }],
  }),
}));
jest.mock('@/shared/supabase/client', () => ({ supabase: {} }));
const PATIENT = '00000000-0000-4000-8000-000000000001';
describe('diary day screen', () => {
  beforeEach(() => {
    mockProfile = { id: PATIENT, role: 'patient', displayName: null };
    mockParams = { day: '2026-11-07', patientId: PATIENT };
    mockLinked = { id: PATIENT };
    mockPush.mockReset();
  });
  it('opens individual patient entries without merging their content', async () => {
    await renderWithQuery(<DiaryDayScreen />);
    await fireEvent.press(screen.getByText('Registro fictício'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/patient/entries/[id]', params: { id: '00000000-0000-4000-8000-000000000002' } });
    expect(screen.getByText(/Registros individuais/)).toBeTruthy();
  });
  it('keeps psychologist day entries read-only', async () => {
    mockProfile = { id: '00000000-0000-4000-8000-000000000003', role: 'psychologist', displayName: null };
    await renderWithQuery(<DiaryDayScreen />);
    expect(screen.getByText(/Visualização somente leitura/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Novo relato' })).toBeNull();
    await fireEvent.press(screen.getByText('Registro fictício'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/psychologist/patients/[patientId]/entries/[id]',
      params: { patientId: PATIENT, id: '00000000-0000-4000-8000-000000000002' },
    });
  });
  it('hides entries after unlinking', async () => {
    mockProfile = { id: '00000000-0000-4000-8000-000000000003', role: 'psychologist', displayName: null };
    mockLinked = null;
    await renderWithQuery(<DiaryDayScreen />);
    expect(screen.getByText('Este conteúdo não está mais disponível para você.')).toBeTruthy();
    expect(screen.queryByText('Registro fictício')).toBeNull();
  });
  it('reports invalid day links', async () => {
    mockParams = { day: 'invalid' };
    await renderWithQuery(<DiaryDayScreen />);
    expect(screen.getByText(/Dia ou paciente inválido/)).toBeTruthy();
    expect(screen.queryByText('Registro fictício')).toBeNull();
  });
});
