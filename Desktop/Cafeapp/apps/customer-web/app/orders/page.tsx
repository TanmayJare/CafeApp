'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import {
  ShoppingBag, Coffee, Package, ChefHat, Bike, Home,
  Clock, MapPin, ChevronRight, ArrowRight, User, Bell, LogOut,
  CheckCircle, RefreshCw, Search,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  customizations: string | null;
  menuItem: { id: string; name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

/* ─── Design constants ───────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: any; step: number }> = {
  PLACED:    { label:'Order Placed',       color:'#B57A3C', bg:'rgba(181,122,60,0.12)',    icon:Package,     step:0 },
  ACCEPTED:  { label:'Accepted',           color:'#C9964A', bg:'rgba(201,150,74,0.12)',    icon:CheckCircle, step:1 },
  PREPARING: { label:'Preparing',          color:'#D4AF37', bg:'rgba(212,175,55,0.12)',    icon:ChefHat,     step:2 },
  READY:     { label:'Ready for Delivery', color:'#6DBF7E', bg:'rgba(109,191,126,0.12)',   icon:Bike,        step:3 },
  DELIVERED: { label:'Delivered',          color:'#4F7A54', bg:'rgba(79,122,84,0.12)',     icon:Home,        step:4 },
  CANCELLED: { label:'Cancelled',          color:'#A94442', bg:'rgba(169,68,66,0.1)',      icon:Package,     step:-1 },
};

const TIMELINE_STEPS: Array<{ key: OrderStatus; label: string; icon: any }> = [
  { key:'PLACED',    label:'Confirmed', icon:Package },
  { key:'ACCEPTED',  label:'Accepted',  icon:CheckCircle },
  { key:'PREPARING', label:'Preparing', icon:ChefHat },
  { key:'READY',     label:'Delivery',  icon:Bike },
  { key:'DELIVERED', label:'Delivered', icon:Home },
];

/* ─── Shared loader ──────────────────────────────────────────────────────── */
function CafeLoader({ text = 'Loading…' }: { text?: string }) {
  return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ position:'relative', width:48, height:48, margin:'0 auto 16px' }}>
          <div style={{ width:48, height:48, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Coffee size={18} color="#B57A3C"/></div>
        </div>
        <p style={{ fontFamily:'"Playfair Display",serif', fontSize:15, color:'#5D4037', fontWeight:600 }}>{text}</p>
      </div>
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    window.addEventListener('scroll', onScroll);
    document.addEventListener('mousedown', onClickOutside);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClickOutside); };
  }, []);

  return (
    <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:70, background: scrolled ? 'rgba(250,248,245,0.94)' : 'rgba(250,248,245,0.75)', backdropFilter:'blur(24px) saturate(1.6)', WebkitBackdropFilter:'blur(24px) saturate(1.6)', borderBottom: scrolled ? '1px solid rgba(93,64,55,0.12)' : '1px solid transparent', display:'flex', alignItems:'center', padding:'0 clamp(16px,4vw,48px)', gap:24, transition:'all 0.35s cubic-bezier(.4,0,.2,1)', boxShadow: scrolled ? '0 4px 24px rgba(43,24,16,0.08)' : 'none' }}>
      <div onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flexShrink:0, userSelect:'none' as any }}>
        <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#2B1810,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 12px rgba(43,24,16,0.3)', flexShrink:0 }}><Coffee size={19} color="#E8DCCB"/></div>
        <div style={{ lineHeight:1 }}>
          <div style={{ fontFamily:'"Playfair Display",serif', fontSize:19, fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>CaféConnect</div>
          <div style={{ fontSize:9.5, color:'#B0998B', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:1 }}>Artisan Coffee</div>
        </div>
      </div>

      <div style={{ display:'flex', gap:2, flex:1, justifyContent:'center', alignItems:'center' }}>
        {[{ label:'Home', path:'/' }, { label:'Menu', path:'/menu' }, { label:'Orders', path:'/orders' }, { label:'Offers', path:'/' }].map(({ label, path }) => {
          const isActive = label === 'Orders';
          return (
            <button key={label} onClick={() => router.push(path)}
              style={{ padding:'8px 15px', borderRadius:10, fontSize:13.5, fontWeight: isActive ? 700 : 500, color: isActive ? '#2B1810' : '#5D4037', background: isActive ? 'rgba(43,24,16,0.07)' : 'transparent', border:'none', cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif', position:'relative' }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background='rgba(93,64,55,0.07)'; (e.currentTarget as HTMLElement).style.color='#2B1810'; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='#5D4037'; } }}
            >
              {label}
              {isActive && <span style={{ position:'absolute', bottom:4, left:'50%', transform:'translateX(-50%)', width:16, height:2, borderRadius:2, background:'#B57A3C', display:'block' }}/>}
            </button>
          );
        })}
      </div>

      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <button style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)', background:'rgba(232,220,203,0.35)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s', flexShrink:0, position:'relative' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.75)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
        >
          <Bell size={16} color="#5D4037"/>
          <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:'#B57A3C', border:'1.5px solid #FAF8F5' }}/>
        </button>

        <div ref={profileRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={() => setProfileOpen(o => !o)} style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)', background: profileOpen ? 'linear-gradient(135deg,#3E2723,#5D4037)' : 'rgba(232,220,203,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13.5, fontWeight:700, color: profileOpen ? '#FAF8F5' : '#3E2723', cursor:'pointer', transition:'all 0.2s' }}
            onMouseEnter={e => { if (!profileOpen) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.75)'; }}
            onMouseLeave={e => { if (!profileOpen) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
          >
            {user?.name?.[0]?.toUpperCase() ?? <User size={16} color={profileOpen ? '#FAF8F5' : '#5D4037'}/>}
          </button>
          {profileOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, background:'#FFFFFF', borderRadius:16, minWidth:220, border:'1px solid rgba(93,64,55,0.12)', boxShadow:'0 16px 48px rgba(43,24,16,0.15)', animation:'fadeIn 0.2s ease', overflow:'hidden', zIndex:200 }}>
              <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(93,64,55,0.08)', background:'rgba(232,220,203,0.25)' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#2B1810' }}>{user?.name || 'Guest'}</div>
                <div style={{ fontSize:12, color:'#9E7B6D', marginTop:2 }}>{user?.email || ''}</div>
              </div>
              {[{ label:'My Orders', path:'/orders', icon:'📦' }, { label:'Saved Addresses', path:'/addresses', icon:'📍' }].map(item => (
                <button key={item.label} onClick={() => { setProfileOpen(false); router.push(item.path); }} style={{ width:'100%', padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'#3E2723', fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                ><span>{item.icon}</span> {item.label}</button>
              ))}
              <div style={{ borderTop:'1px solid rgba(93,64,55,0.08)' }}>
                <button onClick={() => { setProfileOpen(false); logout(); router.push('/login'); }} style={{ width:'100%', padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'#A94442', fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                ><LogOut size={14} color="#A94442"/> Sign out</button>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => router.push('/cart')} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:12, background:'linear-gradient(135deg,#2B1810,#5D4037)', color:'#FAF8F5', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', transition:'all 0.25s', boxShadow:'0 3px 14px rgba(43,24,16,0.28)', flexShrink:0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 22px rgba(43,24,16,0.38)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 3px 14px rgba(43,24,16,0.28)'; }}
        >
          <ShoppingBag size={15}/>
          <span>Bag</span>
          {getItemCount() > 0 && <span style={{ background:'rgba(255,255,255,0.22)', borderRadius:7, padding:'2px 7px', fontSize:11, fontWeight:700 }}>{getItemCount()}</span>}
        </button>
      </div>
    </nav>
  );
}

/* ─── Mini order timeline ────────────────────────────────────────────────── */
function MiniTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') return null;
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:16 }}>
      {TIMELINE_STEPS.map((step, i) => {
        const completed = i <= currentStep;
        const isCurrent = i === currentStep;
        const Icon = step.icon;
        return (
          <div key={step.key} style={{ display:'flex', alignItems:'center', flex: i < TIMELINE_STEPS.length - 1 ? '1' : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
              <div style={{ width:28, height:28, borderRadius:9, background: completed ? (isCurrent ? 'linear-gradient(135deg,#B57A3C,#D4AF37)' : 'linear-gradient(135deg,#2E4A31,#4F7A54)') : 'rgba(93,64,55,0.1)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s', boxShadow: isCurrent ? '0 0 0 3px rgba(181,122,60,0.25)' : 'none' }}>
                <Icon size={13} color={completed ? '#FAF8F5' : 'rgba(93,64,55,0.35)'}/>
              </div>
              <span style={{ fontSize:9, color: completed ? (isCurrent ? '#B57A3C' : '#4F7A54') : '#C4B0A3', fontWeight: isCurrent ? 700 : 400, letterSpacing:'0.02em', whiteSpace:'nowrap' }}>{step.label}</span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div style={{ flex:1, height:2, margin:'0 4px', marginBottom:14, background: i < currentStep ? 'linear-gradient(90deg,#4F7A54,#6DBF7E)' : 'rgba(93,64,55,0.1)', borderRadius:2, transition:'background 0.5s' }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Order Card ─────────────────────────────────────────────────────────── */
function OrderCard({ order, onViewDetails }: { order: Order; onViewDetails: () => void }) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CONFIG[order.status];
  const isActive = !['DELIVERED', 'CANCELLED'].includes(order.status);
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(93,64,55,0.09)',
        overflow:'hidden', transition:'transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.28s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 18px 48px rgba(43,24,16,0.13)' : '0 2px 14px rgba(43,24,16,0.07)',
      }}
    >
      {/* Card header */}
      <div style={{ padding:'20px 22px 18px', borderBottom:'1px solid rgba(93,64,55,0.08)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#B57A3C', marginBottom:4 }}>Order</div>
            <div style={{ fontFamily:'"Playfair Display",serif', fontSize:18, fontWeight:700, color:'#2B1810', letterSpacing:'-0.01em' }}>{order.orderNumber}</div>
          </div>
          {/* Status badge */}
          <span style={{ padding:'5px 12px', borderRadius:20, background:cfg.bg, color:cfg.color, fontSize:11.5, fontWeight:700, letterSpacing:'0.04em', flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
            {isActive && <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block', animation:'pulse 1.5s infinite' }}/>}
            {cfg.label}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, color:'#9E7B6D' }}>
            <Clock size={12}/> {formattedDate}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, color:'#9E7B6D' }}>
            <Package size={12}/> {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </span>
          {order.deliveryAddress && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, color:'#9E7B6D', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              <MapPin size={12}/> {order.deliveryAddress.split(',')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Items preview */}
      <div style={{ padding:'14px 22px', borderBottom:'1px solid rgba(93,64,55,0.08)' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {order.items.slice(0, 3).map(item => (
            <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,rgba(93,64,55,0.12),rgba(181,122,60,0.15))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>☕</div>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#2B1810' }}>{item.menuItem.name}</span>
                  {item.customizations && <span style={{ fontSize:11, color:'#B0998B', marginLeft:6 }}>· {item.customizations}</span>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <span style={{ fontSize:12, color:'#9E7B6D' }}>×{item.quantity}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'#2B1810' }}>₹{item.price * item.quantity}</span>
              </div>
            </div>
          ))}
          {order.items.length > 3 && (
            <div style={{ fontSize:12, color:'#B0998B', marginTop:2 }}>+{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>

      {/* Timeline for active orders */}
      {isActive && (
        <div style={{ padding:'14px 22px', borderBottom:'1px solid rgba(93,64,55,0.08)', background:'rgba(232,220,203,0.12)' }}>
          <MiniTimeline status={order.status}/>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ fontSize:11, color:'#9E7B6D', marginBottom:2, letterSpacing:'0.04em', textTransform:'uppercase', fontWeight:600 }}>Total Paid</div>
          <div style={{ fontFamily:'"Playfair Display",serif', fontSize:20, fontWeight:700, color:'#2B1810' }}>₹{order.totalAmount}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isActive && (
            <button
              onClick={onViewDetails}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, background:'linear-gradient(135deg,#B57A3C,#C9964A)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:700, transition:'all 0.22s', fontFamily:'Inter,sans-serif', boxShadow:'0 3px 12px rgba(181,122,60,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='scale(1.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
            >
              Track <ArrowRight size={12}/>
            </button>
          )}
          <button
            onClick={onViewDetails}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:12, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', color:'#5D4037', cursor:'pointer', fontSize:12.5, fontWeight:600, transition:'all 0.22s', fontFamily:'Inter,sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.9)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
          >
            Details <ChevronRight size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Status filter pill ─────────────────────────────────────────────────── */
function FilterPill({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding:'7px 16px', borderRadius:20, border: active ? 'none' : '1.5px solid rgba(93,64,55,0.18)', background: active ? (color ? `${color}22` : 'linear-gradient(135deg,#3E2723,#5D4037)') : '#FFFFFF', color: active ? (color ?? '#FAF8F5') : '#6D4C41', fontSize:13, fontWeight: active ? 700 : 500, cursor:'pointer', transition:'all 0.22s', flexShrink:0, fontFamily:'Inter,sans-serif', boxShadow: active ? (color ? `0 2px 10px ${color}33` : '0 3px 14px rgba(43,24,16,0.22)') : '0 2px 8px rgba(43,24,16,0.05)' }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.35)'; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 12px rgba(43,24,16,0.1)'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(43,24,16,0.05)'; } }}
    >
      {label}
    </button>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = orders.filter(o =>
    statusFilter === 'all' || o.status === statusFilter
  );

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const pastOrders = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));

  return (
    <div style={{ minHeight:'100vh', background:'#FAF8F5', fontFamily:'Inter,sans-serif', color:'#2B1810' }}>
      <Navbar/>
      <div style={{ height:70 }}/>

      {/* ══ HERO BANNER ══ */}
      <section style={{
        background:'linear-gradient(155deg,#1C0F0A 0%,#2B1810 40%,#3E2723 75%,#4A2C20 100%)',
        padding:'48px clamp(16px,4vw,60px) 44px',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-80, right:-60, width:340, height:340, borderRadius:'50%', background:'rgba(181,122,60,0.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:-30, width:220, height:220, borderRadius:'50%', background:'rgba(181,122,60,0.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:50, right:'8%', fontSize:28, opacity:0.09, animation:'float 7s ease-in-out infinite', pointerEvents:'none' }}>📦</div>

        <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr auto', gap:32, alignItems:'center' }}>
          <div style={{ animation:'fadeInUp 0.6s ease both' }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(181,122,60,0.9)', marginBottom:10 }}>Your History</div>
            <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(28px,4vw,48px)', fontWeight:700, color:'#FAF8F5', lineHeight:1.1, marginBottom:12, letterSpacing:'-0.025em' }}>
              My Orders
            </h1>
            <p style={{ fontSize:14.5, color:'rgba(255,255,255,0.6)', lineHeight:1.7, maxWidth:420 }}>
              Track your active orders, view past deliveries, and reorder your favourites.
            </p>
          </div>

          {/* Stats strip */}
          <div style={{ display:'flex', gap:12, animation:'fadeInUp 0.6s ease 0.1s both' }}>
            {[
              { v: orders.length.toString(), l:'Total Orders', e:'📋' },
              { v: activeOrders.length.toString(), l:'Active', e:'🔥' },
              { v: pastOrders.filter(o => o.status === 'DELIVERED').length.toString(), l:'Delivered', e:'✓' },
            ].map((s, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'14px 18px', textAlign:'center', minWidth:90, backdropFilter:'blur(8px)' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{s.e}</div>
                <div style={{ fontFamily:'"Playfair Display",serif', fontSize:20, fontWeight:700, color:'#FAF8F5', lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.5)', marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth:1180, margin:'0 auto', padding:'32px clamp(16px,4vw,60px) 80px' }}>

        {/* ── Filter + Refresh bar ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2 }}>
            <FilterPill label="All Orders" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}/>
            {activeOrders.length > 0 && <FilterPill label="Active" active={statusFilter === 'PREPARING'} color="#D4AF37" onClick={() => setStatusFilter('PREPARING')}/>}
            <FilterPill label="Delivered" active={statusFilter === 'DELIVERED'} color="#4F7A54" onClick={() => setStatusFilter('DELIVERED')}/>
            <FilterPill label="Cancelled" active={statusFilter === 'CANCELLED'} color="#A94442" onClick={() => setStatusFilter('CANCELLED')}/>
          </div>

          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', color:'#5D4037', cursor: refreshing ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:500, fontFamily:'Inter,sans-serif', transition:'all 0.2s', opacity: refreshing ? 0.6 : 1, flexShrink:0 }}
            onMouseEnter={e => { if (!refreshing) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.85)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
            Refresh
          </button>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <CafeLoader text="Loading your orders…"/>
        ) : filteredOrders.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign:'center', padding:'80px 24px', background:'rgba(232,220,203,0.2)', borderRadius:24, border:'1.5px dashed rgba(93,64,55,0.2)' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📦</div>
            <p style={{ fontFamily:'"Playfair Display",serif', fontSize:22, color:'#5D4037', marginBottom:8, fontWeight:700 }}>
              {statusFilter === 'all' ? 'No orders yet' : `No ${STATUS_CONFIG[statusFilter as OrderStatus]?.label} orders`}
            </p>
            <p style={{ fontSize:14, color:'#9E7B6D', marginBottom:28, lineHeight:1.65 }}>
              {statusFilter === 'all'
                ? 'Your café journey starts with your first order. Browse our artisan menu!'
                : 'No orders match this filter right now.'}
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {statusFilter !== 'all' && (
                <button onClick={() => setStatusFilter('all')}
                  style={{ padding:'12px 24px', borderRadius:12, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.2)', color:'#5D4037', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'Inter,sans-serif' }}
                >
                  View all orders
                </button>
              )}
              <button onClick={() => router.push('/')}
                style={{ padding:'12px 26px', borderRadius:12, background:'linear-gradient(135deg,#2B1810,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'Inter,sans-serif', boxShadow:'0 4px 16px rgba(43,24,16,0.25)', display:'flex', alignItems:'center', gap:8 }}
              >
                Browse Menu <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Active orders section */}
            {statusFilter === 'all' && activeOrders.length > 0 && (
              <>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#B57A3C', marginBottom:6 }}>Live</div>
                  <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:22, fontWeight:700, color:'#2B1810', marginBottom:16, letterSpacing:'-0.02em' }}>
                    Active Orders
                  </h2>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:18 }}>
                    {activeOrders.map(order => (
                      <OrderCard key={order.id} order={order} onViewDetails={() => router.push(`/orders/${order.id}`)}/>
                    ))}
                  </div>
                </div>
                {pastOrders.length > 0 && <div style={{ height:1, background:'rgba(93,64,55,0.1)', margin:'12px 0' }}/>}
              </>
            )}

            {/* Past / all orders */}
            {(statusFilter !== 'all' || pastOrders.length > 0) && (
              <div>
                {statusFilter === 'all' && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#9E7B6D', marginBottom:6 }}>History</div>
                    <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:22, fontWeight:700, color:'#2B1810', marginBottom:16, letterSpacing:'-0.02em' }}>Past Orders</h2>
                  </>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))', gap:18 }}>
                  {(statusFilter === 'all' ? pastOrders : filteredOrders).map(order => (
                    <OrderCard key={order.id} order={order} onViewDetails={() => router.push(`/orders/${order.id}`)}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-12px) rotate(4deg)}66%{transform:translateY(-6px) rotate(-3deg)}}
      `}</style>
    </div>
  );
}
