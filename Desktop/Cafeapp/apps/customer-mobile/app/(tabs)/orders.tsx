import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { C, F, R, S } from '../../lib/tokens';

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  PLACED:          { label: 'Order Placed',   bgColor: C.blueBg,   textColor: C.blueText },
  ACCEPTED:        { label: 'Accepted',        bgColor: C.amberBg,  textColor: C.amberText },
  PREPARING:       { label: 'Preparing',       bgColor: C.amberBg,  textColor: C.amberText },
  READY:           { label: 'Ready',           bgColor: C.greenBg,  textColor: C.greenText },
  ASSIGNED:        { label: 'Rider assigned',  bgColor: C.greenBg,  textColor: C.greenText },
  OUT_FOR_DELIVERY:{ label: 'On the way',      bgColor: C.greenBg,  textColor: C.greenText },
  DELIVERED:       { label: 'Delivered',       bgColor: C.surface,  textColor: C.ink3 },
  CANCELLED:       { label: 'Cancelled',       bgColor: C.redBg,    textColor: C.redText },
};

export default function OrdersScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    staleTime: 0,
  });

  // 34C.2 — prepend new orders; update status in-place on order:status
  useSocket({
    'order:new': (newOrder: any) => {
      qc.setQueryData(['orders'], (old: any[] = []) => [newOrder, ...old]);
    },
    'order:status': (d: { orderId: string; status: string }) => {
      qc.setQueryData(['orders'], (old: any[] = []) =>
        old.map((o) => (o.id === d.orderId ? { ...o, status: d.status } : o)),
      );
    },
  });

  // 34C.5 pull-to-refresh handler
  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator color={C.espresso} size="large" /></View>
  );

  const active = (orders ?? []).filter((o: any) =>
    !['DELIVERED', 'CANCELLED'].includes(o.status),
  );
  const past = (orders ?? []).filter((o: any) =>
    ['DELIVERED', 'CANCELLED'].includes(o.status),
  );

  const renderOrder = ({ item }: { item: any }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLACED;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/order/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderNum}>#{item.orderNumber}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: cfg.bgColor }]}>
            <Text style={[styles.pillText, { color: cfg.textColor }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.itemSummary} numberOfLines={1}>
          {item.items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.total}>₹{item.grandTotal}</Text>
          {!['DELIVERED', 'CANCELLED'].includes(item.status) && (
            <Text style={styles.trackLink}>Track →</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Orders</Text>
      </View>
      {(orders ?? []).length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: S.xl }}>📦</Text>
          <Text style={styles.emptyText}>No orders yet</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.browseBtnText}>Browse menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={[
            ...(active.length ? [{ type: 'header', label: 'Active' } as any, ...active] : []),
            ...(past.length ? [{ type: 'header', label: 'Past' } as any, ...past] : []),
          ]}
          keyExtractor={(it: any) => it.id ?? it.label}
          contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: 20 }}
          renderItem={({ item }: any) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionHeader}>{item.label}</Text>;
            }
            return renderOrder({ item });
          }}
          onRefresh={onRefresh}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  header: { backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg },
  title: { fontFamily: F.serif, fontSize: 22, color: C.white },
  sectionHeader: {
    fontFamily: F.sansSb, fontSize: 13, color: C.ink3, textTransform: 'uppercase',
    letterSpacing: 1, marginVertical: S.sm,
  },
  card: { backgroundColor: C.white, borderRadius: R.lg, padding: S.md, marginBottom: S.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.xs },
  orderNum: { fontFamily: F.mono, fontSize: 14, color: C.ink },
  orderDate: { fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 },
  pill: { borderRadius: R.pill, paddingHorizontal: S.sm, paddingVertical: 3 },
  pillText: { fontFamily: F.sansMd, fontSize: 11 },
  itemSummary: { fontFamily: F.sans, fontSize: 13, color: C.ink3, marginBottom: S.sm },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontFamily: F.monoMd, fontSize: 14, color: C.espresso },
  trackLink: { fontFamily: F.sansMd, fontSize: 12, color: C.blueText },
  emptyText: { fontFamily: F.serif, fontSize: 18, color: C.ink2, marginBottom: S.lg },
  browseBtn: { backgroundColor: C.espresso, borderRadius: R.lg, paddingHorizontal: S.xxl, paddingVertical: S.md },
  browseBtnText: { fontFamily: F.sansSb, fontSize: 14, color: C.white },
});
