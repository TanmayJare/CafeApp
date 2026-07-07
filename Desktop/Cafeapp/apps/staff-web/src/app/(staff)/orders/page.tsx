'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { Coffee, ChevronRight, RefreshCw, Printer } from 'lucide-react';
import { KOTModal } from '@/components/staff/KOTModal';

/* ─── Types matching the actual Order schema from orders.service.ts ─────── */
interface OrderItem {
  id:         string;
  quantity:   number;
  unitPrice:  number;
  lineTotal:  number;
  name:       string;         // snapshot
  options:    { name: string; priceDelta: number }[];
  menuItem:   { id: string; name: string };
}

interface Order {
  id:           string;
  orderNumber:  string;
  status:       'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  grandTotal:   number;
  subtotal:     number;
  taxAmount:    number;
  deliveryFee:  number;
  notes:        string | null;
  paymentMethod: string;
  createdAt:    string;
  items:        OrderItem[];
  pickedUpAt?:  string | null;
  pickedUpRiderName?: string | null;
  acceptedAt?:  string | null;
  acceptedStaffName?: string | null;
  confirmedAt?: string | null;
  confirmedStaffName?: string | null;
  deliveredAt?: string | null;
  rider?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  address: {
    label:       string | null;
    addressLine: string | null;
    tower:       string | null;
    wing:        string | null;
    floor:       string | null;
    flatNumber:  string | null;
    pincode:     string | null;
  };
  customer: {
    id:    string;
    name:  string | null;
    email: string;
    phone: string | null;
  };
}

/* ─── Status metadata ───────────────────────────────────────────────────── */
const STATUS: Record<Order['status'], { bg: string; color: string; label: string; dot: string }> = {
  PLACED:    { bg: 'rgba(59,130,246,0.1)',  color: '#2563EB', label: 'New Order',  dot: '#3B82F6' },
  ACCEPTED:  { bg: 'rgba(139,92,246,0.1)',  color: '#7C3AED', label: 'Accepted',   dot: '#8B5CF6' },
  PREPARING: { bg: 'rgba(245,158,11,0.1)',  color: '#B45309', label: 'Preparing',  dot: '#F59E0B' },
  READY:     { bg: 'rgba(79,122,84,0.1)',   color: '#4F7A54', label: 'Ready',      dot: '#6DBF7E' },
  ASSIGNED:  { bg: 'rgba(14,165,233,0.1)',  color: '#0284C7', label: 'Assigned',   dot: '#38BDF8' },
  OUT_FOR_DELIVERY: { bg: 'rgba(99,102,241,0.1)', color: '#4F46E5', label: 'On Way', dot: '#6366F1' },
  DELIVERED: { bg: 'rgba(34,197,94,0.1)',   color: '#16A34A', label: 'Delivered',  dot: '#22C55E' },
  CANCELLED: { bg: 'rgba(239,68,66,0.1)',   color: '#A94442', label: 'Cancelled',  dot: '#EF4444' },
};

const STATUS_FLOW: Partial<Record<Order['status'], Order['status']>> = {
  PLACED: 'ACCEPTED', ACCEPTED: 'PREPARING', PREPARING: 'READY',
};

/** Build a one-line delivery address string from the Address object */
function formatAddress(addr: Order['address']): string {
  if (!addr) return 'N/A';
  const parts: string[] = [];
  if (addr.flatNumber) parts.push(addr.flatNumber);
  if (addr.floor)      parts.push(`Floor ${addr.floor}`);
  if (addr.wing)       parts.push(`Wing ${addr.wing}`);
  if (addr.tower)      parts.push(addr.tower);
  if (addr.addressLine) parts.push(addr.addressLine);
  if (addr.pincode)    parts.push(addr.pincode);
  return parts.join(', ') || addr.label || 'N/A';
}

const KOT_STATUSES: Order['status'][] = ['ACCEPTED', 'PREPARING', 'READY'];

export default function OrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [toast, setToast] = useState<string | null>(null);
  const [kotOrder, setKotOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // 34B.1/34B.2 — subscribe to real-time order events
  useSocket(
    accessToken,
    {
      // New order: prepend to list
      'order:new': (o: Order) => {
        setOrders((prev) => [o, ...prev]);
        showToast(`New order #${o.orderNumber} received!`);
      },
      // Status change: update in-place (34B.2)
      'order:status': (d: { orderId: string; status: Order['status']; order: Order }) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === d.orderId ? { ...o, status: d.status } : o)),
        );
      },
    },
    () => setConnStatus('connected'),
    () => setConnStatus('disconnected'),
  );

  useEffect(() => {
    fetchOrders();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const r = await api.get('/orders');
      setOrders(r.data);
    } catch {}
    setLoading(false);
  };

  const updateStatus = async (orderId: string, status: Order['status']) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch {}
  };

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: '#2B1810' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#2B1810', letterSpacing: '-0.025em', marginBottom: 6 }}>
            Orders Dashboard
          </h1>
          <p style={{ fontSize: 14, color: '#9E7B6D' }}>Manage incoming orders in real-time</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 20,
            background:  connStatus === 'connected' ? 'rgba(109,191,126,0.12)' : 'rgba(169,68,66,0.1)',
            border: `1px solid ${connStatus === 'connected' ? 'rgba(109,191,126,0.3)' : 'rgba(169,68,66,0.2)'}`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
              background: connStatus === 'connected' ? '#6DBF7E' : connStatus === 'connecting' ? '#F59E0B' : '#A94442',
              animation: connStatus !== 'connected' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: connStatus === 'connected' ? '#4F7A54' : '#A94442' }}>
              {connStatus === 'connected' ? 'Live' : connStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={fetchOrders}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.18)', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
          >
            <RefreshCw size={15} color="#5D4037" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: '#9E7B6D' }}>
          <div style={{ width: 40, height: 40, border: '2.5px solid #E8DCCB', borderTopColor: '#3E2723', borderRadius: '50%', animation: 'spin 0.9s linear infinite', marginBottom: 14 }} />
          <p style={{ fontSize: 14 }}>Loading orders…</p>
        </div>

      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 24px', background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.08)' }}>
          <Coffee size={40} color="#E8DCCB" style={{ margin: '0 auto 14px' }} />
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, color: '#5D4037', marginBottom: 6 }}>No orders yet</p>
          <p style={{ fontSize: 13.5, color: '#9E7B6D' }}>New orders will appear here automatically</p>
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(order => {
            const s          = STATUS[order.status];
            const nextStatus = STATUS_FLOW[order.status];
            return (
              <div key={order.id} style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.08)', boxShadow: '0 2px 12px rgba(43,24,16,0.05)', overflow: 'hidden' }}>

                {/* Card header */}
                <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid rgba(93,64,55,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(250,248,245,0.7)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#3E2723,#5D4037)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: '#FAF8F5' }}>#{order.orderNumber.slice(-3)}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#2B1810' }}>Order #{order.orderNumber}</div>
                      <div style={{ fontSize: 12, color: '#9E7B6D', marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '5px 13px', borderRadius: 20, background: s.bg, fontSize: 11.5, fontWeight: 700, color: s.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                    {s.label}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                  {/* Items */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B57A3C', marginBottom: 12 }}>Items</div>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: '#5D4037' }}>
                          <span style={{ fontWeight: 600, color: '#2B1810' }}>{item.quantity}×</span> {item.name}
                          {Array.isArray(item.options) && item.options.length > 0 && (
                            <span style={{ color: '#B0998B', fontSize: 11.5, marginLeft: 6 }}>
                              ({item.options.map(o => o.name).join(', ')})
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 600, color: '#2B1810' }}>&#8377;{item.lineTotal.toFixed(0)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid rgba(93,64,55,0.1)', paddingTop: 10, marginTop: 8 }}>
                      <span style={{ fontFamily: '"Playfair Display",serif', fontWeight: 700, color: '#2B1810', fontSize: 14 }}>Total</span>
                      <span style={{ fontFamily: '"Playfair Display",serif', fontWeight: 700, color: '#B57A3C', fontSize: 15 }}>&#8377;{order.grandTotal.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B57A3C', marginBottom: 12 }}>Delivery Details</div>
                     {[
                      { label: 'Customer', val: order.customer?.name || order.customer?.email || 'N/A' },
                      ...(order.customer?.phone ? [{ label: 'Phone', val: order.customer.phone }] : []),
                      { label: 'Address',  val: formatAddress(order.address) },
                      { label: 'Payment',  val: order.paymentMethod },
                      ...(order.acceptedStaffName
                        ? [{ label: 'Accepted By', val: `${order.acceptedStaffName} at ${new Date(order.acceptedAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} on ${new Date(order.acceptedAt!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` }]
                        : []),
                      ...(order.confirmedStaffName
                        ? [{ label: 'Prepared By', val: `${order.confirmedStaffName} at ${new Date(order.confirmedAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} on ${new Date(order.confirmedAt!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` }]
                        : []),
                      ...(order.pickedUpRiderName || order.rider?.name
                        ? [{ label: 'Rider', val: `${order.pickedUpRiderName || order.rider?.name || 'N/A'}${order.pickedUpAt ? ` (Picked up at ${new Date(order.pickedUpAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} on ${new Date(order.pickedUpAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})` : ''}` }]
                        : []),
                      ...(order.deliveredAt
                        ? [
                            {
                              label: 'Delivered At',
                              val: `${new Date(order.deliveredAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} on ${new Date(order.deliveredAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}`,
                            },
                          ]
                        : []),
                    ].map(({ label, val }) => (
                      <div key={label} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#B0998B', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#2B1810' }}>{val}</div>
                      </div>
                    ))}
                    {order.notes && (
                      <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, marginBottom: 3 }}>Notes</div>
                        <div style={{ fontSize: 12.5, color: '#92400E' }}>{order.notes}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(nextStatus || order.status === 'PLACED' || KOT_STATUSES.includes(order.status)) && (
                  <div style={{ padding: '0 22px 18px', display: 'flex', gap: 10 }}>
                    {KOT_STATUSES.includes(order.status) && (
                      <button
                        onClick={() => setKotOrder({ id: order.id, orderNumber: order.orderNumber })}
                        style={{
                          padding: '11px 18px', borderRadius: 12,
                          background: 'rgba(181,122,60,0.1)', border: '1.5px solid rgba(181,122,60,0.3)',
                          color: '#B57A3C', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: 6,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(181,122,60,0.18)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(181,122,60,0.1)'; }}
                      >
                        <Printer size={14} /> Print KOT
                      </button>
                    )}
                    {nextStatus && (
                      <button
                        onClick={() => updateStatus(order.id, nextStatus)}
                        style={{
                          flex: 1, padding: '11px', borderRadius: 12,
                          background: 'linear-gradient(135deg,#2B1810,#5D4037)',
                          color: '#FAF8F5', border: 'none', cursor: 'pointer',
                          fontSize: 13.5, fontWeight: 600, fontFamily: 'Inter,sans-serif',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          transition: 'all 0.2s', boxShadow: '0 3px 14px rgba(43,24,16,0.25)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                      >
                        Mark as {STATUS[nextStatus].label} <ChevronRight size={14} />
                      </button>
                    )}
                    {order.status === 'PLACED' && (
                      <button
                        onClick={() => updateStatus(order.id, 'CANCELLED')}
                        style={{
                          padding: '11px 20px', borderRadius: 12,
                          background: 'rgba(169,68,66,0.08)', border: '1.5px solid rgba(169,68,66,0.2)',
                          color: '#A94442', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                          fontFamily: 'Inter,sans-serif', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(169,68,66,0.15)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(169,68,66,0.08)'; }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {kotOrder && (
        <KOTModal
          orderId={kotOrder.id}
          orderNumber={kotOrder.orderNumber}
          onClose={() => setKotOrder(null)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#2B1810', color: '#FAF8F5', padding: '12px 20px',
          borderRadius: 14, fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(43,24,16,0.35)',
          animation: 'slideIn 0.3s ease', maxWidth: 320,
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

// Made with Bob
