import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useCartStore } from '../../stores/cart.store';
import { C, F, R, S } from '../../lib/tokens';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const { data: item, isLoading } = useQuery<any>({
    queryKey: ['item', id],
    queryFn: () => api.get(`/menu/items/${id}`).then((r: any) => r.data),
  });

  useEffect(() => {
    if (item) {
      const def = item.options?.find((o: any) => o.type === 'SIZE' && o.isDefault);
      if (def) setSelectedSize(def.id);
    }
  }, [item]);

  const sizeOptions = item?.options?.filter((o: any) => o.type === 'SIZE') ?? [];
  const addonOptions = item?.options?.filter((o: any) => o.type === 'ADDON') ?? [];

  const linePrice = () => {
    if (!item) return 0;
    const sizeExtra = sizeOptions.find((o: any) => o.id === selectedSize)?.priceDelta ?? 0;
    const addonExtra = selectedAddons.reduce((sum: number, adId: string) => {
      return sum + (addonOptions.find((o: any) => o.id === adId)?.priceDelta ?? 0);
    }, 0);
    return (item.price + sizeExtra + addonExtra) * qty;
  };

  const toggleAddon = (id: string) =>
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const addMutation = useMutation({
    mutationFn: () =>
      api.post('/cart/items', {
        menuItemId: item.id,
        quantity: qty,
        optionIds: [selectedSize, ...selectedAddons].filter(Boolean),
      }),
    onSuccess: async () => {
      const cartRes = await api.get('/cart/summary');
      setCart(cartRes.data.itemCount, cartRes.data.totalAmount);
      qc.invalidateQueries({ queryKey: ['cart'] });
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'Could not add to cart'),
  });

  if (isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator color={C.espresso} size="large" />
    </View>
  );
  if (!item) return (
    <View style={styles.center}>
      <Text style={{ fontFamily: F.sans, color: C.ink3 }}>Item not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: S.lg }}>
        <Text style={{ color: C.matcha, fontFamily: F.sansMd }}>← Go back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      {/* Hero */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ fontSize: 18, color: C.white }}>←</Text>
        </TouchableOpacity>
        {item.imageUrl
          ? <Image source={item.imageUrl} style={{ width: 160, height: 160 }} contentFit="contain" />
          : <Text style={{ fontSize: 80 }}>☕</Text>}
      </View>

      <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
        {/* Name + Price */}
        <View style={styles.nameRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.basePrice}>₹{item.price}</Text>
        </View>
        {item.description && <Text style={styles.desc}>{item.description}</Text>}

        {/* Sizes */}
        {sizeOptions.length > 0 && (
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>SIZE</Text>
            <View style={styles.optionRow}>
              {sizeOptions.map((o: any) => (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.optionPill, selectedSize === o.id && styles.optionPillActive]}
                  onPress={() => setSelectedSize(o.id)}
                >
                  <Text style={[styles.optionPillText, selectedSize === o.id && { color: C.white }]}>
                    {o.name}{o.priceDelta > 0 ? ` +₹${o.priceDelta}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Add-ons */}
        {addonOptions.length > 0 && (
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>ADD-ONS</Text>
            <View style={styles.optionRow}>
              {addonOptions.map((o: any) => {
                const active = selectedAddons.includes(o.id);
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.optionPill, active && styles.addonPillActive]}
                    onPress={() => toggleAddon(o.id)}
                  >
                    <Text style={[styles.optionPillText, active && { color: C.white }]}>
                      {o.name}{o.priceDelta > 0 ? ` +₹${o.priceDelta}` : ' (Free)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Qty */}
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{qty}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(Math.min(10, qty + 1))}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: S.xxxl }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.cta, (!item.isAvailable || addMutation.isPending) && styles.ctaDisabled]}
          onPress={() => addMutation.mutate()}
          disabled={!item.isAvailable || addMutation.isPending}
        >
          {addMutation.isPending
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.ctaText}>
                {item.isAvailable ? `Add to cart · ₹${linePrice()}` : 'Currently unavailable'}
              </Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  hero: {
    height: 240, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute', top: 52, left: S.xl,
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.espresso,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    flex: 1, backgroundColor: C.white,
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    paddingHorizontal: S.xl, paddingTop: S.xl,
  },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.sm },
  itemName: { fontFamily: F.serif, fontSize: 22, color: C.ink, flex: 1, marginRight: S.md },
  basePrice: { fontFamily: F.mono, fontSize: 20, color: C.espresso },
  desc: { fontFamily: F.sans, fontSize: 14, color: C.ink3, lineHeight: 22, marginBottom: S.xl },
  optionGroup: { marginBottom: S.xl },
  optionLabel: { fontFamily: F.sansMd, fontSize: 11, color: C.ink3, letterSpacing: 1.2, marginBottom: S.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  optionPill: {
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  optionPillActive: { backgroundColor: C.espresso, borderColor: C.espresso },
  addonPillActive: { backgroundColor: C.matcha, borderColor: C.matcha },
  optionPillText: { fontFamily: F.sansMd, fontSize: 13, color: C.ink2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.xl },
  qtyLabel: { fontFamily: F.sansSb, fontSize: 15, color: C.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontFamily: F.sansSb, fontSize: 20, color: C.ink, lineHeight: 24 },
  qtyVal: { fontFamily: F.mono, fontSize: 20, color: C.ink, minWidth: 30, textAlign: 'center' },
  ctaWrap: {
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: {
    backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
