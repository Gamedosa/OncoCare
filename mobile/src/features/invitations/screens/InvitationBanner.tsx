import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, colors, font, spacing } from '@/shared/ui';

import { useReceivedInvitations } from '../hooks';

export function InvitationBanner() {
  const router = useRouter();
  const query = useReceivedInvitations();
  const count = query.data?.length ?? 0;
  if (count === 0) return null;
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>
        {count === 1 ? 'Você tem um convite de acompanhamento.' : `Você tem ${count} convites de acompanhamento.`}
      </Text>
      <Button variant="secondary" onPress={() => router.push('/patient/invitations')}>Ver convites</Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  text: { fontSize: font.body, fontWeight: '700', color: colors.text },
});
