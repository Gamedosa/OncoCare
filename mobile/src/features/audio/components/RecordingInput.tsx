import {
  AudioModule, RecordingPresets, setAudioModeAsync,
  useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet } from 'react-native';

import { Button, Card, Notice, spacing } from '@/shared/ui';

import { MAX_AUDIO_BYTES, validateRecording } from '../audioRepository';
import { disposeAudio } from '../cleanup';
import { discardRecording, readRecording, type RecordedAudio } from '../recordingFile';

type Props = {
  disabled: boolean;
  onChange: (audio: RecordedAudio | null) => void;
  onBusyChange: (busy: boolean) => void;
};

export function RecordingInput({ disabled, onChange, onBusyChange }: Props) {
  const [failure, setFailure] = useState<string>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError) {
      setFailure('A gravação foi interrompida. Tente novamente.');
      busyRef.current(false);
    }
  });
  const state = useAudioRecorderState(recorder);
  const current = useRef<RecordedAudio | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const foreground = useRef(AppState.currentState !== 'background');
  const [working, setWorking] = useState(false);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const changeRef = useRef(onChange);
  const busyRef = useRef(onBusyChange);
  changeRef.current = onChange;
  busyRef.current = onBusyChange;

  const clear = () => {
    player.pause();
    player.replace(null);
    if (current.current) disposeAudio(current.current);
    current.current = null;
    setAudio(null);
    changeRef.current(null);
  };

  const finish = async (discard = false) => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('Não foi possível obter a gravação. Tente novamente.');
      if (discard || !mounted.current) {
        disposeAudio({ uri, dispose: () => discardRecording(uri) });
        return;
      }
      let recording: RecordedAudio;
      try {
        recording = await readRecording(uri);
        validateRecording(recording);
      } catch (error) {
        disposeAudio({ uri, dispose: () => discardRecording(uri) });
        throw error;
      }
      if (!mounted.current) {
        disposeAudio(recording);
        return;
      }
      current.current = recording;
      player.replace(recording.uri);
      setAudio(recording);
      changeRef.current(recording);
    } catch (error) {
      if (mounted.current) setFailure(
        error instanceof Error && error.message.includes('10 MiB')
          ? 'O áudio ultrapassa 10 MiB. Grave um áudio menor.'
          : 'Não foi possível finalizar a gravação. Grave novamente.',
      );
      else Alert.alert('Gravação interrompida', 'Não foi possível confirmar a limpeza da gravação temporária.');
    } finally {
      busy.current = false;
      if (mounted.current) {
        setWorking(false);
        busyRef.current(false);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', (value) => {
      foreground.current = value === 'active';
      if (value !== 'active' && recorder.isRecording) void finish(true);
      if (value !== 'active') player.pause();
    });
    return () => {
      mounted.current = false;
      listener.remove();
      if (current.current) disposeAudio(current.current);
      const uri = recorder.uri;
      // The Expo hook releases the microphone on unmount; clean up its cache file as well.
      if (uri && !current.current) disposeAudio({ uri, dispose: () => discardRecording(uri) });
      void setAudioModeAsync({ allowsRecording: false }).catch(() => {
        Alert.alert('Microfone', 'Não foi possível restaurar o modo de áudio. Feche e abra o aplicativo.');
      });
    };
  }, [recorder, player]);

  useEffect(() => {
    if (state.isRecording && state.fileSize > MAX_AUDIO_BYTES) void finish();
  }, [state.fileSize, state.isRecording]);

  const start = async () => {
    if (disabled || busy.current) return;
    busy.current = true;
    setWorking(true);
    busyRef.current(true);
    setFailure(undefined);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permita o acesso ao microfone para gravar. Você também pode escrever seu relato.');
      }
      if (!mounted.current || !foreground.current) {
        busyRef.current(false);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
      await recorder.prepareToRecordAsync();
      if (!mounted.current || !foreground.current) {
        await setAudioModeAsync({ allowsRecording: false });
        busyRef.current(false);
        return;
      }
      recorder.record();
    } catch {
      if (mounted.current) {
        setFailure('Não foi possível iniciar. Confira a permissão do microfone e tente novamente.');
        busyRef.current(false);
      }
      try {
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        if (mounted.current) setFailure('Não foi possível restaurar o modo de áudio. Feche e abra o aplicativo.');
      }
    } finally {
      busy.current = false;
      if (mounted.current) setWorking(false);
    }
  };

  const preview = async () => {
    try {
      if (playback.playing) player.pause();
      else {
        if (playback.didJustFinish) await player.seekTo(0);
        player.play();
      }
    } catch {
      setFailure('Não foi possível ouvir a gravação. Tente novamente.');
    }
  };

  return (
    <Card style={styles.card}>
      <Notice>Seu psicólogo vinculado poderá ouvir este áudio após salvar. Até 10 MiB.</Notice>
      {Platform.OS === 'web' ? <Notice>A gravação no navegador exige HTTPS ou localhost e suporte a WebM.</Notice> : null}
      {failure || playback.error ? <Notice tone="error">{failure ?? 'Não foi possível ouvir a gravação.'}</Notice> : null}
      {state.isRecording ? (
        <>
          <Notice>Gravando: {Math.floor(state.durationMillis / 1000)} segundos</Notice>
          <Button onPress={() => finish()} loading={working}>Finalizar gravação</Button>
          <Button variant="text" onPress={() => finish(true)} disabled={working}>Cancelar gravação</Button>
        </>
      ) : audio ? (
        <>
          <Notice>Áudio pronto. Ele será enviado ao salvar o relato.</Notice>
          <Button variant="secondary" onPress={preview} disabled={disabled || !playback.isLoaded}>
            {playback.playing ? 'Pausar prévia' : 'Ouvir antes de enviar'}
          </Button>
          <Button variant="text" onPress={clear} disabled={disabled}>Descartar gravação</Button>
        </>
      ) : (
        <Button variant="secondary" onPress={start} loading={working} disabled={disabled}>Gravar áudio</Button>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.md } });
