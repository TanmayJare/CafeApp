/**
 * "Add new address" selection screen — 36C.4
 * Two big tappable cards: Map picker (Phase 37) or Society form
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { C, F, R, S } from '../../lib/tokens';

export default function NewAddressChoice() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add address</Text>
      </View>

      <View style={styles.body}>
        {/* Map picker card */}
        <TouchableOpacity
          style={[styles.card, styles.cardMap]}
          onPress={() => router.push('/addresses/map-picker')}
        >
          <Text style={styles.cardEmoji}>📍</Text>
          <Text style={styles.cardTitle}>Use map to pick location</Text>
          <Text style={styles.cardSub}>Drop a pin anywhere — we'll detect the zone and delivery fee</Text>
        </TouchableOpacity>

        {/* Society form card */}
        <TouchableOpacity
          style={[styles.card, styles.cardSociety]}
          onPress={() => router.push('/addresses/new-society')}
        >
          <Text style={styles.cardEmoji}>🏢</Text>
          <Text style={styles.cardTitle}>I'm inside the society</Text>
          <Text style={styles.cardSub}>Tower, wing, floor, flat — always free delivery</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Save a Work or Other address too</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
    flexDirection: 'row', alignItems: 'center', gap: S.md,
  },
  back: { fontFamily: F.sansSb, fontSize: 22, color: C.white },
  title: { fontFamily: F.serif, fontSize: 20, color: C.white },
  body: { padding: S.xl, gap: S.lg, flex: 1 },
  card: {
    borderRadius: R.xl, padding: S.xl, borderWidth: 2,
    gap: S.sm,
  },
  cardMap: { borderColor: C.espresso, backgroundColor: C.white },
  cardSociety: { borderColor: C.matcha, backgroundColor: C.white },
  cardEmoji: { fontSize: 36 },
  cardTitle: { fontFamily: F.serif, fontSize: 18, color: C.ink },
  cardSub: { fontFamily: F.sans, fontSize: 14, color: C.ink3 },
  hint: { fontFamily: F.sans, fontSize: 13, color: C.ink3, textAlign: 'center', marginTop: S.md },
});
