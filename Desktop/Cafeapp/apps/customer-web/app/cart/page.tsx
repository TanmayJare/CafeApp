'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft, MapPin, Minus, Plus, Trash2, Tag,
  ShoppingBag, Coffee, ChevronRight, Sparkles,
  Clock, Shield, Gift, X, Check, User, LogOut, Bell,
} from 'lucide-react';

/* ─── emoji catalogue: maps item name keywords → emoji ──────────────────── */
const ITEM_EMOJI: Record<string, string> = {
  coffee: '☕', espresso: '☕', latte: '☕', cappuccino: '☕', mocha: '☕',
  tea: '🍵', chai: '🍵', matcha: '🍵',
  cold: '🧋', frappe: '🧋', smoothie: '🥤', juice: '🥤', shake: '🧃',
  pizza: '🍕', sandwich: '🥪', pasta: '🍝', snack: '🍟', fries: '🍟',
  cake: '🍰', dessert: '🍰', brownie: '🍫', cookie: '🍪', pastry: '🥐',
  salad: '🥗', wrap: '🌯', burger: '🍔',
};

function getItemEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(ITEM_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '🍽';
}

/* ─── Gradient for item image placeholder ─────────────────────────────────── */
const ITEM_GRADIENTS = [
  'linear-gradient(160deg,#5D4037,#3E2723)',
  'linear-gradient(160deg,#B57A3C,#7A4F20)',
  'linear-gradient(160deg,#4F6F52,#2E4A31)',
  'linear-gradient(160deg,#8A7560,#5C4A32)',
  'linear-gradient(160deg,#C9964A,#8B5E28)',
  'linear-gradient(160deg,#A0522D,#6B3A1F)',
];
function getGradient(index: number) {
  return ITEM_GRADIENTS[index % ITEM_GRADIENTS.length];
}

/* ─── Shared loader ───────────────────────────────────────────────────────── */
function CafeLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 20px' }}>
          <div style={{ width: 56, height: 56, border: '2.5px solid #E8DCCB', borderTopColor: '#3E2723', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Coffee size={20} color="#B57A3C" />
          </div>
        </div>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, color: '#5D4037', fontWeight: 600 }}>Your bag is loading…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Navbar ──────────────────────────────────────────────────────────────── */
function Navbar() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { getItemCount } = useCartStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(93,64,55,0.1)',
      padding: '0 clamp(16px,4vw,48px)', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 2px 16px rgba(43,24,16,0.06)',
    }}>
      {/* Left – back button */}
      <button
        onClick={() => router.push('/menu')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(232,220,203,0.5)', border: '1px solid rgba(93,64,55,0.18)', borderRadius: 12, padding: '8px 16px', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: '#5D4037', transition: 'all 0.2s', fontFamily: 'Inter,sans-serif' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.85)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.5)'; }}
      >
        <ArrowLeft size={15} /> Continue shopping
      </button>

      {/* Center – logo */}
      <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#2B1810,#5D4037)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Coffee size={16} color="#D7C5AE" />
        </div>
        <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#2B1810' }}>CaféConnect</span>
      </button>

      {/* Right – icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(232,220,203,0.5)', border: '1px solid rgba(93,64,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6D4C41', position: 'relative' }}>
          <Bell size={16} />
        </button>

        {/* Cart indicator */}
        <button
          onClick={() => router.push('/cart')}
          style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#3E2723,#5D4037)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FAF8F5', position: 'relative' }}
        >
          <ShoppingBag size={16} />
          {getItemCount() > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#B57A3C', color: '#FAF8F5', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FAF8F5' }}>
              {getItemCount()}
            </span>
          )}
        </button>

        {/* Profile */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => isAuthenticated() ? setProfileOpen(p => !p) : router.push('/login')}
            style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(232,220,203,0.5)', border: '1px solid rgba(93,64,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6D4C41' }}
          >
            <User size={16} />
          </button>
          {profileOpen && (
            <div style={{ position: 'absolute', top: 46, right: 0, width: 200, background: '#FFFFFF', borderRadius: 16, border: '1px solid rgba(93,64,55,0.1)', boxShadow: '0 16px 40px rgba(43,24,16,0.14)', padding: '8px', zIndex: 200, animation: 'fadeInUp 0.2s ease both' }}>
              {user && (
                <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid rgba(93,64,55,0.08)', marginBottom: 6 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#2B1810' }}>{user.name ?? user.email}</p>
                  <p style={{ fontSize: 11.5, color: '#9E7B6D' }}>{user.email}</p>
                </div>
              )}
              {[{ label: 'My Orders', path: '/orders' }, { label: 'Addresses', path: '/addresses/new' }].map(item => (
                <button key={item.path} onClick={() => { router.push(item.path); setProfileOpen(false); }} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13.5, color: '#2B1810', fontFamily: 'Inter,sans-serif', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.5)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                  {item.label}
                </button>
              ))}
              <button onClick={() => { logout(); setProfileOpen(false); router.push('/login'); }} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13.5, color: '#A94442', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter,sans-serif', marginTop: 4, transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(169,68,66,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Cart Item Card ──────────────────────────────────────────────────────── */
function CartItemCard({ item, index, onUpdate, onRemove }: {
  item: { id: string; menuItemId: string; name: string; price: number; quantity: number; customizations?: string };
  index: number;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(item.id), 280);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid rgba(93,64,55,0.08)',
        padding: '20px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        boxShadow: hovered ? '0 12px 32px rgba(43,24,16,0.1)' : '0 2px 12px rgba(43,24,16,0.05)',
        transform: removing ? 'translateX(-110%)' : hovered ? 'translateY(-3px)' : 'none',
        opacity: removing ? 0 : 1,
        transition: 'all 0.28s cubic-bezier(.34,1.56,.64,1)',
        animation: 'fadeInUp 0.35s ease both',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Image placeholder */}
      <div style={{
        width: 80, height: 80, borderRadius: 16, flexShrink: 0,
        background: getGradient(index),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, position: 'relative', overflow: 'hidden',
      }}>
        <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{getItemEmoji(item.name)}</span>
        {/* subtle sheen */}
        <div style={{ position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)', animation: 'shimmer 2.5s infinite' }} />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15.5, fontWeight: 700, color: '#2B1810', lineHeight: 1.3 }}>
            {item.name}
          </h3>
          <button
            onClick={handleRemove}
            title="Remove item"
            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(169,68,66,0.08)', border: '1px solid rgba(169,68,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A94442', flexShrink: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(169,68,66,0.16)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(169,68,66,0.08)'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {item.customizations && (
          <p style={{ fontSize: 12, color: '#9E7B6D', marginBottom: 6, lineHeight: 1.4 }}>
            ✦ {item.customizations}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Clock size={11} color="#B0998B" />
          <span style={{ fontSize: 11.5, color: '#B0998B' }}>~15 min prep</span>
        </div>

        {/* Price + Quantity row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Quantity selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(232,220,203,0.4)', borderRadius: 12, border: '1px solid rgba(93,64,55,0.15)', overflow: 'hidden' }}>
            <button
              onClick={() => onUpdate(item.id, item.quantity - 1)}
              style={{ width: 34, height: 34, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5D4037', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(93,64,55,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <Minus size={13} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2B1810', minWidth: 28, textAlign: 'center', lineHeight: '34px' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdate(item.id, item.quantity + 1)}
              style={{ width: 34, height: 34, background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5D4037', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(93,64,55,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Prices */}
          <div style={{ textAlign: 'right' }}>
            {item.quantity > 1 && (
              <p style={{ fontSize: 11, color: '#B0998B', marginBottom: 1 }}>₹{item.price} each</p>
            )}
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#2B1810' }}>
              ₹{(item.price * item.quantity).toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Order Summary Card ──────────────────────────────────────────────────── */
function OrderSummaryCard({ bill, itemCount, onCheckout }: {
  bill: { subtotal: number; deliveryFee: number; platformFee: number; gst: number; total: number };
  itemCount: number;
  onCheckout: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rows = [
    { label: 'Subtotal', value: `₹${bill.subtotal.toFixed(0)}`, special: false },
    { label: 'Delivery fee', value: bill.deliveryFee === 0 ? 'Free 🎉' : `₹${bill.deliveryFee}`, special: bill.deliveryFee === 0 },
    { label: 'Platform fee', value: `₹${bill.platformFee}`, special: false },
    { label: 'GST (5%)', value: `₹${bill.gst.toFixed(0)}`, special: false },
  ];

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid rgba(93,64,55,0.1)', boxShadow: '0 4px 28px rgba(43,24,16,0.08)', overflow: 'hidden', position: 'sticky', top: 84 }}>

      {/* Header band */}
      <div style={{ background: 'linear-gradient(135deg,#2B1810,#5D4037)', padding: '20px 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#FAF8F5' }}>Order Summary</p>
            <p style={{ fontSize: 12, color: '#D7C5AE', marginTop: 2 }}>{itemCount} item{itemCount !== 1 ? 's' : ''} in your bag</p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={20} color="#D7C5AE" />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px 24px' }}>
        {/* Line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 16 }}>
          {rows.map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13.5, color: '#9E7B6D' }}>{row.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: row.special ? '#4F7A54' : '#2B1810' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1.5px dashed rgba(93,64,55,0.14)', margin: '16px 0' }} />

        {/* Grand total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#2B1810' }}>Grand Total</span>
          <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, fontWeight: 700, color: '#2B1810' }}>₹{bill.total.toFixed(0)}</span>
        </div>

        {/* Savings badge */}
        {bill.deliveryFee === 0 && (
          <div style={{ background: 'rgba(79,122,84,0.08)', border: '1px solid rgba(79,122,84,0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Gift size={14} color="#4F7A54" />
            <span style={{ fontSize: 12.5, color: '#4F7A54', fontWeight: 600 }}>You're getting free delivery on this order!</span>
          </div>
        )}

        {/* Proceed button */}
        <button
          onClick={onCheckout}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', padding: '16px 24px', borderRadius: 16,
            background: hovered ? 'linear-gradient(135deg,#5D4037,#3E2723)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
            color: '#FAF8F5', fontSize: 15, fontWeight: 700, border: 'none',
            cursor: 'pointer', fontFamily: '"Playfair Display",serif',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: hovered ? '0 12px 32px rgba(43,24,16,0.4)' : '0 6px 24px rgba(43,24,16,0.28)',
            transform: hovered ? 'translateY(-2px)' : 'none',
            transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} />
            <span>Proceed to Checkout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>₹{bill.total.toFixed(0)}</span>
            <ChevronRight size={16} />
          </div>
        </button>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: '#B0998B', marginTop: 10, lineHeight: 1.4 }}>
          🔒 Secure & encrypted checkout
        </p>
      </div>
    </div>
  );
}

/* ─── Coupon Section ─────────────────────────────────────────────────────── */
function CouponSection() {
  const [couponCode, setCouponCode] = useState('');
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleApply = () => {
    if (!couponCode.trim()) { setError('Please enter a coupon code'); return; }
    // Placeholder: coupon API not yet integrated
    setError('This coupon code is not valid. Try again.');
  };

  const handleRemove = () => {
    setApplied(false);
    setCouponCode('');
    setError('');
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 20, border: applied ? '1.5px solid rgba(79,122,84,0.3)' : '1.5px dashed rgba(93,64,55,0.22)', padding: '18px 20px', transition: 'border-color 0.25s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: applied ? 12 : 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: applied ? 'rgba(79,122,84,0.1)' : 'rgba(181,122,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Tag size={16} color={applied ? '#4F7A54' : '#B57A3C'} />
        </div>
        <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: '#2B1810' }}>
          {applied ? 'Coupon Applied!' : 'Promo Code'}
        </span>
      </div>

      {applied ? (
        <div style={{ background: 'rgba(79,122,84,0.07)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={14} color="#4F7A54" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4F7A54', letterSpacing: '0.05em' }}>{couponCode.toUpperCase()}</span>
          </div>
          <button onClick={handleRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A94442', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontFamily: 'Inter,sans-serif' }}>
            <X size={12} /> Remove
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              placeholder="Enter code (e.g. CAFE20)"
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setError(''); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1, padding: '11px 14px', borderRadius: 12, fontFamily: 'Inter,sans-serif',
                border: focused ? '1.5px solid rgba(181,122,60,0.6)' : '1.5px solid rgba(93,64,55,0.18)',
                background: focused ? 'rgba(232,220,203,0.18)' : 'rgba(250,248,245,0.8)',
                fontSize: 13.5, color: '#2B1810', outline: 'none', letterSpacing: '0.04em',
                boxShadow: focused ? '0 0 0 3px rgba(181,122,60,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            />
            <button
              onClick={handleApply}
              style={{ padding: '11px 18px', borderRadius: 12, background: couponCode ? 'linear-gradient(135deg,#B57A3C,#C9964A)' : 'rgba(93,64,55,0.12)', border: 'none', color: couponCode ? '#FAF8F5' : '#B0998B', fontSize: 13.5, fontWeight: 700, cursor: couponCode ? 'pointer' : 'default', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              Apply
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 12, color: '#A94442', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={11} /> {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Delivery Address Preview ───────────────────────────────────────────── */
function DeliveryPreview({ onEdit }: { onEdit: () => void }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.09)', padding: '18px 20px', boxShadow: '0 2px 12px rgba(43,24,16,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={15} color="#B57A3C" />
          <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: '#2B1810' }}>Deliver to</span>
        </div>
        <button
          onClick={onEdit}
          style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(181,122,60,0.1)', border: '1px solid rgba(181,122,60,0.25)', color: '#B57A3C', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(181,122,60,0.2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(181,122,60,0.1)'; }}
        >
          Change
        </button>
      </div>
      <div style={{ background: 'rgba(232,220,203,0.3)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F7A54', marginTop: 5, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#2B1810' }}>Address selected at checkout</p>
          <p style={{ fontSize: 12, color: '#9E7B6D', marginTop: 3, lineHeight: 1.4 }}>
            Your saved delivery address will be confirmed on the checkout page.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Clock size={13} color="#B57A3C" />
        <span style={{ fontSize: 12.5, color: '#6D4C41', fontWeight: 500 }}>Estimated delivery: 25–35 minutes</span>
      </div>
    </div>
  );
}

/* ─── Payment Gateway Placeholder ────────────────────────────────────────── */
function PaymentPlaceholder() {
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(43,24,16,0.03),rgba(232,220,203,0.3))', borderRadius: 20, border: '1.5px dashed rgba(93,64,55,0.22)', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Sparkles size={16} color="#B57A3C" />
        <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: '#2B1810' }}>Payment Gateway Integration Area</span>
      </div>
      <p style={{ fontSize: 12.5, color: '#9E7B6D', lineHeight: 1.55, marginBottom: 14 }}>
        This section is reserved for your payment gateway. Razorpay, Stripe, PayPal, or any other supported provider will be connected here during integration.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Razorpay', 'Stripe', 'PayPal', 'UPI', 'COD'].map(p => (
          <span key={p} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(93,64,55,0.08)', border: '1px solid rgba(93,64,55,0.14)', fontSize: 11.5, color: '#6D4C41', fontWeight: 600 }}>{p}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty Cart ─────────────────────────────────────────────────────────── */
function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', fontFamily: 'Inter,sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: 'clamp(48px,8vw,96px) clamp(20px,4vw,40px)', textAlign: 'center' }}>

        {/* Illustration */}
        <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 36px' }}>
          {/* Outer ring */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(232,220,203,0.6),rgba(215,197,174,0.4))', border: '1px solid rgba(93,64,55,0.12)' }} />
          {/* Inner glow */}
          <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(181,122,60,0.12),rgba(201,150,74,0.08))' }} />
          {/* Icon */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
            ☕
          </div>
          {/* Floating beans */}
          {[{ top: '8%', left: '10%', delay: '0s' }, { top: '6%', right: '12%', delay: '1.2s' }, { bottom: '10%', left: '14%', delay: '0.6s' }].map((pos, i) => (
            <span key={i} style={{ position: 'absolute', fontSize: 14, animation: 'float 4s ease-in-out infinite', animationDelay: pos.delay, ...pos }}>🫘</span>
          ))}
        </div>

        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 'clamp(24px,4vw,32px)', fontWeight: 700, color: '#2B1810', marginBottom: 12, letterSpacing: '-0.02em' }}>
          Your cart is waiting for something delicious.
        </h2>
        <p style={{ fontSize: 15, color: '#9E7B6D', lineHeight: 1.65, marginBottom: 36, maxWidth: 360, margin: '0 auto 36px' }}>
          Add your favourite coffee, artisan snacks, and gourmet treats to get started on your perfect order.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onBrowse}
            style={{ padding: '14px 32px', borderRadius: 16, background: 'linear-gradient(135deg,#2B1810,#5D4037)', color: '#FAF8F5', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: '"Playfair Display",serif', boxShadow: '0 6px 24px rgba(43,24,16,0.28)', transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(43,24,16,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(43,24,16,0.28)'; }}
          >
            <Coffee size={16} /> Browse Menu
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ padding: '14px 28px', borderRadius: 16, background: 'rgba(232,220,203,0.5)', border: '1.5px solid rgba(93,64,55,0.2)', color: '#5D4037', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.85)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.5)'; }}
          >
            Go Back
          </button>
        </div>

        {/* Quick picks strip */}
        <div style={{ marginTop: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B57A3C', marginBottom: 16 }}>Popular picks to add</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Espresso', 'Cold Coffee', 'Croissant', 'Brownie', 'Pasta'].map(tag => (
              <button
                key={tag}
                onClick={onBrowse}
                style={{ padding: '7px 16px', borderRadius: 20, background: '#FFFFFF', border: '1px solid rgba(93,64,55,0.14)', fontSize: 12.5, color: '#5D4037', cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(43,24,16,0.05)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.6)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(93,64,55,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(93,64,55,0.14)'; }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, updateQuantity, removeItem, getTotal, getItemCount } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, []);

  // Avoid SSR/hydration mismatch for cart state
  if (!mounted) return <CafeLoader />;

  // ── Redirect to login ─────────────────────────────────────────────────
  if (!isAuthenticated()) return <CafeLoader />;

  // ── Billing calculation (identical to original logic) ─────────────────
  const subtotal = getTotal();
  const deliveryFee = 0;
  const platformFee = 5;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + platformFee + gst;
  const bill = { subtotal, deliveryFee, platformFee, gst, total };
  const itemCount = getItemCount();

  // ── Empty state ───────────────────────────────────────────────────────
  if (items.length === 0) {
    return <EmptyCart onBrowse={() => router.push('/menu')} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', fontFamily: 'Inter,sans-serif', color: '#2B1810' }}>
      <Navbar />

      {/* ── Page Header ── */}
      <div style={{ background: 'linear-gradient(135deg,rgba(62,39,35,0.04),rgba(232,220,203,0.35))', borderBottom: '1px solid rgba(93,64,55,0.08)', padding: 'clamp(20px,3vw,32px) clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B57A3C', marginBottom: 6 }}>Your Bag</p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, color: '#2B1810', letterSpacing: '-0.02em' }}>
              {itemCount} Item{itemCount !== 1 ? 's' : ''} in Your Cart
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#B57A3C" />
                <span style={{ fontSize: 13, color: '#6D4C41', fontWeight: 500 }}>~25–35 min delivery</span>
              </div>
              <div style={{ width: 1, height: 16, background: 'rgba(93,64,55,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gift size={14} color="#4F7A54" />
                <span style={{ fontSize: 13, color: '#4F7A54', fontWeight: 600 }}>Free delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: 'clamp(24px,4vw,40px) clamp(20px,6vw,80px) 120px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 360px',
        gap: 28,
      }}>

        {/* ─── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Cart Items */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#2B1810' }}>
                Current Order
              </h2>
              <span style={{ fontSize: 12.5, color: '#9E7B6D' }}>{itemCount} item{itemCount !== 1 ? 's' : ''} · ₹{subtotal.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((item, idx) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  onUpdate={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </section>

          {/* Promo Code */}
          <section>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#2B1810', marginBottom: 14 }}>Offers & Discounts</h2>
            <CouponSection />
          </section>

          {/* Delivery Address Preview */}
          <section>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#2B1810', marginBottom: 14 }}>Delivery Details</h2>
            <DeliveryPreview onEdit={() => router.push('/checkout')} />
          </section>

          {/* Payment area */}
          <section>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#2B1810', marginBottom: 14 }}>Payment</h2>
            <PaymentPlaceholder />
          </section>

          {/* Order notes */}
          <section>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#2B1810', marginBottom: 14 }}>Special Instructions</h2>
            <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.09)', overflow: 'hidden' }}>
              <textarea
                placeholder="Any special instructions? (e.g. Less sugar, extra cheese, no onions…)"
                rows={3}
                style={{
                  width: '100%', padding: '16px 18px', border: 'none', outline: 'none',
                  background: 'transparent', fontFamily: 'Inter,sans-serif',
                  fontSize: 13.5, color: '#2B1810', lineHeight: 1.6, resize: 'none',
                }}
              />
              <div style={{ padding: '10px 18px 12px', borderTop: '1px solid rgba(93,64,55,0.07)', background: 'rgba(250,248,245,0.6)', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11.5, color: '#B0998B' }}>Optional · Not linked to order API yet</span>
              </div>
            </div>
          </section>

          {/* Desktop continue shopping */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/menu')}
              style={{ padding: '12px 24px', borderRadius: 14, background: 'rgba(232,220,203,0.5)', border: '1.5px solid rgba(93,64,55,0.18)', color: '#5D4037', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.85)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,220,203,0.5)'; }}
            >
              <ArrowLeft size={14} /> Continue Shopping
            </button>
          </div>
        </div>

        {/* ─── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div>
          <OrderSummaryCard
            bill={bill}
            itemCount={itemCount}
            onCheckout={() => router.push('/checkout')}
          />
        </div>
      </div>

      {/* ── Mobile sticky footer bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(250,248,245,0.96)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(93,64,55,0.1)',
        padding: '12px 20px 16px',
        boxShadow: '0 -4px 24px rgba(43,24,16,0.1)',
        display: 'none', // hidden on desktop via the responsive override below
      }} className="mobile-cart-bar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 11, color: '#9E7B6D', marginBottom: 1 }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: '#2B1810' }}>₹{total.toFixed(0)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#4F7A54', fontWeight: 600 }}>Free delivery</p>
            <p style={{ fontSize: 11, color: '#9E7B6D' }}>incl. ₹5 platform fee + 5% GST</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/checkout')}
          style={{ width: '100%', padding: '15px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#2B1810,#5D4037)', color: '#FAF8F5', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: '"Playfair Display",serif', boxShadow: '0 6px 20px rgba(43,24,16,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Shield size={15} /> Proceed to Checkout · ₹{total.toFixed(0)}
        </button>
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%       { transform: translateY(-10px) rotate(6deg); }
        }

        /* Show mobile bar only on mobile */
        @media (max-width: 768px) {
          .mobile-cart-bar { display: block !important; }
        }

        /* Responsive 2-col → 1-col */
        @media (max-width: 860px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }

        /* Tighten up spacing on mobile */
        @media (max-width: 480px) {
          h1 { font-size: 22px !important; }
        }
      `}</style>
    </div>
  );
}

// Made with Bob
