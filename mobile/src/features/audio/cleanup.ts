import { Alert } from 'react-native';

import type { LocalAudio } from './localAudio';

export function disposeAudio(audio: LocalAudio) {
  try {
    audio.dispose();
  } catch {
    Alert.alert(
      'Limpeza de áudio pendente',
      'Não foi possível apagar a cópia temporária do áudio deste dispositivo.',
      [{ text: 'Tentar novamente', onPress: () => disposeAudio(audio) }],
      { cancelable: false },
    );
  }
}
