import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

import { downloadAudio } from './audioRepository';
import { disposeAudio } from './cleanup';
import { createLocalAudio, type LocalAudio } from './localAudio';

// Audio bytes are scoped to this mounted player, never stored in the query cache.
export function useAudioPlayback(path: string) {
  const player = useAudioPlayer(null, { downloadFirst: false });
  const status = useAudioPlayerStatus(player);
  const local = useRef<LocalAudio | null>(null);
  const active = useRef(false);
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (local.current) {
        disposeAudio(local.current);
        local.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || status.isLoaded || status.error) return;
    const timeout = setTimeout(() => setError(new Error('Audio loading timed out')), 15_000);
    return () => clearTimeout(timeout);
  }, [loaded, status.isLoaded, status.error]);

  const load = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setLoaded(false);
    setError(null);
    try {
      player.pause();
      player.replace(null);
      if (local.current) {
        disposeAudio(local.current);
        local.current = null;
      }
      const blob = await downloadAudio(path);
      if (!active.current) return;
      const audio = await createLocalAudio(blob);
      if (!active.current) {
        disposeAudio(audio);
        return;
      }
      local.current = audio;
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      if (!active.current) return;
      player.replace(audio.uri);
      setLoaded(true);
    } catch (failure) {
      if (active.current) setError(failure);
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  };

  const toggle = async () => {
    try {
      setError(null);
      if (status.playing) player.pause();
      else {
        if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) await player.seekTo(0);
        if (active.current) player.play();
      }
    } catch (failure) {
      if (active.current) setError(failure);
    }
  };

  return { status, loading, loaded, failure: error || status.error, load, toggle };
}
