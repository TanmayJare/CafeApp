'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import { ArrowLeft, Minus, Plus, Star, Clock, Leaf, ShoppingBag, Heart, Check, Coffee } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { id: string; name: string };
}

const sizeOptions = [
  { id: 'regular', label: 'Regular', price: 0 },
  { id: 'large',   label: 'Large',   price: 40 },
];

const addonOptions = [
  { id: 'extra-shot', label: 'Extra Shot',  price: 40 },
  { id: 'oat-milk',   label: 'Oat Milk',    price: 30 },
  { id: 'sugar-free', label: 'Sugar-Free',  price: 0  },
];

const CATEGORY_META: Record<string, { emoji: string; gradient: string }> = {
  Coffee:        { emoji: '☕', gradient: 'linear-gradient(160deg,#5D4037,#3E2723)' },
  'Cold Drinks': { emoji: '🧋', gradient: 'linear-gradient(160deg,#4F6F52,#2E4A31)' },
  Pizza:         { emoji: '🍕', gradient: 'linear-gradient(160deg,#B57A3C,#7A4F20)' },
  Sandwich:      { emoji: '🥪', gradient: 'linear-gradient(160deg,#8A7560,#5C4A32)' },
  Desserts:      { emoji: '🍰', gradient: 'linear-gradient(160deg,#A0522D,#6B3A1F)' },
  Snacks:        { emoji: '🍟', gradient: 'linear-gradient(160deg,#C9964A,#8B5E28)' },
  default:       { emoji: '🍽', gradient: 'linear-gradient(160deg,#6D4C41,#3E2723)' },
};

export default function MenuItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<'regular' | 'large'>('regular');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchItem();
  }, [params.id]);

  const fetchItem = async () => {
    try {
      const response = await api.get(`/menu/items/${params.id}`);
      setItem(response.data);
    } catch (e) {
      console.error('Failed to fetch item:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const calculateTotal = () => {
    if (!item) return 0;
    const sizePrice = sizeOptions.find(s => s.id === selectedSize)?.price ?? 0;
    const addonTotal = selectedAddons.reduce((sum, id) => sum + (addonOptions.find(a => a.id === id)?.price ?? 0), 0);
    return (item.price + sizePrice + addonTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!item) return;
    const customizations: string[] = [];
    if (selectedSize === 'large') customizations.push('Large');
    selectedAddons.forEach(id => {
      const addon = addonOptions.find(a => a.id === id);
      if (addon) customizations.push(addon.label);
    });
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: calculateTotal() / quantity,
      quantity,
      customizations: customizations.join(', '),
    });
    setAdded(true);
    setTimeout(() => router.push('/cart'), 600);
  };

  const catMeta = item ? (CATEGORY_META[item.category.name] ?? CATEGORY_META.default) : CATEGORY_META.default;

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ position:'relative', width:56, height:56, margin:'0 auto 20px' }}>
            <div style={{ width:56, height:56, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Coffee size={20} color="#B57A3C" /></div>
          </div>
          <p style={{ fontFamily:'"Playfair Display",serif', fontSize:16, color:'#5D4037', fontWeight:600 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5', flexDirection:'column', gap:16 }}>
        <span style={{ fontSize:56 }}>☕</span>
        <p style={{ fontFamily:'"Playfair Display",serif', fontSize:22, color:'#5D4037' }}>Item not found</p>
        <button onClick={() => router.push('/')} style={{ padding:'12px 28px', borderRadius:14, background:'linear-gradient(135deg,#3E2723,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'Inter,sans-serif' }}>
          Back to Menu
        </button>
      </div>
    );
  }

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
          onClick={() => router.back()}
          style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', borderRadius:12, padding:'8px 16px', cursor:'pointer', fontSize:13.5, fontWeight:500, color:'#5D4037', transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
        >
          <ArrowLeft size={15}/> Back
        </button>

        <span style={{ fontFamily:'"Playfair Display",serif', fontSize:17, fontWeight:700, color:'#2B1810', letterSpacing:'0.01em' }}>
          {item.category.name}
        </span>

        <button
          onClick={() => setLiked(l => !l)}
          style={{
            width:40, height:40, borderRadius:12,
            background: liked ? 'rgba(169,68,66,0.12)' : 'rgba(232,220,203,0.5)',
            border:`1px solid ${liked ? 'rgba(169,68,66,0.35)' : 'rgba(93,64,55,0.18)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            transform: liked ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <Heart size={16} color={liked ? '#A94442' : '#9E7B6D'} fill={liked ? '#A94442' : 'none'} />
        </button>
      </header>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'40px clamp(16px,4vw,40px) 140px' }}>

        {/* ── Hero image ── */}
        <div style={{
          height:320, borderRadius:24, overflow:'hidden',
          background:catMeta.gradient,
          display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:36, position:'relative',
          boxShadow:'0 12px 40px rgba(43,24,16,0.18)',
        }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ textAlign:'center' }}>
              <span style={{ fontSize:96, filter:'drop-shadow(0 10px 20px rgba(0,0,0,0.4))', display:'block' }}>{catMeta.emoji}</span>
            </div>
          )}

          {/* Subtle gradient */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:80, background:'linear-gradient(transparent, rgba(0,0,0,0.3))', pointerEvents:'none' }}/>

          {!item.isAvailable && (
            <div style={{ position:'absolute', inset:0, background:'rgba(43,24,16,0.58)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:'"Playfair Display",serif', fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.92)', letterSpacing:'0.1em' }}>
                CURRENTLY UNAVAILABLE
              </span>
            </div>
          )}
        </div>

        {/* ── Item details ── */}
        <div style={{ marginBottom:32 }}>
          <div style={{ marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#B57A3C', letterSpacing:'0.1em', textTransform:'uppercase' }}>{item.category.name}</span>
          </div>

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:12 }}>
            <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(26px,4vw,34px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.025em', lineHeight:1.15, flex:1 }}>
              {item.name}
            </h1>
            <div style={{ fontFamily:'"Playfair Display",serif', fontSize:28, fontWeight:700, color:'#2B1810', flexShrink:0 }}>
              ₹{item.price}
            </div>
          </div>

          {/* Meta */}
          <div style={{ display:'flex', gap:20, marginBottom:16, flexWrap:'wrap' }}>
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#9E7B6D' }}>
              <Star size={13} fill="#D4AF37" color="#D4AF37"/> 4.8 (120+ reviews)
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#9E7B6D' }}>
              <Clock size={13}/> 15–20 min
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#4F7A54' }}>
              <Leaf size={13} color="#4F7A54"/> Fresh ingredients
            </span>
          </div>

          {item.description && (
            <p style={{ fontSize:14.5, color:'#6D4C41', lineHeight:1.8, maxWidth:540, padding:'14px 18px', background:'rgba(232,220,203,0.25)', borderRadius:14, border:'1px solid rgba(93,64,55,0.08)' }}>
              {item.description}
            </p>
          )}
        </div>

        <div style={{ width:'100%', height:1, background:'rgba(93,64,55,0.08)', marginBottom:32 }}/>

        {/* ── Size Selection ── */}
        <div style={{ marginBottom:32 }}>
          <h3 style={{ fontSize:11.5, fontWeight:700, color:'#5D4037', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>
            Choose Size
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {sizeOptions.map(size => {
              const active = selectedSize === size.id;
              return (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id as 'regular' | 'large')}
                  style={{
                    padding:'16px 20px', borderRadius:16, cursor:'pointer',
                    background: active ? 'linear-gradient(135deg,#2B1810,#5D4037)' : '#FFFFFF',
                    border: active ? 'none' : '1.5px solid rgba(93,64,55,0.18)',
                    color: active ? '#FAF8F5' : '#5D4037',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
                    boxShadow: active ? '0 6px 20px rgba(43,24,16,0.28)' : '0 2px 8px rgba(43,24,16,0.05)',
                    transform: active ? 'scale(1.02)' : 'scale(1)',
                    fontFamily:'Inter,sans-serif',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 14px rgba(43,24,16,0.1)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(43,24,16,0.05)'; } }}
                >
                  <span style={{ fontWeight:600, fontSize:14 }}>{size.label}</span>
                  <span style={{ fontSize:13, opacity:0.8, fontFamily:'"Playfair Display",serif', fontWeight:600 }}>₹{item.price + size.price}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Add-ons ── */}
        <div style={{ marginBottom:32 }}>
          <h3 style={{ fontSize:11.5, fontWeight:700, color:'#5D4037', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>
            Add-Ons
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {addonOptions.map(addon => {
              const active = selectedAddons.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  style={{
                    padding:'14px 18px', borderRadius:14, cursor:'pointer',
                    background: active ? 'rgba(62,39,35,0.05)' : '#FFFFFF',
                    border: active ? '1.5px solid rgba(93,64,55,0.5)' : '1.5px solid rgba(93,64,55,0.14)',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    transition:'all 0.2s', boxShadow:'0 2px 8px rgba(43,24,16,0.05)',
                    fontFamily:'Inter,sans-serif',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.35)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.14)'; }}
                >
                  <span style={{ fontSize:14, fontWeight:500, color:'#3E2723', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:22, height:22, borderRadius:7, background: active ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(93,64,55,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
                      {active && <Check size={12} color="#FAF8F5" />}
                    </span>
                    {addon.label}
                  </span>
                  <span style={{ fontSize:13, color: addon.price > 0 ? '#B57A3C' : '#4F7A54', fontWeight:600 }}>
                    {addon.price > 0 ? `+₹${addon.price}` : 'Free'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Quantity ── */}
        <div style={{ marginBottom:32 }}>
          <h3 style={{ fontSize:11.5, fontWeight:700, color:'#5D4037', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16 }}>
            Quantity
          </h3>
          <div style={{ display:'inline-flex', alignItems:'center', background:'#FFFFFF', border:'1.5px solid rgba(93,64,55,0.15)', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(43,24,16,0.07)' }}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              style={{ width:52, height:52, background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: quantity <= 1 ? 'not-allowed' : 'pointer', opacity: quantity <= 1 ? 0.35 : 1, transition:'all 0.15s' }}
              onMouseEnter={e => { if (quantity > 1) (e.currentTarget as HTMLElement).style.background='rgba(93,64,55,0.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
            >
              <Minus size={16} color="#5D4037" />
            </button>
            <span style={{ width:56, textAlign:'center', fontFamily:'"Playfair Display",serif', fontSize:22, fontWeight:700, color:'#2B1810', borderLeft:'1px solid rgba(93,64,55,0.1)', borderRight:'1px solid rgba(93,64,55,0.1)' }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{ width:52, height:52, background:'transparent', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(93,64,55,0.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
            >
              <Plus size={16} color="#5D4037" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Sticky Add to Cart ── */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:50,
        background:'rgba(250,248,245,0.95)', backdropFilter:'blur(24px)',
        borderTop:'1px solid rgba(93,64,55,0.1)',
        padding:'16px clamp(16px,4vw,40px) 24px',
        boxShadow:'0 -4px 24px rgba(43,24,16,0.08)',
      }}>
        <div style={{ maxWidth:760, margin:'0 auto', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10.5, color:'#9E7B6D', letterSpacing:'0.06em', marginBottom:2, textTransform:'uppercase', fontWeight:600 }}>Total</div>
            <div style={{ fontFamily:'"Playfair Display",serif', fontSize:26, fontWeight:700, color:'#2B1810' }}>₹{calculateTotal()}</div>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!item.isAvailable || added}
            style={{
              flex:2, padding:'16px 24px', borderRadius:16,
              background: !item.isAvailable ? 'rgba(93,64,55,0.25)' : added ? 'linear-gradient(135deg,#2E4A31,#4F7A54)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
              color:'#FAF8F5', fontSize:15, fontWeight:600, border:'none',
              cursor: item.isAvailable && !added ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all 0.3s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: item.isAvailable ? '0 6px 24px rgba(43,24,16,0.3)' : 'none',
              fontFamily:'Inter,sans-serif',
            }}
            onMouseEnter={e => { if (item.isAvailable && !added) { (e.currentTarget as HTMLElement).style.transform='scale(1.02)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
          >
            {!item.isAvailable ? 'Currently Unavailable' : added ? <><Check size={16}/> Added to bag!</> : <><ShoppingBag size={16}/> Add to bag · ₹{calculateTotal()}</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
