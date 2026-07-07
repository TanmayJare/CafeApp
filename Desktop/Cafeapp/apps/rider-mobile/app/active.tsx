/**
 * Active delivery screen — 38D.2 / 38D.3
 * Shows the rider's current assigned order and a "Scan KOT" button.
 * Scanning a valid QR transitions the order to OUT_FOR_DELIVERY via POST /orders/scan-kot.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api from '../lib/api';

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Head to café to pick up',
  OUT_FOR_DELIVERY: 'On the way to customer',
  DELIVERED: 'Delivered',
};

export default function ActiveScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const { data: activeOrder, isLoading } = useQuery({
    queryKey: ['active-order'],
    queryFn: async () => {
      const res = await api.get('/orders', { params: { status: 'ASSIGNED' } });
      const orders: any[] = res.data;
      const assigned = orders.filter((o) => o.status === 'ASSIGNED' || o.status === 'OUT_FOR_DELIVERY');
      return assigned[0] ?? null;
    },
    refetchInterval: 30_000,
  });

  // Live Location Reporting for order tracking (38D.3)
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let isTracking = true;

    const startTracking = async () => {
      if (!activeOrder || activeOrder.status !== 'OUT_FOR_DELIVERY') return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Rider location permission denied');
          return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 10,
          },
          async (location) => {
            if (!isTracking) return;
            try {
              await api.post('/riders/location', {
                orderId: activeOrder.id,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                speed: location.coords.speed ?? 0,
              });
            } catch (err) {
              console.error('Failed to post rider location update:', err);
            }
          }
        );
      } catch (err) {
        console.error('Error starting Location Watcher:', err);
      }
    };

    startTracking();

    return () => {
      isTracking = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [activeOrder?.id, activeOrder?.status]);

  const handleScan = async (data: string) => {
    if (scanDone) return;
    setScanDone(true);
    setScanning(false);

    try {
      const res = await api.post('/orders/scan-kot', {
        token: data,
        riderId: activeOrder?.riderId,
      });

      if (res.data.success) {
        // Check the scanned order matches active order
        if (activeOrder && res.data.orderId !== activeOrder.id) {
          showToast(`This QR is for order #${res.data.orderNumber}, your active order is #${activeOrder.orderNumber}`);
          setScanDone(false);
          return;
        }
        showToast(`Order #${res.data.orderNumber} — Out for delivery! 🛵`);
        qc.invalidateQueries({ queryKey: ['active-order'] });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Scan failed';
      if (msg.includes('expired') || msg.includes('QR code has expired')) {
        showToast('This QR code has expired — ask staff to regenerate');
      } else if (msg.includes('not in READY') || msg.includes('READY')) {
        const status = err.response?.data?.currentStatus ?? '';
        showToast(`Order isn't ready yet — current status: ${status}`);
      } else {
        showToast(msg);
      }
      setScanDone(false);
    }
  };

  const formatAddress = (addr: any) => {
    if (!addr) return '';
    if (addr.type === 'SOCIETY') {
      return [addr.flatNumber, addr.floor ? `Floor ${addr.floor}` : null, addr.wing ? `${addr.wing}-Wing` : null, addr.tower].filter(Boolean).join(', ');
    }
    return addr.addressLine ?? '';
  };

  if (isLoading) return (
    <View style={s.center}><ActivityIndicator color="#1C0F08" size="large" /></View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>CaféConnect Rider</Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={s.signout}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {scanning ? (
        /* ─── QR Scanner ─────────────────────────────────────────────────── */
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={scanDone ? undefined : (result) => handleScan(result.data)}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <View style={s.scanOverlay}>
            <View style={s.scanFrame} />
            <Text style={s.scanHint}>Point at the KOT QR code</Text>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setScanning(false); setScanDone(false); }}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 20 }}>
          {!activeOrder ? (
            /* No active order */
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🛵</Text>
              <Text style={s.emptyTitle}>No active delivery</Text>
              <Text style={s.emptySub}>New orders will appear here automatically</Text>
              <TouchableOpacity style={s.refreshBtn} onPress={() => qc.invalidateQueries({ queryKey: ['active-order'] })}>
                <Text style={s.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Active order card */
            <View style={s.orderCard}>
              <View style={s.orderHeader}>
                <Text style={s.orderNum}>#{activeOrder.orderNumber}</Text>
                <View style={[s.statusPill, { backgroundColor: activeOrder.status === 'ASSIGNED' ? '#DBEAFE' : '#DCFCE7' }]}>
                  <Text style={[s.statusPillText, { color: activeOrder.status === 'ASSIGNED' ? '#1E40AF' : '#166534' }]}>
                    {activeOrder.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <Text style={s.sectionLabel}>STATUS</Text>
              <Text style={s.statusDesc}>{STATUS_LABEL[activeOrder.status] ?? activeOrder.status}</Text>

              <View style={s.divider} />

              <Text style={s.sectionLabel}>DELIVER TO</Text>
              <Text style={s.customer}>{activeOrder.customer?.name ?? activeOrder.customer?.email}</Text>
              {activeOrder.customer?.phone && <Text style={s.meta}>{activeOrder.customer.phone}</Text>}
              <Text style={s.meta}>{formatAddress(activeOrder.address)}</Text>

              <View style={s.divider} />

              <View style={s.totalRow}>
                <Text style={s.sectionLabel}>TOTAL</Text>
                <Text style={s.total}>₹{activeOrder.grandTotal?.toFixed(2)}</Text>
              </View>

              {/* Scan KOT button — visible when ASSIGNED */}
              {activeOrder.status === 'ASSIGNED' && (
                <TouchableOpacity
                  style={s.scanBtn}
                  onPress={async () => {
                    if (!permission?.granted) {
                      const result = await requestPermission();
                      if (!result.granted) {
                        Alert.alert('Camera permission required', 'Please allow camera access to scan QR codes.');
                        return;
                      }
                    }
                    setScanDone(false);
                    setScanning(true);
                  }}
                >
                  <Text style={s.scanBtnText}>📷  Scan KOT</Text>
                </TouchableOpacity>
              )}

              {activeOrder.status === 'OUT_FOR_DELIVERY' && (
                <TouchableOpacity
                  style={[s.scanBtn, { backgroundColor: '#3D6B4A' }]}
                  onPress={async () => {
                    try {
                      await api.patch(`/orders/${activeOrder.id}/status`, { status: 'DELIVERED' });
                      qc.invalidateQueries({ queryKey: ['active-order'] });
                      showToast('Order marked as Delivered ✓');
                    } catch (e: any) {
                      showToast(e.response?.data?.message ?? 'Could not update status');
                    }
                  }}
                >
                  <Text style={s.scanBtnText}>✓  Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Toast */}
      {toastMsg && (
        <View style={s.toast}>
          <Text style={s.toastText}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6EE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF6EE' },
  header: {
    backgroundColor: '#1C0F08', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  brand: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#FBF6EE' },
  signout: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8A7D74' },

  emptyCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 20, padding: 40, margin: 0,
    borderWidth: 1, borderColor: '#E8E0D5',
  },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#4A3F38', marginBottom: 6 },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8A7D74', textAlign: 'center', marginBottom: 20 },
  refreshBtn: { backgroundColor: '#1C0F08', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 12 },
  refreshBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },

  orderCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E8E0D5',
  },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  orderNum: { fontFamily: 'Inter_600SemiBold', fontSize: 20, color: '#1C0F08' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#8A7D74', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  statusDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1A1410', marginBottom: 12 },
  customer: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1A1410' },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8A7D74', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E8E0D5', marginVertical: 14 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  total: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#1C0F08' },

  scanBtn: {
    backgroundColor: '#1C0F08', borderRadius: 28, paddingVertical: 16, alignItems: 'center',
  },
  scanBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },

  /* Scanner overlay */
  scanOverlay: {
    position: 'absolute', inset: 0,
    alignItems: 'center', justifyContent: 'center',
  } as any,
  scanFrame: {
    width: 240, height: 240, borderWidth: 3, borderColor: '#fff',
    borderRadius: 16, marginBottom: 20,
  },
  scanHint: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#fff', marginBottom: 20 },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 12 },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },

  /* Toast */
  toast: {
    position: 'absolute', bottom: 32, left: 20, right: 20,
    backgroundColor: '#1C0F08', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  toastText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FBF6EE', textAlign: 'center' },
});
