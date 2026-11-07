import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, Header, Notice, Screen, spacing } from '@/shared/ui';

import terms from './terms.json';

const preview = terms.content
  .replaceAll('[NOME DO APLICATIVO]', 'ElaConta')
  .replaceAll('[NOME COMPLETO OU RAZÃO SOCIAL]', 'Gabriel Melo Dos Santos')
  .replaceAll('[NÚMERO]', '[CPF a definir]');

export function TermsScreen() {
  const router = useRouter();

  return (
    <Screen header={<Header title="Termos de Uso" onBack={() => router.back()} />}>
      <Notice tone="warning">
        Prévia de uma minuta: não é a versão final e não registra aceite. Dados, canais e condições ainda precisam ser
        definidos e revisados antes do uso com pacientes.
      </Notice>
      <View style={styles.document}>
        {preview.split('\n').map((line, index) => {
          const text = line.replace(/^#{1,3}\s+/, '').replace(/^>\s*/, '').replaceAll('**', '');
          if (!text.trim() || text.trim() === '---' || text.trim() === '```text' || text.trim() === '```') return null;
          const heading = /^#{1,3}\s/.test(line);
          return (
            <Text
              key={index}
              accessibilityRole={heading ? 'header' : undefined}
              selectable
              style={[styles.text, heading && styles.heading]}
            >
              {text}
            </Text>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  document: { gap: spacing.sm },
  text: { color: colors.text, fontSize: font.body, lineHeight: 24 },
  heading: { fontWeight: '800', marginTop: spacing.md },
});
