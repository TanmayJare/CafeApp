import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useCartStore } from '../stores/cart.store';
import { C, F, R, S } from '../lib/tokens';

export default function CheckoutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const clearCart = useCartStore((s) => s.clear);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('COD');

  const { data: addresses, isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/address').then((r) => r.data),
  });

  const { data: preview } = useQuery({
    queryKey: ['cart-preview'],
    queryFn: () => api.get('/cart/summary').then((r) => r.data),
    staleTime: 0,
  });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then((r) => r.data),
    staleTime: 0,
  });

  useEffect(() => {
    if (addresses?.length) {
      const def = addresses.find((a: any) => a.isDefault);
      setSelectedAddress(def?.id ?? addresses[0].id);
    }
  }, [addresses]);

  const orderMut = useMutation({
    mutationFn: () =>
      api.post('/orders', {
        addressId: selectedAddress,
        paymentMethod,
        items: (cart?.items ?? []).map((it: any) => ({
          menuItemId: it.menuItemId ?? it.menuItem?.id,
          quantity: it.quantity,
        })),
      }),
    onSuccess: async (res) => {
      clearCart();
      await api.delete('/cart');
      qc.invalidateQueries({ queryKey: ['cart'] });
      router.replace(`/order/${res.data.id}`);
    },
    onError: (e: any) =>
      Alert.alert('Order failed', e.response?.data?.message ?? 'Please try again'),
  });

  if (addrLoading) return (
    <View style={styles.center}><ActivityIndicator color={C.espresso} size="large" /></View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 120 }}>
        {/* Addresses */}
        <Text style={styles.sectionTitle}>Deliver to</Text>
        {addresses?.length === 0 ? (
          <TouchableOpacity style={styles.addAddrBtn} onPress={() => router.push('/addresses/new')}>
            <Text style={styles.addAddrText}>+ Add delivery address</Text>
          </TouchableOpacity>
        ) : (
          addresses?.map((addr: any) => {
            const selected = selectedAddress === addr.id;
            const line = addr.type === 'SOCIETY'
              ? `${addr.tower}, ${addr.wing}-Wing, Floor ${addr.floor}, Flat ${addr.flatNumber}`
              : addr.addressLine;
            return (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addrCard, selected && styles.addrCardSelected]}
                onPress={() => setSelectedAddress(addr.id)}
              >
                <View style={styles.addrRadio}>{selected && <View style={styles.addrRadioDot} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addrLabel}>{addr.label}{addr.isDefault ? ' · Default' : ''}</Text>
                  <Text style={styles.addrLine}>{line}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <TouchableOpacity onPress={() => router.push('/addresses/new')} style={{ marginTop: S.sm }}>
          <Text style={{ fontFamily: F.sansMd, fontSize: 13, color: C.matcha }}>+ Add new address</Text>
        </TouchableOpacity>

        {/* Payment */}
        <Text style={[styles.sectionTitle, { marginTop: S.xxl }]}>Payment</Text>
        {(['COD', 'UPI'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.payCard, paymentMethod === m && styles.payCardSelected]}
            onPress={() => m === 'UPI' ? Alert.alert('Coming soon', 'Razorpay UPI will be available soon') : setPaymentMethod(m)}
          >
            <View style={styles.addrRadio}>{paymentMethod === m && <View style={styles.addrRadioDot} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrLabel}>{m === 'COD' ? 'Cash on Delivery' : 'UPI / Online (coming soon)'}</Text>
              <Text style={styles.addrLine}>{m === 'COD' ? 'Pay when you receive' : 'Razorpay secure payment'}</Text>
            </View>
            <Text style={{ fontSize: 22 }}>{m === 'COD' ? '💵' : '💳'}</Text>
          </TouchableOpacity>
        ))}

        {/* Summary */}
        {preview && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {(cart?.items ?? []).map((it: any) => (
              <View key={it.id} style={styles.summaryRow}>
                <Text style={styles.summaryItem}>{it.menuItem?.name} × {it.quantity}</Text>
                <Text style={styles.summaryPrice}>₹{it.menuItem?.price * it.quantity}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryItem, { fontFamily: F.monoMd }]}>Total</Text>
              <Text style={[styles.summaryPrice, { fontFamily: F.monoMd }]}>
                ₹{preview.totalAmount ?? preview.grandTotal}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.cta, (!selectedAddress || orderMut.isPending) && styles.ctaDisabled]}
          onPress={() => orderMut.mutate()}
          disabled={!selectedAddress || orderMut.isPending}
        >
          {orderMut.isPending
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.ctaText}>
                Place order · ₹{preview?.totalAmount ?? preview?.grandTotal ?? '...'}
              </Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
  },
  back: { fontFamily: F.sansSb, fontSize: 20, color: C.white },
  title: { fontFamily: F.serif, fontSize: 20, color: C.white },
  sectionTitle: { fontFamily: F.serif, fontSize: 17, color: C.ink, marginBottom: S.md },
  addrCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: R.lg, padding: S.md, marginBottom: S.sm, gap: S.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  addrCardSelected: { borderColor: C.espresso },
  addrRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.espresso,
    alignItems: 'center', justifyContent: 'center',
  },
  addrRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.espresso },
  addrLabel: { fontFamily: F.sansSb, fontSize: 14, color: C.ink },
  addrLine: { fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 },
  addAddrBtn: {
    backgroundColor: C.white, borderRadius: R.lg, padding: S.lg,
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center',
  },
  addAddrText: { fontFamily: F.sansMd, fontSize: 14, color: C.matcha },
  payCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: R.lg, padding: S.md, marginBottom: S.sm, gap: S.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  payCardSelected: { borderColor: C.espresso },
  summaryCard: { backgroundColor: C.white, borderRadius: R.lg, padding: S.xl, marginTop: S.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItem: { fontFamily: F.mono, fontSize: 13, color: C.ink2 },
  summaryPrice: { fontFamily: F.mono, fontSize: 13, color: C.ink },
  divider: { height: 1, backgroundColor: C.border, marginVertical: S.sm },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: { backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
