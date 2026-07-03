import { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useCartStore } from '../../stores/cart.store';
import { useSocket } from '../../hooks/useSocket';
import { C, F, R, S } from '../../lib/tokens';

export default function CartScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const clearCart = useCartStore((s) => s.clear);

  const { data: cart, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then((r) => r.data),
    staleTime: 0,
  });

  // 34C.4 — sync cart from server push (multi-device support)
  useSocket({
    'cart:updated': (payload: { cart: any }) => {
      qc.setQueryData(['cart'], payload.cart);
      const items = payload.cart?.items ?? [];
      const count = items.reduce((s: number, i: any) => s + i.quantity, 0);
      const total = items.reduce((s: number, i: any) => {
        const opts = (i.options ?? []).reduce((o: number, op: any) => o + op.priceDelta, 0);
        return s + (i.menuItem.price + opts) * i.quantity;
      }, 0);
      setCart(count, total);
    },
  });

  // 34C.5 — pull-to-refresh
  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  const { data: preview } = useQuery({
    queryKey: ['cart-preview'],
    queryFn: () => api.get('/cart/summary').then((r) => r.data),
    staleTime: 0,
    enabled: (cart?.items?.length ?? 0) > 0,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      qty <= 0 ? api.delete(`/cart/items/${id}`) : api.put(`/cart/items/${id}`, { quantity: qty }),
    onSuccess: async () => {
      const res = await api.get('/cart/summary');
      setCart(res.data.itemCount, res.data.totalAmount);
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-preview'] });
    },
  });

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator color={C.espresso} size="large" /></View>
  );

  const items = cart?.items ?? [];

  if (items.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🛒</Text>
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/menu')}>
        <Text style={styles.browseBtnText}>Browse menu</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <Text style={styles.title}>Your cart</Text>
        <Text style={styles.sub}>from CaféConnect</Text>
      </View>

      <FlashList
        data={items}
        keyExtractor={(it: any) => it.id}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: 160 }}
        onRefresh={onRefresh}
        refreshing={isLoading}
        renderItem={({ item }: { item: any }) => {
          const unitTotal = (item.menuItem.price + (item.options ?? []).reduce((s: number, o: any) => s + o.priceDelta, 0));
          return (
            <View style={styles.row}>
              <View style={styles.thumb}><Text style={{ fontSize: 28 }}>☕</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                {(item.options ?? []).length > 0 && (
                  <Text style={styles.optText}>
                    {item.options.map((o: any) => o.optionName).join(', ')}
                  </Text>
                )}
                <Text style={styles.itemPrice}>₹{unitTotal} each</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateMut.mutate({ id: item.id, qty: item.quantity - 1 })}
                >
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateMut.mutate({ id: item.id, qty: item.quantity + 1 })}
                >
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          preview ? (
            <View style={styles.bill}>
              <Text style={styles.billTitle}>Bill Summary</Text>
              <BillRow label="Subtotal" value={preview.subtotal} />
              <BillRow label="Delivery fee" value={preview.deliveryFee ?? 0} />
              <BillRow label="GST (5%)" value={preview.taxAmount ?? 0} />
              {(preview.discountAmount ?? 0) > 0 && (
                <BillRow label="Discount" value={-preview.discountAmount} color={C.greenText} />
              )}
              <View style={styles.billDivider} />
              <BillRow label="Total" value={preview.totalAmount ?? preview.grandTotal} bold />
            </View>
          ) : null
        }
      />

      {/* Checkout CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/checkout')}
        >
          <Text style={styles.ctaText}>
            Proceed to pay · ₹{preview?.totalAmount ?? preview?.grandTotal ?? '...'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BillRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontFamily: bold ? F.monoMd : F.mono, fontSize: 13, color: color ?? C.ink2 }}>{label}</Text>
      <Text style={{ fontFamily: bold ? F.monoMd : F.mono, fontSize: 13, color: color ?? C.ink }}>₹{Math.round(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  emptyEmoji: { fontSize: 56, marginBottom: S.xl },
  emptyTitle: { fontFamily: F.serif, fontSize: 20, color: C.ink2, marginBottom: S.lg },
  browseBtn: {
    backgroundColor: C.espresso, borderRadius: R.lg, paddingHorizontal: S.xxl, paddingVertical: S.md,
  },
  browseBtnText: { fontFamily: F.sansSb, fontSize: 14, color: C.white },
  header: {
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
  },
  title: { fontFamily: F.serif, fontSize: 22, color: C.white },
  sub: { fontFamily: F.sans, fontSize: 13, color: C.cream, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: R.lg, padding: S.md, marginBottom: S.sm, gap: S.md,
  },
  thumb: {
    width: 52, height: 52, backgroundColor: C.cream, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemName: { fontFamily: F.sansSb, fontSize: 14, color: C.ink },
  optText: { fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 },
  itemPrice: { fontFamily: F.mono, fontSize: 12, color: C.espresso, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  stepBtn: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { fontFamily: F.sansSb, fontSize: 16, color: C.ink, lineHeight: 20 },
  qtyText: { fontFamily: F.mono, fontSize: 14, color: C.ink, minWidth: 22, textAlign: 'center' },
  bill: {
    backgroundColor: C.white, borderRadius: R.lg, padding: S.xl, marginTop: S.sm,
  },
  billTitle: { fontFamily: F.serif, fontSize: 16, color: C.ink, marginBottom: S.md },
  billDivider: { height: 1, backgroundColor: C.border, marginVertical: S.sm },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, paddingHorizontal: S.xl, paddingVertical: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cta: { backgroundColor: C.espresso, borderRadius: R.pill, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: F.sansSb, fontSize: 16, color: C.white },
});
