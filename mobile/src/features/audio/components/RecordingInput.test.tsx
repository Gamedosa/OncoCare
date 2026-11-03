import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as files from '../recordingFile';
import type { RecordedAudio } from '../recordingFile';
import { RecordingInput } from './RecordingInput';

const mockRecorder = {
  isRecording: false,
  uri: 'file:///synthetic.m4a',
  prepareToRecordAsync: jest.fn<() => Promise<void>>(),
  record: jest.fn(() => { mockRecorder.isRecording = true; }),
  stop: jest.fn<() => Promise<void>>(),
};
const mockPlayer = { pause: jest.fn(), play: jest.fn(), replace: jest.fn(), seekTo: jest.fn() };
const mockPermission = jest.fn<() => Promise<{ granted: boolean }>>();
const mockMode = jest.fn<() => Promise<void>>();
jest.mock('expo-audio', () => ({
  AudioModule: { requestRecordingPermissionsAsync: () => mockPermission() },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: () => mockMode(),
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => ({
    isRecording: mockRecorder.isRecording, durationMillis: 1500, fileSize: 2,
  }),
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => ({ isLoaded: true, playing: false, error: null }),
}));
jest.mock('../recordingFile', () => ({ readRecording: jest.fn(), discardRecording: jest.fn() }));
jest.mock('../audioRepository', () => ({ MAX_AUDIO_BYTES: 10_485_760, validateRecording: jest.fn() }));
const read = jest.mocked(files.readRecording);
const discard = jest.mocked(files.discardRecording);
const dispose = jest.fn();
const audio: RecordedAudio = {
  uri: 'file:///synthetic.m4a', bytes: new ArrayBuffer(2),
  contentType: 'audio/mp4', extension: 'm4a', dispose,
};

describe('RecordingInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.isRecording = false;
    mockRecorder.prepareToRecordAsync.mockResolvedValue(undefined);
    mockRecorder.stop.mockImplementation(async () => { mockRecorder.isRecording = false; });
    mockPermission.mockResolvedValue({ granted: true });
    mockMode.mockResolvedValue(undefined);
    read.mockResolvedValue(audio);
  });

  it('requests permission only on demand and emits audio after stopping', async () => {
    const change = jest.fn();
    const busy = jest.fn();
    const result = await render(<RecordingInput disabled={false} onChange={change} onBusyChange={busy} />);
    expect(mockPermission).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Gravar áudio' }));
    expect(await screen.findByText('Gravando: 1 segundos')).toBeTruthy();
    expect(mockRecorder.record).toHaveBeenCalled();
    expect(busy).toHaveBeenCalledWith(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Finalizar gravação' }));
    expect(await screen.findByText('Áudio pronto. Ele será enviado ao salvar o relato.')).toBeTruthy();
    expect(change).toHaveBeenCalledWith(audio);
    expect(busy).toHaveBeenLastCalledWith(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvir antes de enviar' }));
    expect(mockPlayer.play).toHaveBeenCalled();
    await result.unmount();
    expect(dispose).toHaveBeenCalled();
  });

  it('does not record when permission is denied and releases the busy state', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    const busy = jest.fn();
    await render(<RecordingInput disabled={false} onChange={jest.fn()} onBusyChange={busy} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gravar áudio' }));
    expect(await screen.findByText('Não foi possível iniciar. Confira a permissão do microfone e tente novamente.')).toBeTruthy();
    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it('cancels without publishing a draft and removes the temporary recording', async () => {
    const change = jest.fn();
    await render(<RecordingInput disabled={false} onChange={change} onBusyChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gravar áudio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar gravação' }));
    expect(discard).toHaveBeenCalledWith('file:///synthetic.m4a');
    expect(read).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('cleans a finished recording when the patient discards it', async () => {
    const change = jest.fn();
    await render(<RecordingInput disabled={false} onChange={change} onBusyChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gravar áudio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Finalizar gravação' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Descartar gravação' }));
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenLastCalledWith(null);
  });
});
