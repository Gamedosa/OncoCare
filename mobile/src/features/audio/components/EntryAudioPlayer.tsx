import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';

import { isNetworkError } from '@/shared/errors';
import { Button, Card, colors, font, Notice } from '@/shared/ui';

import { useAudioPlayback } from '../hooks';

export function EntryAudioPlayer({ path }: { path: string }) {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  return focused && foreground ? <FocusedAudioPlayer key={path} path={path} /> : null;
}

function FocusedAudioPlayer({ path }: { path: string }) {
  const { status, loading, loaded, failure, load, toggle } = useAudioPlayback(path);
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Áudio do relato</Text>
      {failure ? (
        <>
          <Notice tone={isNetworkError(failure) ? 'warning' : 'error'}>
            {isNetworkError(failure)
              ? 'Sem conexão. Tente carregar o áudio novamente.'
              : 'Não foi possível reproduzir o áudio. Ele pode não estar mais disponível para você.'}
          </Notice>
          <Button variant="secondary" onPress={load} loading={loading}>Tentar novamente</Button>
        </>
      ) : !loaded ? (
        <Button variant="secondary" onPress={load} loading={loading}>Carregar áudio</Button>
      ) : (
        <>
          <Text style={styles.time}>{formatAudioTime(status.currentTime)} / {formatAudioTime(status.duration)}</Text>
          <Button variant="secondary" onPress={toggle} loading={!status.isLoaded || status.isBuffering}>
            {status.playing ? 'Pausar áudio' : 'Reproduzir áudio'}
          </Button>
        </>
      )}
    </Card>
  );
}

export function formatAudioTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  time: { fontSize: font.small, color: colors.textMuted },
});
