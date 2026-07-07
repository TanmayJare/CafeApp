'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { MapPin, Clock, ArrowLeft, CheckCircle, Package, ChefHat, Bike, Home, RefreshCw, Coffee, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

const OrderTrackingMap = dynamic(() => import('@/components/maps/OrderTrackingMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, width: '100%', background: '#EAE5DF', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: '#9E7B6D', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 14, height: 14, border: '2px solid rgba(93,64,55,0.3)', borderTopColor: '#5D4037', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading map…
      </div>
    </div>
  ),
});

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  customizations: string | null;
  menuItem: { id: string; name: string };
}

interface Address {
  id: string;
  latitude: number | null;
  longitude: number | null;
  addressLine: string | null;
  societyName: string | null;
  tower: string | null;
  wing: string | null;
  floor: string | null;
  flatNumber: string | null;
  type: 'SOCIETY' | 'EXTERNAL';
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  deliveryAddress: string;
  address?: Address | null;
  customerPhone: string | null;
  specialInstructions: string | null;
  createdAt: string;
  items: OrderItem[];
  rider?: {
    name: string | null;
    phone: string | null;
  } | null;
}

const STATUS_STEPS = [
  { key:'PLACED',    icon:Package,    label:'Order Placed',      sub:"We've received your order",           color:'#B57A3C' },
  { key:'ACCEPTED',  icon:CheckCircle,label:'Accepted',          sub:'Café has accepted your order',        color:'#C9964A' },
  { key:'PREPARING', icon:ChefHat,    label:'Being Prepared',    sub:'Our baristas are crafting your order',color:'#D4AF37' },
  { key:'READY',     icon:Bike,       label:'Ready / Assigned',  sub:'Delivery agent is assigning',         color:'#6DBF7E' },
  { key:'OUT_FOR_DELIVERY', icon:Navigation, label:'Out for Delivery', sub:'Rider is on the way with your order!', color:'#38BDF8' },
  { key:'DELIVERED', icon:Home,       label:'Delivered',         sub:'Enjoy your order!',                   color:'#4F7A54' },
];

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.');
    if (isLocal) {
      return `http://${hostname}:3000`;
    }
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
};

const WS_URL = getWsUrl();

export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { token, isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [riderCoords, setRiderCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchOrder();

    if (token) {
      const newSocket = io(`${WS_URL}/orders`, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      newSocket.on('connect', () => newSocket.emit('join-order', orderId));
      newSocket.on('order:status', (data: { orderId: string; status: Order['status'] }) => {
        if (data.orderId === orderId) setOrder(prev => prev ? { ...prev, status: data.status } : null);
      });
      newSocket.on('rider:location', (data: { orderId: string; latitude: number; longitude: number }) => {
        if (data.orderId === orderId) {
          setRiderCoords({ latitude: data.latitude, longitude: data.longitude });
        }
      });
      setSocket(newSocket);
      return () => { newSocket.emit('leave-order', orderId); newSocket.close(); };
    }
  }, [orderId, token]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (e) {
      console.error('Failed to fetch order:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrder();
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'CANCELLED') return -1;
    const statusKey = order.status === 'ASSIGNED' ? 'READY' : order.status;
    return STATUS_STEPS.findIndex(s => s.key === statusKey);
  };

  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getEstimatedTime = () => {
    if (!order) return '';
    if (order.status === 'DELIVERED') return 'Delivered ✓';
    if (order.status === 'CANCELLED') return 'Cancelled';
    if (order.status === 'READY') return 'Ready now';

    if (riderCoords && order.address?.latitude && order.address?.longitude) {
      const dist = calculateHaversine(
        riderCoords.latitude,
        riderCoords.longitude,
        order.address.latitude,
        order.address.longitude
      );
      const etaMins = Math.round((dist / 25) * 60);
      if (etaMins <= 1) return 'Arriving now';
      return `${etaMins} mins (${dist.toFixed(1)} km away)`;
    }

    const remaining = (5 - getCurrentStepIndex()) * 5;
    return `${remaining}–${remaining + 5} min`;
  };

  const getProgressPercent = () => {
    if (!order || order.status === 'CANCELLED') return 0;
    const idx = getCurrentStepIndex();
    return Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
  };

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ position:'relative', width:56, height:56, margin:'0 auto 20px' }}>
            <div style={{ width:56, height:56, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Coffee size={20} color="#B57A3C" /></div>
          </div>
          <p style={{ fontFamily:'"Playfair Display",serif', fontSize:16, color:'#5D4037', fontWeight:600 }}>Loading your order…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5', flexDirection:'column', gap:16 }}>
        <span style={{ fontSize:48 }}>📦</span>
        <p style={{ fontFamily:'"Playfair Display",serif', fontSize:22, color:'#5D4037' }}>Order not found</p>
        <button onClick={() => router.push('/')} style={{ padding:'12px 28px', borderRadius:14, background:'linear-gradient(135deg,#3E2723,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'Inter,sans-serif' }}>
          Back to Menu
        </button>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const isCancelled = order.status === 'CANCELLED';
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div style={{ minHeight:'100vh', background:'#FAF8F5', fontFamily:'Inter,sans-serif', color:'#2B1810' }}>

      {/* ── Header ── */}
      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(250,248,245,0.92)', backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(93,64,55,0.1)',
        padding:'0 clamp(16px,4vw,40px)', height:68,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 2px 16px rgba(43,24,16,0.06)',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', borderRadius:12, padding:'8px 16px', cursor:'pointer', fontSize:13.5, fontWeight:500, color:'#5D4037', transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
        >
          <ArrowLeft size={15}/> Menu
        </button>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'"Playfair Display",serif', fontSize:18, fontWeight:700, color:'#2B1810' }}>Order Tracking</div>
          <div style={{ fontSize:11, color:'#B0998B', letterSpacing:'0.05em', marginTop:1 }}>{order.orderNumber}</div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || isDelivered || isCancelled}
          style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', borderRadius:12, padding:'8px 14px', cursor:'pointer', fontSize:13, fontWeight:500, color:'#5D4037', transition:'all 0.2s', opacity:(refreshing || isDelivered || isCancelled) ? 0.5 : 1, fontFamily:'Inter,sans-serif' }}
          onMouseEnter={e => { if (!refreshing && !isDelivered && !isCancelled) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/> Refresh
        </button>
      </header>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'40px clamp(16px,4vw,40px) 80px' }}>

        {/* ── Status Banner ── */}
        <div style={{
          borderRadius:24, overflow:'hidden', marginBottom:32,
          background: isCancelled
            ? 'linear-gradient(135deg,#5C1A1A,#A94442)'
            : isDelivered
            ? 'linear-gradient(135deg,#1A3A1E,#4F7A54)'
            : 'linear-gradient(155deg,#1C0F0A 0%,#2B1810 50%,#3E2723 100%)',
          padding:'28px 32px', position:'relative',
        }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-30, left:-20, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }}/>

          <div style={{ position:'relative' }}>
            <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.12em', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:8 }}>
              {isCancelled ? 'Order Status' : 'Live Tracking'}
            </div>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(22px,4vw,30px)', fontWeight:700, color:'#FAF8F5', lineHeight:1.2, marginBottom:14 }}>
              {isCancelled ? 'Order Cancelled' :
               isDelivered ? 'Delivered! Enjoy ☕' :
               order.status === 'PREPARING' ? 'Being Prepared…' :
               order.status === 'READY' ? 'Ready for Delivery!' :
               order.status === 'ACCEPTED' ? 'Order Accepted!' :
               'Order Placed!'}
            </h2>

            {/* Progress bar */}
            {!isCancelled && (
              <div style={{ marginBottom:16 }}>
                <div style={{ height:4, background:'rgba(255,255,255,0.15)', borderRadius:4, overflow:'hidden', maxWidth:400 }}>
                  <div style={{ height:'100%', width:`${getProgressPercent()}%`, background:'linear-gradient(90deg,#B57A3C,#D4AF37)', borderRadius:4, transition:'width 0.8s ease' }}/>
                </div>
              </div>
            )}

            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(255,255,255,0.7)' }}>
                <Clock size={14}/> {getEstimatedTime()}
              </span>
              <span style={{ padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,0.12)', fontSize:12, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>
                ₹{order.totalAmount}
              </span>
              {!isCancelled && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'rgba(255,255,255,0.5)' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: isDelivered ? '#6DBF7E' : '#B57A3C', display:'inline-block', animation: isDelivered ? 'none' : 'pulse 1.5s infinite' }}/>
                  {isDelivered ? 'Completed' : 'Live'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>

          {/* ── Left: Timeline + Delivery ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Timeline */}
            <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(93,64,55,0.09)', padding:'26px', boxShadow:'0 2px 16px rgba(43,24,16,0.06)' }}>
              <h3 style={{ fontFamily:'"Playfair Display",serif', fontSize:17, fontWeight:700, color:'#2B1810', marginBottom:26 }}>
                Order Timeline
              </h3>

              <div style={{ position:'relative' }}>
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = !isCancelled && index <= currentStepIndex;
                  const isCurrent = !isCancelled && index === currentStepIndex;
                  const isLast = index === STATUS_STEPS.length - 1;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} style={{ display:'flex', gap:16, paddingBottom: isLast ? 0 : 32, position:'relative' }}>
                      {/* Connector line */}
                      {!isLast && (
                        <div style={{
                          position:'absolute', left:19, top:42, width:2, height:'calc(100% - 14px)',
                          background: isCompleted && index < currentStepIndex
                            ? 'linear-gradient(180deg,#4F7A54,#6DBF7E)'
                            : 'rgba(93,64,55,0.1)',
                          borderRadius:2, transition:'background 0.6s ease',
                        }}/>
                      )}

                      {/* Icon */}
                      <div style={{
                        width:40, height:40, borderRadius:13, flexShrink:0, zIndex:1, position:'relative',
                        background: isCompleted
                          ? isCurrent
                          ? `linear-gradient(135deg,${step.color},${step.color}cc)`
                          : 'linear-gradient(135deg,#2E4A31,#4F7A54)'
                          : 'rgba(93,64,55,0.08)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.4s cubic-bezier(.34,1.56,.64,1)',
                        boxShadow: isCurrent ? `0 0 0 5px ${step.color}22` : 'none',
                      }}>
                        <Icon size={18} color={isCompleted ? '#FAF8F5' : 'rgba(93,64,55,0.35)'} />
                      </div>

                      {/* Content */}
                      <div style={{ flex:1, paddingTop:8 }}>
                        <p style={{ fontSize:14, fontWeight:700, color: isCompleted ? '#2B1810' : '#C4B0A3', marginBottom:3, transition:'color 0.3s' }}>
                          {step.label}
                        </p>
                        <p style={{ fontSize:12.5, color: isCompleted ? '#9E7B6D' : '#D7C5AE', lineHeight:1.5 }}>
                          {isCurrent ? step.sub : isCompleted ? '✓ Completed' : 'Pending'}
                        </p>
                        {isCurrent && !isDelivered && (
                          <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:7, background:`${step.color}18`, padding:'3px 10px', borderRadius:8 }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:step.color, animation:'pulse 1.5s infinite' }}/>
                            <span style={{ fontSize:11, fontWeight:700, color:step.color }}>In Progress</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isCancelled && (
                  <div style={{ display:'flex', gap:16 }}>
                    <div style={{ width:40, height:40, borderRadius:13, background:'linear-gradient(135deg,#5C1A1A,#A94442)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:18 }}>✕</span>
                    </div>
                    <div style={{ paddingTop:8 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#A94442' }}>Order Cancelled</p>
                      <p style={{ fontSize:12.5, color:'#B0998B' }}>Your order was cancelled</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivering To */}
            <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(93,64,55,0.09)', padding:'20px 24px', boxShadow:'0 2px 16px rgba(43,24,16,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#3E2723,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MapPin size={15} color="#FAF8F5"/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'#5D4037', letterSpacing:'0.07em', textTransform:'uppercase' }}>Delivering To</span>
              </div>
              <p style={{ fontSize:14, color:'#2B1810', fontWeight:500, lineHeight:1.65 }}>
                {order.deliveryAddress || 'Saved address'}
              </p>
            </div>

            {/* Live Tracking Map */}
            {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.address?.latitude && order.address?.longitude ? (
              <div style={{ height: 320, width: '100%', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 16px rgba(43,24,16,0.06)', border: '1px solid rgba(93,64,55,0.1)' }}>
                <OrderTrackingMap
                  cafeLat={19.0760}
                  cafeLng={72.8777}
                  customerLat={order.address.latitude}
                  customerLng={order.address.longitude}
                  riderLat={riderCoords?.latitude ?? null}
                  riderLng={riderCoords?.longitude ?? null}
                />
              </div>
            ) : (
              <div style={{
                background:'linear-gradient(135deg,rgba(79,111,82,0.08),rgba(93,64,55,0.06))',
                borderRadius:20, border:'1.5px dashed rgba(93,64,55,0.2)',
                padding:'32px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              }}>
                <div style={{ fontSize:32 }}>🗺️</div>
                <p style={{ fontFamily:'"Playfair Display",serif', fontSize:15, fontWeight:600, color:'#5D4037' }}>Live Map</p>
                <p style={{ fontSize:12, color:'#B0998B', lineHeight:1.5 }}>
                  {order.status === 'DELIVERED' ? 'Delivery completed!' :
                   order.status === 'CANCELLED' ? 'Order cancelled' :
                   'Map tracking will appear when address coordinates are available'}
                </p>
              </div>
            )}
          </div>

          {/* ── Right: Order Summary ── */}
          <div>
            <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(93,64,55,0.09)', padding:'22px', position:'sticky', top:84, boxShadow:'0 2px 16px rgba(43,24,16,0.06)' }}>
              <h3 style={{ fontFamily:'"Playfair Display",serif', fontSize:16, fontWeight:700, color:'#2B1810', marginBottom:18 }}>
                Order Summary
              </h3>

              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
                {order.items.map(item => (
                  <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:'#2B1810', marginBottom:2 }}>{item.menuItem.name}</p>
                      {item.customizations && <p style={{ fontSize:11, color:'#B0998B' }}>{item.customizations}</p>}
                      <p style={{ fontSize:12, color:'#B0998B' }}>× {item.quantity}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:'#2B1810', flexShrink:0 }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop:'1px solid rgba(93,64,55,0.1)', paddingTop:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'"Playfair Display",serif', fontSize:15, fontWeight:700, color:'#2B1810' }}>Total Paid</span>
                  <span style={{ fontFamily:'"Playfair Display",serif', fontSize:20, fontWeight:700, color:'#2B1810' }}>₹{order.totalAmount}</span>
                </div>
              </div>

              {/* Delivery agent placeholder */}
              {!isCancelled && !isDelivered && (
                <div style={{ marginTop:18, padding:'14px 16px', background:'rgba(232,220,203,0.35)', borderRadius:14, border:'1px solid rgba(93,64,55,0.1)' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#B57A3C', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Delivery Partner</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#5D4037,#3E2723)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🛵</div>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#2B1810' }}>{order.rider?.name || 'Assigned Rider'}</div>
                      <div style={{ fontSize:11.5, color:'#9E7B6D' }}>ETA: {getEstimatedTime()}</div>
                    </div>
                  </div>
                </div>
              )}

              {isDelivered && (
                <button
                  onClick={() => router.push('/')}
                  style={{ width:'100%', marginTop:16, padding:'13px', borderRadius:14, background:'linear-gradient(135deg,#3E2723,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'Inter,sans-serif', boxShadow:'0 4px 16px rgba(43,24,16,0.25)' }}
                >
                  Order Again ✦
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  );
}
