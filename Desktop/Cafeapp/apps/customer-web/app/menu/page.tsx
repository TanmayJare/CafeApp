'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import {
  Search, ShoppingBag, Heart, Star, Clock, Leaf,
  ChevronRight, Coffee, Filter, X, ArrowRight, Mic, Flame,
  SlidersHorizontal, Tag, User, Bell, LogOut,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

/* ─── Design system data ─────────────────────────────────────────────────── */
const CATEGORY_META: Record<string, { emoji: string; gradient: string; accent: string }> = {
  Coffee:        { emoji: '☕', gradient: 'linear-gradient(160deg,#5D4037,#3E2723)', accent: '#5D4037' },
  'Cold Drinks': { emoji: '🧋', gradient: 'linear-gradient(160deg,#4F6F52,#2E4A31)', accent: '#4F6F52' },
  Pizza:         { emoji: '🍕', gradient: 'linear-gradient(160deg,#B57A3C,#7A4F20)', accent: '#B57A3C' },
  Sandwich:      { emoji: '🥪', gradient: 'linear-gradient(160deg,#8A7560,#5C4A32)', accent: '#8A7560' },
  Desserts:      { emoji: '🍰', gradient: 'linear-gradient(160deg,#A0522D,#6B3A1F)', accent: '#A0522D' },
  Pasta:         { emoji: '🍝', gradient: 'linear-gradient(160deg,#7A6048,#4A3828)', accent: '#7A6048' },
  Snacks:        { emoji: '🍟', gradient: 'linear-gradient(160deg,#C9964A,#8B5E28)', accent: '#C9964A' },
  Healthy:       { emoji: '🥗', gradient: 'linear-gradient(160deg,#4F6F52,#3B5230)', accent: '#4F6F52' },
  Tea:           { emoji: '🍵', gradient: 'linear-gradient(160deg,#8A9A5B,#5A6A3A)', accent: '#8A9A5B' },
  default:       { emoji: '🍽', gradient: 'linear-gradient(160deg,#6D4C41,#3E2723)', accent: '#6D4C41' },
};

const SORT_OPTIONS = [
  { value: 'default', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name A–Z' },
];

/* ─── Shared spinner loader ──────────────────────────────────────────────── */
function CafeLoader({ text = 'Loading menu…' }: { text?: string }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ position:'relative', width:56, height:56, margin:'0 auto 20px' }}>
          <div style={{ width:56, height:56, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Coffee size={20} color="#B57A3C"/>
          </div>
        </div>
        <p style={{ fontFamily:'"Playfair Display",serif', fontSize:16, color:'#5D4037', fontWeight:600 }}>{text}</p>
        <p style={{ fontSize:12, color:'#B0998B', marginTop:4 }}>Crafted with care</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Shared Navbar ──────────────────────────────────────────────────────── */
function Navbar({ activePage }: { activePage: string }) {
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
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100, height:70,
      background: scrolled ? 'rgba(250,248,245,0.94)' : 'rgba(250,248,245,0.75)',
      backdropFilter:'blur(24px) saturate(1.6)',
      WebkitBackdropFilter:'blur(24px) saturate(1.6)',
      borderBottom: scrolled ? '1px solid rgba(93,64,55,0.12)' : '1px solid transparent',
      display:'flex', alignItems:'center',
      padding:'0 clamp(16px,4vw,48px)', gap:24,
      transition:'all 0.35s cubic-bezier(.4,0,.2,1)',
      boxShadow: scrolled ? '0 4px 24px rgba(43,24,16,0.08)' : 'none',
    }}>
      {/* Logo */}
      <div onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flexShrink:0, userSelect:'none' as any }}>
        <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#2B1810,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 12px rgba(43,24,16,0.3)', flexShrink:0 }}>
          <Coffee size={19} color="#E8DCCB"/>
        </div>
        <div style={{ lineHeight:1 }}>
          <div style={{ fontFamily:'"Playfair Display",serif', fontSize:19, fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>CaféConnect</div>
          <div style={{ fontSize:9.5, color:'#B0998B', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:1 }}>Artisan Coffee</div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display:'flex', gap:2, flex:1, justifyContent:'center', alignItems:'center' }}>
        {[
          { label:'Home', path:'/' },
          { label:'Menu', path:'/menu' },
          { label:'Orders', path:'/orders' },
          { label:'Offers', path:'/' },
        ].map(({ label, path }) => {
          const isActive = label === activePage;
          return (
            <button
              key={label}
              onClick={() => router.push(path)}
              style={{
                padding:'8px 15px', borderRadius:10, fontSize:13.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2B1810' : '#5D4037',
                background: isActive ? 'rgba(43,24,16,0.07)' : 'transparent',
                border:'none', cursor:'pointer', transition:'all 0.2s',
                fontFamily:'Inter,sans-serif', position:'relative',
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background='rgba(93,64,55,0.07)'; (e.currentTarget as HTMLElement).style.color='#2B1810'; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='#5D4037'; } }}
            >
              {label}
              {isActive && <span style={{ position:'absolute', bottom:4, left:'50%', transform:'translateX(-50%)', width:16, height:2, borderRadius:2, background:'#B57A3C', display:'block' }}/>}
            </button>
          );
        })}
      </div>

      {/* Right actions */}
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <button style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)', background:'rgba(232,220,203,0.35)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s', flexShrink:0, position:'relative' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.75)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
        >
          <Bell size={16} color="#5D4037"/>
          <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:'#B57A3C', border:'1.5px solid #FAF8F5' }}/>
        </button>

        <div ref={profileRef} style={{ position:'relative', flexShrink:0 }}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)', background: profileOpen ? 'linear-gradient(135deg,#3E2723,#5D4037)' : 'rgba(232,220,203,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13.5, fontWeight:700, color: profileOpen ? '#FAF8F5' : '#3E2723', cursor:'pointer', transition:'all 0.2s' }}
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
                <button key={item.label} onClick={() => { setProfileOpen(false); router.push(item.path); }}
                  style={{ width:'100%', padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'#3E2723', fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
              <div style={{ borderTop:'1px solid rgba(93,64,55,0.08)' }}>
                <button onClick={() => { setProfileOpen(false); logout(); router.push('/login'); }}
                  style={{ width:'100%', padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'#A94442', fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                >
                  <LogOut size={14} color="#A94442"/> Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => router.push('/cart')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:12, background:'linear-gradient(135deg,#2B1810,#5D4037)', color:'#FAF8F5', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', transition:'all 0.25s', boxShadow:'0 3px 14px rgba(43,24,16,0.28)', flexShrink:0 }}
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

/* ─── Menu Card ──────────────────────────────────────────────────────────── */
function MenuCard({
  id, name, description, price, originalPrice, imageUrl,
  isAvailable, categoryName, isSpecial, onOpen,
}: {
  id: string; name: string; description: string | null;
  price: number; originalPrice?: number; imageUrl: string | null;
  isAvailable: boolean; categoryName: string; isSpecial?: boolean;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const catMeta = CATEGORY_META[categoryName] ?? CATEGORY_META.default;
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100) : null;

  return (
    <div
      onClick={isAvailable ? onOpen : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'#FFFFFF', borderRadius:20, overflow:'hidden',
        cursor: isAvailable ? 'pointer' : 'default',
        opacity: isAvailable ? 1 : 0.55,
        transition:'transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.28s ease',
        transform: hovered && isAvailable ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered && isAvailable ? '0 20px 50px rgba(43,24,16,0.16)' : '0 2px 14px rgba(43,24,16,0.07)',
        border:'1px solid rgba(93,64,55,0.07)',
      }}
    >
      {/* Image */}
      <div style={{ height:190, background:catMeta.gradient, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        {imageUrl
          ? <img src={imageUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}/>
          : <span style={{ fontSize:64, filter:'drop-shadow(0 6px 12px rgba(0,0,0,0.35))', display:'block' }}>{catMeta.emoji}</span>
        }
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:'linear-gradient(transparent,rgba(0,0,0,0.28))', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:6 }}>
          {isSpecial && <span style={{ background:'linear-gradient(135deg,#B57A3C,#D4AF37)', color:'#FAF8F5', fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, letterSpacing:'0.06em' }}>✦ TODAY'S SPECIAL</span>}
          {discount && <span style={{ background:'rgba(43,24,16,0.82)', backdropFilter:'blur(8px)', color:'#FAF8F5', fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8 }}>{discount}% OFF</span>}
          {!isAvailable && <span style={{ background:'rgba(0,0,0,0.68)', backdropFilter:'blur(8px)', color:'rgba(255,255,255,0.8)', fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:8 }}>SOLD OUT</span>}
        </div>
        <button onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
          style={{ position:'absolute', top:10, right:10, width:34, height:34, borderRadius:10, background: liked ? 'rgba(169,68,66,0.9)' : 'rgba(250,248,245,0.88)', backdropFilter:'blur(8px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)', transform: liked ? 'scale(1.12)' : 'scale(1)' }}
        >
          <Heart size={15} color={liked ? '#FAF8F5' : '#9E7B6D'} fill={liked ? '#FAF8F5' : 'none'}/>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding:'16px 18px 18px' }}>
        <div style={{ marginBottom:7 }}>
          <span style={{ background:'rgba(232,220,203,0.6)', color:'#6D4C41', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>{categoryName}</span>
        </div>
        <h3 style={{ fontFamily:'"Playfair Display",serif', fontSize:17, fontWeight:700, color:'#2B1810', lineHeight:1.3, marginBottom:6 }}>{name}</h3>
        {description && (
          <p style={{ fontSize:12.5, color:'#9E7B6D', lineHeight:1.6, marginBottom:12, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, overflow:'hidden' }}>{description}</p>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#9E7B6D' }}>
            <Star size={11} fill="#D4AF37" color="#D4AF37"/>
            4.{Math.floor(id.charCodeAt(id.length - 1) % 3) + 7}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#9E7B6D' }}><Clock size={11}/> 15–20 min</span>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#4F7A54' }}><Leaf size={11} color="#4F7A54"/> Fresh</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <span style={{ fontFamily:'"Playfair Display",serif', fontSize:20, fontWeight:700, color:'#2B1810' }}>₹{price}</span>
            {originalPrice && originalPrice > price && <span style={{ fontSize:12.5, color:'#B0998B', textDecoration:'line-through', marginLeft:6 }}>₹{originalPrice}</span>}
          </div>
          {isAvailable && (
            <button onClick={e => { e.stopPropagation(); onOpen(); }}
              style={{ padding:'9px 18px', borderRadius:12, background: hovered ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'linear-gradient(135deg,#3E2723,#6D4C41)', color:'#FAF8F5', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', transition:'all 0.25s', boxShadow: hovered ? '0 4px 16px rgba(43,24,16,0.3)' : 'none' }}
            >
              Add +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function MenuPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { getItemCount, getTotalPrice } = useCartStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchData();
    const onClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, itemsRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items'),
      ]);
      setCategories(catRes.data);
      setMenuItems(itemsRes.data);
    } catch (e) {
      console.error('Failed to fetch menu:', e);
    } finally {
      setLoading(false);
    }
  };

  const getCatMeta = (name: string) => CATEGORY_META[name] ?? CATEGORY_META.default;

  /* Filtering + sorting */
  const filteredItems = menuItems
    .filter(item => {
      const matchCat = selectedCategory === 'all' || item.category.id === selectedCategory;
      const matchSearch = !searchQuery
        || item.name.toLowerCase().includes(searchQuery.toLowerCase())
        || item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAvail = !showOnlyAvailable || item.isAvailable;
      const matchPrice = !maxPrice || item.price <= maxPrice;
      return matchCat && matchSearch && matchAvail && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

  const activeFiltersCount = [showOnlyAvailable, !!maxPrice].filter(Boolean).length;

  if (loading) return <CafeLoader text="Brewing our menu…" />;

  return (
    <div style={{ minHeight:'100vh', background:'#FAF8F5', fontFamily:'Inter,sans-serif', color:'#2B1810' }}>
      <Navbar activePage="Menu"/>
      <div style={{ height:70 }}/>

      {/* ══ HERO BANNER ══ */}
      <section style={{
        background:'linear-gradient(155deg,#1C0F0A 0%,#2B1810 40%,#3E2723 75%,#4A2C20 100%)',
        padding:'52px clamp(16px,4vw,60px) 48px',
        position:'relative', overflow:'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', top:-80, right:-60, width:380, height:380, borderRadius:'50%', background:'rgba(181,122,60,0.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-50, left:-40, width:260, height:260, borderRadius:'50%', background:'rgba(181,122,60,0.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:60, right:'6%', fontSize:32, opacity:0.1, animation:'float 7s ease-in-out infinite', pointerEvents:'none' }}>☕</div>
        <div style={{ position:'absolute', bottom:40, right:'14%', fontSize:22, opacity:0.08, animation:'float 9s ease-in-out infinite 2s', pointerEvents:'none' }}>🫘</div>

        <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr auto', gap:40, alignItems:'center' }}>
          <div style={{ animation:'fadeInUp 0.6s ease both' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.07)', borderRadius:24, padding:'5px 14px', marginBottom:18, border:'1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#6DBF7E', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)', letterSpacing:'0.04em' }}>Full menu available</span>
            </div>
            <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(30px,4.5vw,52px)', lineHeight:1.1, color:'#FAF8F5', marginBottom:14, fontWeight:700, letterSpacing:'-0.025em' }}>
              Explore Our<br/>
              <span style={{ color:'#D7C5AE', fontStyle:'italic' }}>Artisan Menu.</span>
            </h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.6)', lineHeight:1.7, maxWidth:460 }}>
              From single-origin espressos to freshly baked pastries — every item crafted with passion and delivered with warmth.
            </p>
          </div>
          {/* Quick stats */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:200, animation:'fadeInUp 0.6s ease 0.15s both' }}>
            {[
              { v: menuItems.length.toString(), l: 'Items on Menu', e: '🍽' },
              { v: categories.length.toString(), l: 'Categories', e: '📋' },
              { v: '4.8★', l: 'Avg Rating', e: '⭐' },
            ].map((s, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'14px 18px', display:'flex', alignItems:'center', gap:14, transition:'all 0.25s', backdropFilter:'blur(8px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform='translateX(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform='translateX(0)'; }}
              >
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{s.e}</div>
                <div>
                  <div style={{ fontFamily:'"Playfair Display",serif', fontSize:20, fontWeight:700, color:'#FAF8F5', lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:3, letterSpacing:'0.02em' }}>{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SEARCH + FILTERS BAR ══ */}
      <div style={{ maxWidth:1180, margin:'0 auto', padding:'28px clamp(16px,4vw,60px) 0' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>

          {/* Search */}
          <div style={{
            flex:'1 1 280px', display:'flex', alignItems:'center', gap:10,
            background:'#FFFFFF',
            border: searchFocused ? '1.5px solid #B57A3C' : '1.5px solid rgba(93,64,55,0.18)',
            borderRadius:14, padding:'12px 16px',
            transition:'all 0.25s',
            boxShadow: searchFocused ? '0 0 0 3px rgba(181,122,60,0.1)' : '0 2px 10px rgba(43,24,16,0.06)',
          }}>
            <Search size={16} color={searchFocused ? '#B57A3C' : '#B0998B'} style={{ flexShrink:0 }}/>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search items, flavors, categories…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ background:'transparent', border:'none', outline:'none', fontSize:14, color:'#2B1810', flex:1, fontFamily:'Inter,sans-serif' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background:'none', border:'none', cursor:'pointer', padding:2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <X size={14} color="#B0998B"/>
              </button>
            )}
            <button style={{ width:28, height:28, borderRadius:8, background:'rgba(232,220,203,0.4)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <Mic size={13} color="#9E7B6D"/>
            </button>
          </div>

          {/* Sort dropdown */}
          <div ref={sortRef} style={{ position:'relative', flexShrink:0 }}>
            <button onClick={() => setSortOpen(o => !o)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:14, background:'#FFFFFF', border:'1.5px solid rgba(93,64,55,0.18)', cursor:'pointer', fontSize:13.5, fontWeight:500, color:'#5D4037', transition:'all 0.2s', whiteSpace:'nowrap', boxShadow:'0 2px 10px rgba(43,24,16,0.06)', fontFamily:'Inter,sans-serif' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; }}
            >
              <SlidersHorizontal size={14}/>
              {SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'}
              <ChevronRight size={13} style={{ transform: sortOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.2s' }}/>
            </button>
            {sortOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, background:'#FFFFFF', borderRadius:14, border:'1px solid rgba(93,64,55,0.12)', boxShadow:'0 12px 40px rgba(43,24,16,0.14)', zIndex:50, minWidth:200, overflow:'hidden', animation:'fadeIn 0.15s ease' }}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    style={{ width:'100%', padding:'11px 16px', background: sortBy === opt.value ? 'rgba(232,220,203,0.4)' : 'transparent', border:'none', cursor:'pointer', fontSize:13.5, color: sortBy === opt.value ? '#2B1810' : '#5D4037', fontWeight: sortBy === opt.value ? 700 : 400, fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s', display:'flex', alignItems:'center', justifyContent:'space-between' }}
                    onMouseEnter={e => { if (sortBy !== opt.value) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.25)'; }}
                    onMouseLeave={e => { if (sortBy !== opt.value) (e.currentTarget as HTMLElement).style.background='transparent'; }}
                  >
                    {opt.label}
                    {sortBy === opt.value && <span style={{ width:6, height:6, borderRadius:'50%', background:'#B57A3C', display:'inline-block' }}/>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters toggle */}
          <button onClick={() => setFilterOpen(o => !o)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', borderRadius:14, background: filterOpen ? 'linear-gradient(135deg,#3E2723,#5D4037)' : '#FFFFFF', border:'1.5px solid rgba(93,64,55,0.18)', cursor:'pointer', fontSize:13.5, fontWeight:600, color: filterOpen ? '#FAF8F5' : '#5D4037', transition:'all 0.22s', whiteSpace:'nowrap', boxShadow:'0 2px 10px rgba(43,24,16,0.06)', fontFamily:'Inter,sans-serif', position:'relative' }}
            onMouseEnter={e => { if (!filterOpen) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.4)'; } }}
            onMouseLeave={e => { if (!filterOpen) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; } }}
          >
            <Filter size={14}/>
            Filters
            {activeFiltersCount > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#B57A3C', color:'#FAF8F5', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Results count */}
          <span style={{ fontSize:13, color:'#9E7B6D', marginLeft:'auto', flexShrink:0 }}>
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Expanded filters */}
        {filterOpen && (
          <div style={{ marginTop:14, padding:'20px 22px', background:'#FFFFFF', borderRadius:16, border:'1px solid rgba(93,64,55,0.1)', boxShadow:'0 4px 20px rgba(43,24,16,0.07)', display:'flex', gap:32, flexWrap:'wrap', alignItems:'center', animation:'fadeIn 0.2s ease' }}>
            {/* Availability toggle */}
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' as any }}>
              <div
                onClick={() => setShowOnlyAvailable(v => !v)}
                style={{ width:40, height:22, borderRadius:11, background: showOnlyAvailable ? 'linear-gradient(135deg,#3E2723,#5D4037)' : 'rgba(93,64,55,0.15)', transition:'all 0.25s', position:'relative', cursor:'pointer', flexShrink:0 }}
              >
                <div style={{ position:'absolute', top:3, left: showOnlyAvailable ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#FFFFFF', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
              </div>
              <span style={{ fontSize:13.5, fontWeight:500, color:'#3E2723' }}>Available only</span>
            </label>

            {/* Max price */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, color:'#9E7B6D', whiteSpace:'nowrap' }}>Max price:</span>
              <div style={{ display:'flex', gap:6 }}>
                {[null, 100, 200, 500].map(p => (
                  <button key={String(p)} onClick={() => setMaxPrice(p)}
                    style={{ padding:'5px 12px', borderRadius:8, background: maxPrice === p ? 'linear-gradient(135deg,#3E2723,#5D4037)' : 'rgba(232,220,203,0.45)', border: maxPrice === p ? 'none' : '1px solid rgba(93,64,55,0.18)', color: maxPrice === p ? '#FAF8F5' : '#5D4037', fontSize:12.5, fontWeight:600, cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}
                  >
                    {p === null ? 'All' : `₹${p}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            {(showOnlyAvailable || maxPrice) && (
              <button onClick={() => { setShowOnlyAvailable(false); setMaxPrice(null); }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:'rgba(169,68,66,0.08)', border:'1px solid rgba(169,68,66,0.2)', color:'#A94442', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif', marginLeft:'auto' }}
              >
                <X size={12}/> Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ CATEGORY STRIP ══ */}
      {categories.length > 0 && (
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'24px clamp(16px,4vw,60px) 0' }}>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:6 }}>
            <button onClick={() => setSelectedCategory('all')}
              style={{ flexShrink:0, padding:'14px 18px', borderRadius:16, cursor:'pointer', background: selectedCategory === 'all' ? 'linear-gradient(135deg,#2B1810,#5D4037)' : '#FFFFFF', border: selectedCategory === 'all' ? 'none' : '1.5px solid rgba(93,64,55,0.15)', color: selectedCategory === 'all' ? '#FAF8F5' : '#5D4037', fontSize:13, fontWeight:600, transition:'all 0.25s', display:'flex', flexDirection:'column', alignItems:'center', gap:9, minWidth:82, boxShadow: selectedCategory === 'all' ? '0 6px 20px rgba(43,24,16,0.26)' : '0 2px 8px rgba(43,24,16,0.06)', transform: selectedCategory === 'all' ? 'translateY(-3px)' : 'translateY(0)' }}
            >
              <span style={{ fontSize:24 }}>🍽</span>
              <span>All</span>
            </button>
            {categories.map(cat => {
              const meta = getCatMeta(cat.name);
              const active = selectedCategory === cat.id;
              const count = menuItems.filter(m => m.category.id === cat.id).length;
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  style={{ flexShrink:0, padding:'14px 18px', borderRadius:16, cursor:'pointer', background: active ? meta.gradient : '#FFFFFF', border: active ? 'none' : '1.5px solid rgba(93,64,55,0.15)', color: active ? '#FAF8F5' : '#5D4037', fontSize:13, fontWeight:600, transition:'all 0.25s', display:'flex', flexDirection:'column', alignItems:'center', gap:9, minWidth:82, boxShadow: active ? '0 6px 20px rgba(43,24,16,0.24)' : '0 2px 8px rgba(43,24,16,0.06)', transform: active ? 'translateY(-3px)' : 'translateY(0)' }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 22px rgba(43,24,16,0.1)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(43,24,16,0.06)'; } }}
                >
                  <span style={{ fontSize:24 }}>{meta.emoji}</span>
                  <span>{cat.name}</span>
                  {count > 0 && <span style={{ fontSize:10, opacity: active ? 0.75 : 0.55, marginTop:-4 }}>{count} items</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ ITEMS GRID ══ */}
      <section style={{ maxWidth:1180, margin:'0 auto', padding:'32px clamp(16px,4vw,60px) 100px' }}>
        {/* Section heading */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B57A3C', marginBottom:6 }}>
              {selectedCategory === 'all' ? 'Our Craft' : 'Category'}
            </div>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(22px,3vw,28px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>
              {selectedCategory === 'all'
                ? (searchQuery ? `Results for "${searchQuery}"` : 'Full Menu')
                : categories.find(c => c.id === selectedCategory)?.name ?? 'Menu'}
            </h2>
            <p style={{ fontSize:14, color:'#9E7B6D', marginTop:5 }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} {searchQuery ? `matching "${searchQuery}"` : 'available'}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px', background:'rgba(232,220,203,0.25)', borderRadius:24, border:'1px solid rgba(93,64,55,0.08)' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>☕</div>
            <p style={{ fontFamily:'"Playfair Display",serif', fontSize:22, color:'#5D4037', marginBottom:8, fontWeight:700 }}>Nothing found</p>
            <p style={{ fontSize:14, color:'#9E7B6D', marginBottom:24 }}>Try a different search term or browse another category</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setShowOnlyAvailable(false); setMaxPrice(null); }}
                style={{ padding:'12px 26px', borderRadius:12, background:'linear-gradient(135deg,#3E2723,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'Inter,sans-serif', boxShadow:'0 4px 16px rgba(43,24,16,0.25)' }}
              >
                View all items
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(285px,1fr))', gap:24 }}>
            {filteredItems.map(item => (
              <MenuCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                imageUrl={item.imageUrl}
                isAvailable={item.isAvailable}
                categoryName={item.category.name}
                onOpen={() => router.push(`/menu/${item.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating cart bar */}
      {getItemCount() > 0 && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:200, width:'calc(100% - 48px)', maxWidth:540, animation:'slideUp 0.35s cubic-bezier(.34,1.56,.64,1)' }}>
          <button onClick={() => router.push('/cart')}
            style={{ width:'100%', background:'linear-gradient(135deg,#1C0F0A,#3E2723)', color:'#FAF8F5', borderRadius:20, padding:'15px 22px', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:14, cursor:'pointer', boxShadow:'0 10px 48px rgba(43,24,16,0.55)', transition:'transform 0.2s', fontFamily:'Inter,sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; }}
          >
            <span style={{ background:'rgba(255,255,255,0.14)', width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 }}>{getItemCount()}</span>
            <span style={{ flex:1, fontSize:14, fontWeight:600, textAlign:'left' }}>View your bag</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontFamily:'"Playfair Display",serif', fontSize:17, fontWeight:700 }}>₹{getTotalPrice()}</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.6)"/>
            </div>
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-12px) rotate(4deg)}66%{transform:translateY(-6px) rotate(-3deg)}}
        input::placeholder{color:#C4B0A3;}
        ::-webkit-scrollbar{height:4px;background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(93,64,55,0.2);border-radius:4px}
      `}</style>
    </div>
  );
}
