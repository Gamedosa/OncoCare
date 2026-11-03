import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { AudioStatus } from 'expo-audio';
import { Alert, AppState } from 'react-native';

import * as repository from '../audioRepository';
import * as files from '../localAudio';
import { useAudioPlayback } from '../hooks';
import { EntryAudioPlayer, formatAudioTime } from './EntryAudioPlayer';

const mockPlayer = {
  pause: jest.fn(),
  play: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn<(seconds: number) => Promise<void>>().mockResolvedValue(undefined),
};
let mockStatus: Pick<AudioStatus, 'playing' | 'isLoaded' | 'isBuffering' | 'didJustFinish' | 'currentTime' | 'duration' | 'error'>;
const mockMode = jest.fn<() => Promise<void>>();
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
  setAudioModeAsync: () => mockMode(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../audioRepository', () => ({ downloadAudio: jest.fn() }));
jest.mock('../localAudio', () => ({ createLocalAudio: jest.fn() }));
const download = jest.mocked(repository.downloadAudio);
const createLocal = jest.mocked(files.createLocalAudio);
const dispose = jest.fn();

describe('EntryAudioPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
    mockMode.mockResolvedValue(undefined);
    mockStatus = {
      playing: false, isLoaded: true, isBuffering: false, didJustFinish: false,
      currentTime: 0, duration: 65, error: null,
    };
    download.mockReset().mockResolvedValue(new Blob(['synthetic'], { type: 'audio/wav' }));
    createLocal.mockReset().mockResolvedValue({ uri: 'blob:synthetic', dispose });
  });

  it('downloads only on request, plays on request and disposes on leaving', async () => {
    const result = await render(<EntryAudioPlayer path="patient/file.wav" />);
    expect(download).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar áudio' }));
    expect(await screen.findByText('0:00 / 1:05')).toBeTruthy();
    expect(mockPlayer.replace).toHaveBeenCalledWith('blob:synthetic');
    expect(mockPlayer.play).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Reproduzir áudio' }));
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    await result.unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('shows a network error and allows an authenticated retry', async () => {
    download.mockRejectedValueOnce(new TypeError('Network request failed'));
    await render(<EntryAudioPlayer path="patient/file.wav" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar áudio' }));
    expect(await screen.findByText('Sem conexão. Tente carregar o áudio novamente.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('0:00 / 1:05')).toBeTruthy();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('disposes a download that finishes after leaving instead of loading it', async () => {
    let finish: ((audio: files.LocalAudio) => void) | undefined;
    let load: (() => Promise<void>) | undefined;
    function Probe() {
      load = useAudioPlayback('patient/file.wav').load;
      return null;
    }
    createLocal.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const result = await render(<Probe />);
    await act(async () => {
      void load?.();
    });
    await waitFor(() => expect(createLocal).toHaveBeenCalled());
    await result.unmount();
    await act(async () => { finish?.({ uri: 'blob:synthetic', dispose }); });
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(mockPlayer.replace).not.toHaveBeenCalledWith('blob:synthetic');
  });

  it('restarts a finished audio from zero', async () => {
    mockStatus.didJustFinish = true;
    await render(<EntryAudioPlayer path="patient/file.wav" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar áudio' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Reproduzir áudio' }));
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
  });

  it('disposes the local audio when the app enters the background', async () => {
    let background: (() => void) | undefined;
    const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
      background = () => callback('background');
      return { remove: jest.fn() };
    });
    try {
      await render(<EntryAudioPlayer path="patient/file.wav" />);
      await fireEvent.press(screen.getByRole('button', { name: 'Carregar áudio' }));
      await screen.findByText('0:00 / 1:05');
      await act(async () => { background?.(); });
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Áudio do relato')).toBeNull();
    } finally {
      listener.mockRestore();
    }
  });

  it('surfaces cleanup failures without exposing file paths', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    dispose.mockImplementationOnce(() => { throw new Error('private file path'); });
    const result = await render(<EntryAudioPlayer path="patient/file.wav" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Carregar áudio' }));
    await screen.findByText('0:00 / 1:05');
    await result.unmount();
    expect(alert).toHaveBeenCalledWith(
      'Limpeza de áudio pendente',
      'Não foi possível apagar a cópia temporária do áudio deste dispositivo.',
      expect.any(Array),
      { cancelable: false },
    );
    alert.mockRestore();
  });
});

describe('formatAudioTime', () => {
  it('formats elapsed time and handles unknown durations', () => {
    expect(formatAudioTime(125.9)).toBe('2:05');
    expect(formatAudioTime(NaN)).toBe('0:00');
    expect(formatAudioTime(-1)).toBe('0:00');
  });
});
