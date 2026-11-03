import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithQuery } from '@/shared/query/testing';

import type { DiaryEntry } from '../schemas';
import type { RecordedAudio } from '@/features/audio/recordingFile';
import { EntryForm } from './EntryForm';

const mockBack = jest.fn();
const mockAllowLeave = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  usePreventRemove: () => mockAllowLeave,
}));
const mockRecording: RecordedAudio = {
  uri: 'file:///synthetic.m4a', bytes: new ArrayBuffer(2),
  contentType: 'audio/mp4', extension: 'm4a', dispose: jest.fn(),
};
jest.mock('@/features/audio/components/RecordingInput', () => {
  const { Button, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    RecordingInput: ({ onChange, onBusyChange }: {
      onChange: (audio: RecordedAudio) => void; onBusyChange: (busy: boolean) => void;
    }) => (
      <View>
        <Button title="Preparar áudio sintético" onPress={() => onChange(mockRecording)} />
        <Button title="Iniciar gravação sintética" onPress={() => onBusyChange(true)} />
      </View>
    ),
  };
});
jest.mock('@/features/audio/saveRecording', () => {
  class AudioSaveRecoveryError extends Error {}
  class AudioCleanupPendingError extends AudioSaveRecoveryError {}
  return { AudioSaveRecoveryError, AudioCleanupPendingError };
});

const savedEntry: DiaryEntry = {
  id: '00000000-0000-4000-8000-000000000010',
  patientId: '00000000-0000-4000-8000-000000000001',
  content: 'Hoje foi melhor.',
  mood: 4,
  hasAudio: false,
  audioPath: null,
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

  it('saves an audio-only draft with the recording bytes', async () => {
    const onSave = jest.fn<(draft: unknown, audio?: RecordedAudio | null) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(<EntryForm title="Novo relato" saving={false} saveError={null} onSave={onSave} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Preparar áudio sintético' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith({ content: null, mood: null }, mockRecording);
  });

  it('disables saving while recording even when text is present', async () => {
    const onSave = jest.fn<(draft: unknown) => Promise<DiaryEntry>>();
    await renderWithQuery(<EntryForm title="Novo relato" saving={false} saveError={null} onSave={onSave} />);
    await fireEvent.changeText(screen.getByLabelText('Quer contar mais?'), 'Texto');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar gravação sintética' }));
    expect(screen.getByRole('button', { name: 'Salvar' }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('requires confirmation and text before removing an audio-only entry', async () => {
    const onSave = jest.fn<(draft: unknown, audio?: RecordedAudio | null) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(
      <EntryForm title="Editar relato" entry={{ ...savedEntry, content: null, hasAudio: true, audioPath: 'patient/old.m4a' }}
        saving={false} saveError={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Remover áudio' }));
    expect(screen.getByText('Remover áudio?')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Remover ao salvar' }));
    expect(screen.getByRole('button', { name: 'Salvar' }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText('Quer contar mais?'), '  Texto para manter  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith({ content: 'Texto para manter', mood: 4 }, null);
  });

  it('keeps the original audio when removal is cancelled', async () => {
    const onSave = jest.fn<(draft: unknown, audio?: RecordedAudio | null) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(
      <EntryForm title="Editar relato" entry={{ ...savedEntry, hasAudio: true, audioPath: 'patient/old.m4a' }}
        saving={false} saveError={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Remover áudio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Manter áudio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith({ content: savedEntry.content, mood: 4 });
  });

  it('requires a new recording for replacement, even if text is present', async () => {
    const onSave = jest.fn<(draft: unknown, audio?: RecordedAudio | null) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(
      <EntryForm title="Editar relato" entry={{ ...savedEntry, hasAudio: true, audioPath: 'patient/old.m4a' }}
        saving={false} saveError={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Substituir áudio' }));
    expect(screen.getByRole('button', { name: 'Salvar' }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Preparar áudio sintético' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith({ content: savedEntry.content, mood: 4 }, mockRecording);
  });

  it('can discard a replacement and save while preserving the original', async () => {
    const onSave = jest.fn<(draft: unknown, audio?: RecordedAudio | null) => Promise<DiaryEntry>>().mockResolvedValue(savedEntry);
    await renderWithQuery(
      <EntryForm title="Editar relato" entry={{ ...savedEntry, content: null, hasAudio: true, audioPath: 'patient/old.m4a' }}
        saving={false} saveError={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Substituir áudio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Preparar áudio sintético' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Manter áudio original' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith({ content: null, mood: 4 });
  });
});
