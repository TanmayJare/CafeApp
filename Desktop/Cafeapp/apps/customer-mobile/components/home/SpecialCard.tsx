/**
 * SpecialCard — 160×200px horizontal scroll card for Today's Specials (Phase 35D.2).
 *
 * Props:
 *   special       — the DailySpecial data
 *   onPress       — called when the card is tapped (caller decides navigate vs. add-to-cart)
 */
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { C, F, R, S } from '../../lib/tokens';

interface DailySpecial {
  id: string;
  title: string;
  imageUrl?: string | null;
  badgeText?: string | null;
  originalPrice?: number | null;
  discountedPrice: number;
  linkedMenuItemId?: string | null;
}

interface Props {
  special: DailySpecial;
  onPress: () => void;
}

export function SpecialCard({ special, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.88}>
      {/* Background image or emoji placeholder */}
      {special.imageUrl ? (
        <Image
          source={special.imageUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={styles.emojiPlaceholder}>
          <Text style={{ fontSize: 52 }}>☕</Text>
        </View>
      )}

      {/* Gradient overlay — bottom half */}
      <View style={styles.gradient} />

      {/* Badge chip — top left */}
      {special.badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>{special.badgeText}</Text>
        </View>
      ) : null}

      {/* Bottom text */}
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={1}>{special.title}</Text>
        <View style={styles.priceRow}>
          {special.originalPrice != null && (
            <Text style={styles.originalPrice}>₹{special.originalPrice}</Text>
          )}
          <Text style={styles.price}>₹{special.discountedPrice}</Text>
        </View>
      </View>

      {/* (+) button — bottom right */}
      <View style={styles.addBtn}>
        <Text style={styles.addBtnText}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 200,
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.cream,
    marginRight: S.md,
  },
  emojiPlaceholder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#EDE0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 100,
    // React Native doesn't support CSS gradient; use a dark overlay instead
    backgroundColor: 'rgba(30,15,8,0.52)',
  },
  badge: {
    position: 'absolute',
    top: S.sm,
    left: S.sm,
    backgroundColor: C.espresso,
    borderRadius: R.pill,
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    maxWidth: 120,
  },
  badgeText: {
    fontFamily: F.sansSb,
    fontSize: 10,
    color: C.white,
    letterSpacing: 0.2,
  },
  bottom: {
    position: 'absolute',
    left: S.sm,
    right: 36,
    bottom: S.sm,
  },
  title: {
    fontFamily: F.serif,
    fontSize: 14,
    color: C.white,
    marginBottom: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  originalPrice: {
    fontFamily: F.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'line-through',
  },
  price: {
    fontFamily: F.monoMd,
    fontSize: 13,
    color: C.white,
  },
  addBtn: {
    position: 'absolute',
    bottom: S.sm,
    right: S.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.matcha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: C.white,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: F.sansSb,
  },
});
