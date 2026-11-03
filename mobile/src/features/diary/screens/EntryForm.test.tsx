import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithQuery } from '@/shared/query/testing';

import type { DiaryEntry } from '../schemas';
import { EntryForm } from './EntryForm';

const mockBack = jest.fn();
const mockAllowLeave = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  usePreventRemove: () => mockAllowLeave,
}));

const savedEntry: DiaryEntry = {
  id: '00000000-0000-4000-8000-000000000010',
  patientId: '00000000-0000-4000-8000-000000000001',
  content: 'Hoje foi melhor.',
  mood: 4,
  hasAudio: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EntryForm', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockAllowLeave.mockReset();
  });

  it('keeps save disabled until there is text', async () => {
    const onSave = jest.fn<(d: unknown) => Promise<DiaryEntry>>();
    await renderWithQuery(<EntryForm title="Novo relato" saving={false} saveError={null} onSave={onSave} />);

    const save = screen.getByRole('button', { name: 'Salvar' });
    expect(save.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText('Quer contar mais?'), '   ');
    expect(screen.getByRole('button', { name: 'Salvar' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves trimmed text with the selected mood and goes mockBack', async () => {
    const onSave = jest.fn<(d: unknown) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(<EntryForm title="Novo relato" saving={false} saveError={null} onSave={onSave} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Bem' }));
    await fireEvent.changeText(screen.getByLabelText('Quer contar mais?'), '  Hoje foi melhor.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSave).toHaveBeenCalledWith({ content: 'Hoje foi melhor.', mood: 4 });
    expect(mockAllowLeave).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('keeps the draft and explains when offline', async () => {
    const offline = { message: 'TypeError: Network request failed', code: '' };
    const onSave = jest.fn<(d: unknown) => Promise<DiaryEntry>>().mockRejectedValue(offline);
    await renderWithQuery(
      <EntryForm title="Editar relato" entry={savedEntry} saving={false} saveError={offline} onSave={onSave} />,
    );

    expect(screen.getByDisplayValue('Hoje foi melhor.')).toBeTruthy();
    expect(screen.getByText(/Você está sem internet/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('allows an empty text when the entry already has audio', async () => {
    const onSave = jest.fn<(d: unknown) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(
      <EntryForm
        title="Editar relato"
        entry={{ ...savedEntry, content: null, hasAudio: true }}
        saving={false}
        saveError={null}
        onSave={onSave}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSave).toHaveBeenCalledWith({ content: null, mood: 4 });
  });
});
