'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api, menuApi, authApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import {
  Coffee,
  ClipboardList,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  Bike,
  Navigation,
  CheckCircle,
  QrCode,
  Power,
  RefreshCw,
  LogOut,
  MapPin,
  Camera,
  X,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface Order {
  id: string;
  orderNumber: string;
  status: 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'READY';
  totalAmount: number;
  grandTotal: number;
  deliveryAddress: string;
  customer?: { name: string | null; phone: string | null; email: string };
  address?: {
    latitude: number | null;
    longitude: number | null;
    addressLine: string | null;
    societyName: string | null;
    tower: string | null;
    wing: string | null;
    floor: string | null;
    flatNumber: string | null;
    type: 'SOCIETY' | 'EXTERNAL';
  } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [isAdminRiderView, setIsAdminRiderView] = useState(false);

  // Standard Dashboard State
  const [stats, setStats] = useState({ orders: 0, items: 0, activeOrders: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Socket triggers for standard dashboard
  useSocket(
    accessToken,
    {
      'order:new': (order: any) => {
        if (user?.role !== 'RIDER') {
          setRecentOrders((prev) => [order, ...prev].slice(0, 5));
          setStats((prev) => ({
            ...prev,
            orders: prev.orders + 1,
            activeOrders: prev.activeOrders + 1,
          }));
          showToast(`New order #${order.orderNumber} — ₹${order.grandTotal?.toFixed(0)}`);
        }
      },
      'order:status': (d: any) => {
        if (user?.role !== 'RIDER') {
          if (d.status === 'DELIVERED' || d.status === 'CANCELLED') {
            setStats((prev) => ({ ...prev, activeOrders: Math.max(0, prev.activeOrders - 1) }));
          }
          setRecentOrders((prev) =>
            prev.map((o) => (o.id === d.orderId ? { ...o, status: d.status } : o)),
          );
        }
      },
      'revenue:updated': (d: { delta: number; newTotal: number }) => {
        if (user?.role !== 'RIDER') {
          setStats((prev) => ({ ...prev, revenue: d.newTotal }));
        }
      },
    },
    undefined,
    undefined,
  );

  useEffect(() => {
    if (user?.role !== 'RIDER' && !isAdminRiderView) {
      (async () => {
        try {
          const [ordersRes, itemsRes] = await Promise.all([
            api.get('/orders'),
            menuApi.getItems(),
          ]);
          const orders = ordersRes.data as any[];
          setRecentOrders(orders.slice(0, 5));
          const revenue = orders
            .filter((o: any) => o.status === 'DELIVERED')
            .reduce((sum: number, o: any) => sum + (o.grandTotal ?? 0), 0);
          setStats({
            orders: orders.length,
            items: itemsRes.data.length,
            activeOrders: orders.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
            revenue,
          });
        } catch {}
        setLoading(false);
      })();
    }
  }, [user?.role, isAdminRiderView]);

  // Logout wrapper
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    router.push('/login');
  };

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    PLACED:    { bg:'rgba(59,130,246,0.12)',  color:'#2563EB', label:'New' },
    ACCEPTED:  { bg:'rgba(139,92,246,0.12)',  color:'#7C3AED', label:'Accepted' },
    PREPARING: { bg:'rgba(245,158,11,0.12)',  color:'#B45309', label:'Preparing' },
    READY:     { bg:'rgba(79,122,84,0.12)',   color:'#4F7A54', label:'Ready' },
    DELIVERED: { bg:'rgba(93,64,55,0.1)',     color:'#9E7B6D', label:'Delivered' },
    CANCELLED: { bg:'rgba(169,68,66,0.1)',    color:'#A94442', label:'Cancelled' },
  };

  const STAT_CARDS = [
    { label: 'Total Orders',    value: stats.orders,                                 icon: ClipboardList,   color: '#B57A3C', bg: 'rgba(181,122,60,0.1)' },
    { label: 'Active Now',      value: stats.activeOrders,                           icon: TrendingUp,      color: '#4F7A54', bg: 'rgba(79,122,84,0.1)'  },
    { label: 'Menu Items',      value: stats.items,                                  icon: UtensilsCrossed, color: '#5D4037', bg: 'rgba(93,64,55,0.1)'   },
    { label: "Today's Revenue", value: `₹${stats.revenue.toFixed(0)}`,               icon: TrendingUp,      color: '#B57A3C', bg: 'rgba(181,122,60,0.1)' },
  ];

  // Render Rider Dashboard View if role matches
  if (user?.role === 'RIDER' || (user?.role === 'SUPER_ADMIN' && isAdminRiderView)) {
    return (
      <RiderDashboardView
        user={user}
        clearAuth={handleLogout}
        onToggleBack={user?.role === 'SUPER_ADMIN' ? () => setIsAdminRiderView(false) : undefined}
      />
    );
  }

  return (
    <div style={{ fontFamily:'Inter,sans-serif', color:'#2B1810' }}>
      {/* Page header */}
      <div style={{ marginBottom:36, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(181,122,60,0.1)', borderRadius:20, padding:'4px 12px', marginBottom:10 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#6DBF7E', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#B57A3C' }}>Live</span>
          </div>
          <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(24px,3vw,32px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.025em', marginBottom:6 }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'Staff'} ☕
          </h1>
          <p style={{ fontSize:14, color:'#9E7B6D' }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setIsAdminRiderView(true)}
            style={{
              background: 'linear-gradient(135deg, #B57A3C, #8E5A26)',
              color: '#FAF8F5',
              border: 'none',
              borderRadius: 12,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(181,122,60,0.3)',
            }}
          >
            <Bike size={15} /> Switch to Rider View
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:36 }}>
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background:'#FFFFFF', borderRadius:18, padding:'24px 22px', border:'1px solid rgba(93,64,55,0.08)', boxShadow:'0 2px 12px rgba(43,24,16,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={18} color={color}/>
              </div>
            </div>
            <div style={{ fontFamily:'"Playfair Display",serif', fontSize:32, fontWeight:700, color:'#2B1810', lineHeight:1, marginBottom:6 }}>
              {loading ? '—' : value}
            </div>
            <div style={{ fontSize:13, color:'#9E7B6D' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(93,64,55,0.08)', boxShadow:'0 2px 12px rgba(43,24,16,0.05)', overflow:'hidden' }}>
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid rgba(93,64,55,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:18, fontWeight:700, color:'#2B1810' }}>Recent Orders</h2>
            <p style={{ fontSize:12.5, color:'#9E7B6D', marginTop:3 }}>Latest 5 orders</p>
          </div>
          <button onClick={() => router.push('/orders')} style={{ fontSize:12.5, color:'#B57A3C', fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
            View all →
          </button>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#9E7B6D', fontSize:14 }}>
            <div style={{ width:32, height:32, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto 14px' }}/>
            Loading…
          </div>
        ) : recentOrders.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#9E7B6D' }}>
            <Coffee size={32} color="#E8DCCB" style={{ margin:'0 auto 12px' }}/>
            <p style={{ fontSize:14 }}>No orders yet — waiting for the first brew ☕</p>
          </div>
        ) : (
          <div>
            {recentOrders.map((order, i) => {
              const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.PLACED;
              return (
                <div key={order.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 24px',
                  borderBottom: i < recentOrders.length - 1 ? '1px solid rgba(93,64,55,0.06)' : 'none',
                  transition:'background 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'rgba(232,220,203,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Clock size={15} color="#B57A3C"/>
                    </div>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#2B1810' }}>#{order.orderNumber}</div>
                      <div style={{ fontSize:12, color:'#9E7B6D', marginTop:2 }}>{order.customer?.name || order.customer?.email || 'Customer'}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ fontFamily:'"Playfair Display",serif', fontSize:15, fontWeight:700, color:'#B57A3C' }}>&#8377;{(order.grandTotal ?? order.subtotal ?? 0).toFixed(0)}</div>
                    <div style={{ padding:'4px 10px', borderRadius:20, background:s.bg, fontSize:11, fontWeight:700, color:s.color, letterSpacing:'0.04em' }}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#2B1810', color: '#FAF8F5', padding: '12px 20px',
          borderRadius: 14, fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(43,24,16,0.35)',
          animation: 'slideIn 0.3s ease',
          maxWidth: 320,
        }}>
          🛎 {toast}
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   RIDER DASHBOARD SUBCOMPONENT
   ─────────────────────────────────────────────────────────────────────────── */

function RiderDashboardView({
  user,
  clearAuth,
  onToggleBack,
}: {
  user: any;
  clearAuth: () => void;
  onToggleBack?: () => void;
}) {
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Manual KOT scan override input
  const [manualToken, setManualToken] = useState('');

  // Camera QR scanner state
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // GPS Simulation state
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsProgress, setGpsProgress] = useState(0);
  const [gpsMessage, setGpsMessage] = useState('');
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRiderDashboard();
  }, []);

  // Web camera scanner lifecycle hook
  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5Qrcode('qr-reader-container');

          scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            async (decodedText) => {
              // Successfully read QR
              try {
                await scanner.stop();
              } catch (e) {}
              scannerRef.current = null;
              setShowScanner(false);
              await handleKotScanned(decodedText);
            },
            (errorMessage) => {
              // Ignore verbose frame scan warning messages silently
            }
          ).catch((err) => {
            console.error('Failed to start camera scan:', err);
          });

          scannerRef.current = scanner;
        } catch (err) {
          console.error('Failed to initialize QR scanner component:', err);
          setErrorMsg('Failed to open media camera. Check page permissions.');
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          const s = scannerRef.current as Html5Qrcode;
          if (s.isScanning) {
            s.stop().catch(() => {});
          }
          scannerRef.current = null;
        }
      };
    }
  }, [showScanner]);

  const fetchRiderDashboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const availRes = await api.get('/riders/available-orders').catch(() => ({ data: [] }));
      setAvailableOrders(availRes.data || []);

      const ordersRes = await api.get('/orders');
      const riderOrders = (ordersRes.data || []).filter(
        (o: any) =>
          o.riderId === user?.id &&
          (o.status === 'ASSIGNED' || o.status === 'OUT_FOR_DELIVERY')
      );
      setActiveOrder(riderOrders[0] ?? null);

      await api.get('/auth/me').then((res) => {
        setIsOnline(res.data?.riderProfile?.isOnline ?? false);
      }).catch(() => {});

    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to sync rider dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      const targetState = !isOnline;
      await api.patch('/riders/online', { isOnline: targetState });
      setIsOnline(targetState);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to toggle availability');
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/assign`);
      setErrorMsg('');
      fetchRiderDashboard();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to assign order');
    }
  };

  const handleKotScanned = async (token: string) => {
    if (!activeOrder) return;
    try {
      setLoading(true);
      const scanRes = await api.post('/orders/scan-kot', {
        token,
        riderId: user?.id,
      });

      if (scanRes.data.success) {
        setErrorMsg('');
        setManualToken('');
        fetchRiderDashboard();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'KOT Scan validation failed: Invalid QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleKotScanned(manualToken.trim());
  };

  // Mock location simulation updates
  const handleToggleGPSSimulator = () => {
    if (gpsActive) {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      setGpsActive(false);
      setGpsProgress(0);
      setGpsMessage('Simulation stopped.');
      return;
    }

    if (!activeOrder || !activeOrder.address?.latitude || !activeOrder.address?.longitude) {
      setErrorMsg('Active destination coords not resolved.');
      return;
    }

    const startLat = 19.0760;
    const startLng = 72.8777;
    const endLat = activeOrder.address.latitude;
    const endLng = activeOrder.address.longitude;

    setGpsActive(true);
    setGpsProgress(0);
    setGpsMessage('Rider leaving café... 🛵');

    const totalSteps = 6;
    let currentStep = 0;

    gpsIntervalRef.current = setInterval(async () => {
      currentStep++;
      const progress = Math.min((currentStep / totalSteps) * 100, 100);
      setGpsProgress(progress);

      const lat = startLat + (endLat - startLat) * (currentStep / totalSteps);
      const lng = startLng + (endLng - startLng) * (currentStep / totalSteps);

      setGpsMessage(`Location: (${lat.toFixed(5)}, ${lng.toFixed(5)}) — ${progress.toFixed(0)}%`);

      try {
        await api.post('/riders/location', {
          orderId: activeOrder.id,
          latitude: lat,
          longitude: lng,
          speed: 25,
        });
      } catch (err) {
        console.error('Failed to post coordinates update:', err);
      }

      if (currentStep >= totalSteps) {
        if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
        setGpsActive(false);
        setGpsMessage('Arrived at customer address! 📍 (Proximity: Verified)');
      }
    }, 3000);
  };

  const handleMarkDelivered = async () => {
    if (!activeOrder) return;
    try {
      setLoading(true);
      await api.patch(`/orders/${activeOrder.id}/status`, { status: 'DELIVERED' });
      setErrorMsg('');
      fetchRiderDashboard();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Proximity block: You must be within 5m to complete.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, []);

  const formatAddress = (addr: Order['address']) => {
    if (!addr) return '';
    if (addr.type === 'SOCIETY') {
      return [
        addr.flatNumber,
        addr.floor ? `Floor ${addr.floor}` : null,
        addr.wing ? `${addr.wing}-Wing` : null,
        addr.tower,
        addr.societyName,
      ]
        .filter(Boolean)
        .join(', ');
    }
    return addr.addressLine ?? '';
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#2B1810' }}>
      {/* Header Panel */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isOnline ? 'rgba(79,122,84,0.1)' : 'rgba(169,68,66,0.08)',
              borderRadius: 20,
              padding: '4px 12px',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isOnline ? '#6DBF7E' : '#A94442',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isOnline ? '#4F7A54' : '#A94442',
                textTransform: 'uppercase',
              }}
            >
              {isOnline ? 'Online for Deliveries' : 'Offline'}
            </span>
          </div>
          <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 28, fontWeight: 700 }}>
            Rider Panel
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {onToggleBack && (
            <button
              onClick={onToggleBack}
              style={{
                background: '#FAF8F5',
                border: '1.5px solid rgba(93,64,55,0.18)',
                borderRadius: 12,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back to Admin
            </button>
          )}

          <button
            onClick={handleToggleOnline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isOnline ? 'rgba(79,122,84,0.15)' : 'rgba(169,68,66,0.12)',
              border: `1.5px solid ${isOnline ? 'rgba(79,122,84,0.3)' : 'rgba(169,68,66,0.25)'}`,
              borderRadius: 12,
              padding: '8px 16px',
              cursor: 'pointer',
              color: isOnline ? '#4F7A54' : '#A94442',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <Power size={13} /> {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(169,68,66,0.08)',
            border: '1px solid rgba(169,68,66,0.2)',
            color: '#A94442',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13.5,
            marginBottom: 20,
            fontWeight: 500,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Active Task */}
        {activeOrder ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid rgba(93,64,55,0.08)',
              padding: 24,
              boxShadow: '0 2px 12px rgba(43,24,16,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#B57A3C',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Active Delivery
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 0' }}>
                  Order #{activeOrder.orderNumber}
                </h3>
              </div>
              <span
                style={{
                  backgroundColor: activeOrder.status === 'ASSIGNED' ? '#E0F2FE' : '#DCFCE7',
                  color: activeOrder.status === 'ASSIGNED' ? '#0369A1' : '#15803D',
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                {activeOrder.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div
              style={{
                background: '#FAF8F5',
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
                border: '1px solid rgba(93,64,55,0.06)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#9E7B6D',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Customer Details
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {activeOrder.customer?.name || activeOrder.customer?.email}
              </div>
              {activeOrder.customer?.phone && (
                <div style={{ fontSize: 12.5, color: '#5D4037', marginTop: 2 }}>
                  {activeOrder.customer.phone}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
                <MapPin size={14} color="#B57A3C" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#5D4037', lineHeight: 1.4 }}>
                  {formatAddress(activeOrder.address)}
                </span>
              </div>
            </div>

            {/* Handover KOT Scan actions */}
            {activeOrder.status === 'ASSIGNED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 13, color: '#5D4037', lineHeight: 1.5 }}>
                  Scan the printed KOT barcode to confirm package handover and start delivery route.
                </div>

                {/* Webcam scanner trigger */}
                {!showScanner ? (
                  <button
                    onClick={() => setShowScanner(true)}
                    style={{
                      backgroundColor: '#2B1810',
                      color: '#FAF8F5',
                      padding: '12px 20px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Camera size={16} /> Open Web Camera Scanner
                  </button>
                ) : (
                  <div style={{ border: '1.5px solid rgba(93,64,55,0.18)', borderRadius: 16, padding: 16, position: 'relative' }}>
                    <button
                      onClick={() => setShowScanner(false)}
                      style={{
                        position: 'absolute', right: 12, top: 12, zIndex: 10,
                        background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#FFF'
                      }}
                    >
                      <X size={14} />
                    </button>
                    <div id="qr-reader-container" style={{ width: '100%', maxWidth: 400, margin: 'auto' }} />
                  </div>
                )}

                {/* Manual validation fallback */}
                <form
                  onSubmit={handleManualScanSubmit}
                  style={{
                    display: 'flex',
                    gap: 10,
                    borderTop: '1px solid rgba(93,64,55,0.08)',
                    paddingTop: 16,
                  }}
                >
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Enter manual KOT Token or order ID"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid rgba(93,64,55,0.15)',
                      fontSize: 13,
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#5D4037',
                      color: '#FAF8F5',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm Handover
                  </button>
                </form>
              </div>
            )}

            {/* Live routing simulator */}
            {activeOrder.status === 'OUT_FOR_DELIVERY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ border: '1px solid rgba(93,64,55,0.12)', borderRadius: 14, padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Navigation size={14} color="#4F7A54" className={gpsActive ? 'animate-pulse' : ''} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Rider Live GPS Tracking</span>
                    </div>
                    <button
                      onClick={handleToggleGPSSimulator}
                      style={{
                        backgroundColor: gpsActive ? '#991B1B' : '#4F7A54',
                        color: '#FAF8F5',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {gpsActive ? 'Stop Simulation' : 'Start GPS Simulator'}
                    </button>
                  </div>

                  {gpsActive || gpsProgress > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div
                        style={{
                          height: 6,
                          width: '100%',
                          backgroundColor: '#E8DCCB',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${gpsProgress}%`,
                            backgroundColor: '#4F7A54',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: '#5D4037', fontStyle: 'italic' }}>
                        {gpsMessage}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9E7B6D' }}>
                      Click start to mock coordinate frames (moves coordinates sequentially to client destination).
                    </span>
                  )}
                </div>

                <button
                  onClick={handleMarkDelivered}
                  disabled={loading}
                  style={{
                    backgroundColor: '#4F7A54',
                    color: '#FAF8F5',
                    padding: '14px 20px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle size={16} /> Confirm Order Delivered
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid rgba(93,64,55,0.08)',
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 2px 12px rgba(43,24,16,0.02)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛵</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No active delivery</h3>
            <p style={{ fontSize: 13, color: '#9E7B6D', marginTop: 4, marginBottom: 0 }}>
              Toggle online and accept available order requests below.
            </p>
          </div>
        )}

        {/* Available Jobs */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid rgba(93,64,55,0.08)',
            padding: 24,
            boxShadow: '0 2px 12px rgba(43,24,16,0.02)',
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Available Jobs ({availableOrders.length})
          </h3>

          {availableOrders.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9E7B6D', margin: 0, textAlign: 'center', padding: '16px 0' }}>
              No pending delivery offers at the moment.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid rgba(93,64,55,0.08)',
                    borderRadius: 14,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#FAF8F5',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Order #{order.orderNumber}</div>
                    <div style={{ fontSize: 12, color: '#9E7B6D', marginTop: 2 }}>
                      {order.deliveryAddress}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#B57A3C', marginTop: 4 }}>
                      Total amount: ₹{order.grandTotal?.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={!isOnline || !!activeOrder}
                    style={{
                      backgroundColor: !isOnline || !!activeOrder ? '#C4B5AC' : '#2B1810',
                      color: '#FAF8F5',
                      padding: '8px 16px',
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: !isOnline || !!activeOrder ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
