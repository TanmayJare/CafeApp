'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api, menuApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Coffee, ClipboardList, UtensilsCrossed, TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const user        = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [stats, setStats] = useState({ orders: 0, items: 0, activeOrders: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // 34B.1 — new order arrives on socket → prepend to list, bump stats
  // 34B.5 — revenue:updated → update revenue counter
  useSocket(
    accessToken,
    {
      'order:new': (order: any) => {
        setRecentOrders((prev) => [order, ...prev].slice(0, 5));
        setStats((prev) => ({
          ...prev,
          orders: prev.orders + 1,
          activeOrders: prev.activeOrders + 1,
        }));
        showToast(`New order #${order.orderNumber} — ₹${order.grandTotal?.toFixed(0)}`);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order', {
            body: `Order #${order.orderNumber} received`,
          });
        }
      },
      'order:status': (d: any) => {
        if (d.status === 'DELIVERED' || d.status === 'CANCELLED') {
          setStats((prev) => ({ ...prev, activeOrders: Math.max(0, prev.activeOrders - 1) }));
        }
        setRecentOrders((prev) =>
          prev.map((o) => (o.id === d.orderId ? { ...o, status: d.status } : o)),
        );
      },
      'revenue:updated': (d: { delta: number; newTotal: number }) => {
        setStats((prev) => ({ ...prev, revenue: d.newTotal }));
      },
    },
    undefined,
    undefined,
  );

  useEffect(() => {
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
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  return (
    <div style={{ fontFamily:'Inter,sans-serif', color:'#2B1810' }}>

      {/* Page header */}
      <div style={{ marginBottom:36 }}>
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

      {/* Toast notification */}
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

// Made with Bob
