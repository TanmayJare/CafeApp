import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { C, F, R, S } from '../../lib/tokens';

const STEPS = [
  { key: 'PLACED',          label: 'Order placed' },
  { key: 'ACCEPTED',        label: 'Accepted by café' },
  { key: 'PREPARING',       label: 'Preparing your order' },
  { key: 'READY',           label: 'Ready for pickup' },
  { key: 'ASSIGNED',        label: 'Rider assigned' },
  { key: 'OUT_FOR_DELIVERY',label: 'On the way' },
  { key: 'DELIVERED',       label: 'Delivered ✓' },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r: any) => r.data),
  });

  // 34C.1 — update both liveStatus AND the QueryClient cache on order:status
  const { emit } = useSocket(
    {
      'order:status': (data: { orderId: string; status: string; order: any }) => {
        if (data.orderId === id) {
          setLiveStatus(data.status);
          // Also update the cached query so stale data is gone after backgrounding
          qc.setQueryData(['order', id], (old: any) =>
            old ? { ...old, status: data.status } : old,
          );
        }
      },
    },
    () => emit('join-order', id),
  );

  const currentStatus = liveStatus ?? order?.status ?? 'PLACED';
  const currentStepIdx = STEPS.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  if (isLoading) return (
    <View style={styles.center}><ActivityIndicator color={C.espresso} size="large" /></View>
  );
  if (!order) return (
    <View style={styles.center}>
      <Text style={{ fontFamily: F.sans, color: C.ink3 }}>Order not found</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNum}>#{order.orderNumber}</Text>
          <Text style={styles.statusLabel}>{currentStatus.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 40 }}>
        {/* Status stepper */}
        <View style={styles.stepperCard}>
          {isCancelled ? (
            <View style={styles.cancelledRow}>
              <View style={[styles.dot, { backgroundColor: C.redText }]} />
              <Text style={{ fontFamily: F.sansMd, fontSize: 14, color: C.redText }}>Order cancelled</Text>
            </View>
          ) : (
            STEPS.filter((s) => s.key !== 'CANCELLED').map((step, idx) => {
              const done = idx <= currentStepIdx;
              const active = idx === currentStepIdx;
              const isLast = idx === STEPS.length - 2;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={{ alignItems: 'center', marginRight: S.md }}>
                    <View style={[
                      styles.dot,
                      done ? { backgroundColor: C.matcha } : { backgroundColor: C.border },
                    ]} />
                    {!isLast && (
                      <View style={[
                        styles.stepLine,
                        done ? { backgroundColor: C.matcha } : { backgroundColor: C.border },
                      ]} />
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    done ? { color: C.ink, fontFamily: F.sansMd } : { color: C.ink3, fontFamily: F.sans },
                    active && { fontFamily: F.sansSb },
                  ]}>
                    {step.label}
                    {active ? ' — In progress' : ''}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Delivery address */}
        {order.address && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>DELIVERING TO</Text>
            <Text style={styles.infoText}>
              {order.address.type === 'SOCIETY'
                ? `${order.address.tower}, ${order.address.wing}-Wing, Floor ${order.address.floor}, Flat ${order.address.flatNumber}`
                : order.address.addressLine}
            </Text>
          </View>
        )}

        {/* Order summary */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ORDER SUMMARY</Text>
          {order.items.map((it: any) => (
            <View key={it.id} style={styles.summaryRow}>
              <Text style={styles.summaryItem}>{it.quantity}× {it.name}</Text>
              <Text style={styles.summaryPrice}>₹{it.lineTotal}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryItem, { fontFamily: F.monoMd }]}>Total paid</Text>
            <Text style={[styles.summaryPrice, { fontFamily: F.monoMd }]}>₹{order.grandTotal}</Text>
          </View>
        </View>

        {currentStatus === 'DELIVERED' && (
          <View style={styles.deliveredBanner}>
            <Text style={styles.deliveredText}>✓ Order delivered! Enjoy your food.</Text>
          </View>
        )}

        {/* 38C.4 — Invoice card (DELIVERED only) */}
        {currentStatus === 'DELIVERED' && (
          <InvoiceCard orderId={id!} orderNumber={order.orderNumber} grandTotal={order.grandTotal} createdAt={order.createdAt} />
        )}
      </ScrollView>
    </View>
  );
}

/** 38C.2/38C.3 — Download invoice via Linking.openURL (opens PDF in browser/system PDF viewer) */
import { Platform } from 'react-native';

function InvoiceCard({ orderId, orderNumber, grandTotal, createdAt }: {
  orderId: string; orderNumber: string; grandTotal: number; createdAt: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const baseURL: string = (api.defaults.baseURL as string) ?? 'http://localhost:3000/api';
      // Read token from SecureStore (native) or localStorage (web)
      let token: string | null = null;
      if (Platform.OS === 'web') {
        token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } else {
        const SecureStore = await import('expo-secure-store');
        token = await SecureStore.getItemAsync('accessToken');
      }
      const url = `${baseURL}/orders/${orderId}/invoice${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open invoice link on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not open invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={invoiceStyles.card}>
      <View style={invoiceStyles.header}>
        <Text style={invoiceStyles.headerText}>Invoice</Text>
      </View>
      <View style={invoiceStyles.body}>
        <View style={invoiceStyles.row}>
          <Text style={invoiceStyles.key}>Invoice number</Text>
          <Text style={invoiceStyles.val}>INV-{orderNumber}</Text>
        </View>
        <View style={invoiceStyles.row}>
          <Text style={invoiceStyles.key}>Issued</Text>
          <Text style={invoiceStyles.val}>{new Date(createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</Text>
        </View>
        <View style={invoiceStyles.row}>
          <Text style={invoiceStyles.key}>Total</Text>
          <Text style={[invoiceStyles.val, { fontFamily: F.monoMd }]}>₹{grandTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={invoiceStyles.downloadBtn}
          onPress={handleDownload}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={C.espresso} size="small" />
            : <Text style={invoiceStyles.downloadBtnText}>⬇ Download PDF</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const invoiceStyles = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: R.lg, marginBottom: S.md, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  header: { backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingVertical: S.sm },
  headerText: { fontFamily: F.sansSb, fontSize: 12, color: C.cream, letterSpacing: 1, textTransform: 'uppercase' },
  body: { padding: S.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.sm },
  key: { fontFamily: F.sans, fontSize: 13, color: C.ink3 },
  val: { fontFamily: F.sans, fontSize: 13, color: C.ink },
  downloadBtn: { marginTop: S.md, paddingVertical: S.sm, alignItems: 'center' },
  downloadBtnText: { fontFamily: F.sansMd, fontSize: 14, color: C.espresso },
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    backgroundColor: C.espresso, paddingHorizontal: S.xl, paddingTop: 52, paddingBottom: S.lg,
  },
  back: { fontFamily: F.sansSb, fontSize: 20, color: C.white },
  orderNum: { fontFamily: F.mono, fontSize: 13, color: C.cream },
  statusLabel: { fontFamily: F.serif, fontSize: 20, color: C.white, marginTop: 2 },
  stepperCard: { backgroundColor: C.white, borderRadius: R.lg, padding: S.xl, marginBottom: S.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  stepLine: { width: 2, flex: 1, minHeight: 30, marginTop: 2 },
  stepLabel: { fontSize: 14, marginBottom: S.md, paddingTop: -2 },
  cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  infoCard: { backgroundColor: C.white, borderRadius: R.lg, padding: S.xl, marginBottom: S.md },
  infoTitle: { fontFamily: F.sansMd, fontSize: 11, color: C.ink3, letterSpacing: 1.2, marginBottom: S.sm },
  infoText: { fontFamily: F.sans, fontSize: 14, color: C.ink },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItem: { fontFamily: F.mono, fontSize: 13, color: C.ink2 },
  summaryPrice: { fontFamily: F.mono, fontSize: 13, color: C.ink },
  divider: { height: 1, backgroundColor: C.border, marginVertical: S.sm },
  deliveredBanner: {
    backgroundColor: C.greenBg, borderRadius: R.lg, padding: S.lg, alignItems: 'center',
  },
  deliveredText: { fontFamily: F.sansSb, fontSize: 15, color: C.greenText },
});
