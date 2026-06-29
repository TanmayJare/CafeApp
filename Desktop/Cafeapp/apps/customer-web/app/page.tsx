'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import {
  Search, ShoppingBag, User, Heart, Bell, ChevronRight,
  Clock, Star, Leaf, ArrowRight, Coffee,
  Tag, Mic, LogOut,
} from 'lucide-react';

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

interface DailySpecial {
  id: string;
  menuItem: MenuItem;
  specialPrice: number;
  availableFrom: string;
  availableUntil: string;
}

const CATEGORY_META: Record<string, { emoji: string; gradient: string; bg: string }> = {
  Coffee:        { emoji: '☕', gradient: 'linear-gradient(160deg,#5D4037,#3E2723)', bg: 'rgba(93,64,55,0.07)' },
  'Cold Drinks': { emoji: '🧋', gradient: 'linear-gradient(160deg,#4F6F52,#2E4A31)', bg: 'rgba(79,111,82,0.08)' },
  Pizza:         { emoji: '🍕', gradient: 'linear-gradient(160deg,#B57A3C,#7A4F20)', bg: 'rgba(181,122,60,0.08)' },
  Sandwich:      { emoji: '🥪', gradient: 'linear-gradient(160deg,#8A7560,#5C4A32)', bg: 'rgba(138,117,96,0.08)' },
  Desserts:      { emoji: '🍰', gradient: 'linear-gradient(160deg,#A0522D,#6B3A1F)', bg: 'rgba(160,82,45,0.08)' },
  Pasta:         { emoji: '🍝', gradient: 'linear-gradient(160deg,#7A6048,#4A3828)', bg: 'rgba(122,96,72,0.08)' },
  Snacks:        { emoji: '🍟', gradient: 'linear-gradient(160deg,#C9964A,#8B5E28)', bg: 'rgba(201,150,74,0.08)' },
  Healthy:       { emoji: '🥗', gradient: 'linear-gradient(160deg,#4F6F52,#3B5230)', bg: 'rgba(79,111,82,0.08)' },
  Tea:           { emoji: '🍵', gradient: 'linear-gradient(160deg,#8A9A5B,#5A6A3A)', bg: 'rgba(138,154,91,0.08)' },
  default:       { emoji: '🍽', gradient: 'linear-gradient(160deg,#6D4C41,#3E2723)', bg: 'rgba(109,76,65,0.07)' },
};

const OFFERS = [
  {
    tag: 'First Order',
    headline: '20% Off',
    sub: 'Flat discount on your first order',
    code: 'FIRST20',
    accent: '#D4AF37',
    bg: 'linear-gradient(140deg,#2B1810 0%,#5D4037 100%)',
    emoji: '🎉',
    expiry: 'Valid till Dec 31',
  },
  {
    tag: 'Society Perk',
    headline: '₹0 Delivery',
    sub: 'Free delivery inside society gates',
    code: 'FREESHIP',
    accent: '#6DBF7E',
    bg: 'linear-gradient(140deg,#1A3A1E 0%,#4F7A54 100%)',
    emoji: '🚀',
    expiry: 'Always active',
  },
  {
    tag: 'Happy Hours',
    headline: 'Buy 1 Get 1',
    sub: 'On all espresso drinks, 3–5 PM',
    code: 'BOGO',
    accent: '#D4AF37',
    bg: 'linear-gradient(140deg,#1D1A12 0%,#4A3C18 100%)',
    emoji: '☕',
    expiry: 'Today only',
  },
];

const POPULAR_TAGS = ['Espresso', 'Cold Coffee', 'Croissant', 'Cheesecake', 'Latte'];

const STATS = [
  { value: '20–35', unit: 'min', label: "Today's Delivery", icon: '⏱', color: '#B57A3C' },
  { value: 'Free', unit: '', label: 'Inside Society', icon: '🚀', color: '#4F7A54' },
  { value: '4.8', unit: '★', label: 'Customer Rating', icon: '⭐', color: '#D4AF37' },
  { value: '500+', unit: '', label: 'Happy Customers', icon: '❤️', color: '#A94442' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { addItem, getItemCount, getTotalPrice } = useCartStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dailySpecials, setDailySpecials] = useState<DailySpecial[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [offerSlide, setOfferSlide] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchData();
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);

    const offerTimer = setInterval(() => setOfferSlide(s => (s + 1) % OFFERS.length), 4000);

    const onClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(offerTimer);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, itemsRes, specRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items'),
        api.get('/menu/daily-specials'),
      ]);
      setCategories(catRes.data);
      setMenuItems(itemsRes.data);
      setDailySpecials(specRes.data);
    } catch (e) {
      console.error('Failed to fetch menu:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category.id === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const getCatMeta = (name: string) => CATEGORY_META[name] ?? CATEGORY_META.default;

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ position:'relative', width:56, height:56, margin:'0 auto 20px' }}>
            <div style={{ width:56, height:56, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Coffee size={20} color="#B57A3C" />
            </div>
          </div>
          <p style={{ fontFamily:'"Playfair Display",serif', fontSize:16, color:'#5D4037', fontWeight:600 }}>Brewing your menu…</p>
          <p style={{ fontSize:12, color:'#B0998B', marginTop:4 }}>Crafted with care</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#FAF8F5', fontFamily:'Inter,sans-serif', color:'#2B1810' }}>

      {/* ══════════════════════════════════════════════════
          PREMIUM NAVBAR
      ══════════════════════════════════════════════════ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        height:70,
        background: scrolled ? 'rgba(250,248,245,0.94)' : 'rgba(250,248,245,0.75)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        borderBottom: scrolled ? '1px solid rgba(93,64,55,0.12)' : '1px solid transparent',
        display:'flex', alignItems:'center',
        padding:'0 clamp(20px,4vw,48px)',
        gap:24,
        transition:'all 0.35s cubic-bezier(.4,0,.2,1)',
        boxShadow: scrolled ? '0 4px 24px rgba(43,24,16,0.08)' : 'none',
      }}>

        {/* Logo */}
        <div
          onClick={() => router.push('/')}
          style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', flexShrink:0, userSelect:'none' }}
        >
          <div style={{
            width:38, height:38, borderRadius:11,
            background:'linear-gradient(135deg,#2B1810,#5D4037)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 3px 12px rgba(43,24,16,0.3)',
            flexShrink:0,
          }}>
            <Coffee size={19} color="#E8DCCB" />
          </div>
          <div style={{ lineHeight:1 }}>
            <div style={{ fontFamily:'"Playfair Display",serif', fontSize:19, fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>
              CaféConnect
            </div>
            <div style={{ fontSize:9.5, color:'#B0998B', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:1 }}>
              Artisan Coffee
            </div>
          </div>
        </div>

        {/* Center nav links */}
        <div style={{ display:'flex', gap:2, flex:1, justifyContent:'center', alignItems:'center' }}>
          {[
            { label:'Home', path:'/' },
            { label:'Menu', path:'/menu' },
            { label:'Orders', path:'/orders' },
            { label:'Offers', path:'/' },
          ].map(({ label, path }) => (
            <button
              key={label}
              onClick={() => { if (label === 'Offers') { document.getElementById('offers-section')?.scrollIntoView({ behavior:'smooth' }); } else { router.push(path); } }}
              style={{
                padding:'8px 15px', borderRadius:10, fontSize:13.5, fontWeight:500,
                color:'#5D4037', background:'transparent', border:'none', cursor:'pointer',
                transition:'all 0.2s', letterSpacing:'0.01em', fontFamily:'Inter,sans-serif',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(93,64,55,0.08)'; (e.currentTarget as HTMLElement).style.color='#2B1810'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='#5D4037'; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>

          {/* Search */}
          <button
            onClick={() => { searchRef.current?.focus(); document.getElementById('search-section')?.scrollIntoView({ behavior:'smooth' }); }}
            style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)', background:'rgba(232,220,203,0.35)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s', flexShrink:0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.75)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
            title="Search"
          >
            <Search size={16} color="#5D4037" />
          </button>

          {/* Notifications */}
          <button
            style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)', background:'rgba(232,220,203,0.35)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s', flexShrink:0, position:'relative' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.75)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
            title="Notifications"
          >
            <Bell size={16} color="#5D4037" />
            <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:'#B57A3C', border:'1.5px solid #FAF8F5' }}/>
          </button>

          {/* Profile dropdown */}
          <div ref={profileRef} style={{ position:'relative', flexShrink:0 }}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              style={{
                width:38, height:38, borderRadius:10, border:'1px solid rgba(93,64,55,0.16)',
                background: profileOpen ? 'linear-gradient(135deg,#3E2723,#5D4037)' : 'rgba(232,220,203,0.35)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13.5, fontWeight:700, color: profileOpen ? '#FAF8F5' : '#3E2723',
                cursor:'pointer', transition:'all 0.2s',
              }}
              onMouseEnter={e => { if (!profileOpen) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.75)'; }}
              onMouseLeave={e => { if (!profileOpen) (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
            >
              {user?.name?.[0]?.toUpperCase() ?? <User size={16} color={profileOpen ? '#FAF8F5' : '#5D4037'} />}
            </button>

            {profileOpen && (
              <div style={{
                position:'absolute', top:'calc(100% + 10px)', right:0,
                background:'#FFFFFF', borderRadius:16, minWidth:220,
                border:'1px solid rgba(93,64,55,0.12)',
                boxShadow:'0 16px 48px rgba(43,24,16,0.15)',
                animation:'fadeIn 0.2s ease',
                overflow:'hidden', zIndex:200,
              }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(93,64,55,0.08)', background:'rgba(232,220,203,0.25)' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#2B1810' }}>{user?.name || 'Guest'}</div>
                  <div style={{ fontSize:12, color:'#9E7B6D', marginTop:2 }}>{user?.email || ''}</div>
                </div>
                {[
                  { label:'My Orders', path:'/orders', icon:'📦' },
                  { label:'Saved Addresses', path:'/addresses', icon:'📍' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { setProfileOpen(false); router.push(item.path); }}
                    style={{ width:'100%', padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'#3E2723', fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.35)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                  >
                    <span>{item.icon}</span> {item.label}
                  </button>
                ))}
                <div style={{ borderTop:'1px solid rgba(93,64,55,0.08)' }}>
                  <button
                    onClick={() => { setProfileOpen(false); logout(); router.push('/login'); }}
                    style={{ width:'100%', padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'#A94442', fontFamily:'Inter,sans-serif', textAlign:'left', transition:'background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
                  >
                    <LogOut size={14} color="#A94442" /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart */}
          <button
            onClick={() => router.push('/cart')}
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'9px 18px', borderRadius:12,
              background:'linear-gradient(135deg,#2B1810,#5D4037)',
              color:'#FAF8F5', fontSize:13, fontWeight:600,
              border:'none', cursor:'pointer', transition:'all 0.25s',
              boxShadow:'0 3px 14px rgba(43,24,16,0.28)',
              flexShrink:0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 22px rgba(43,24,16,0.38)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 3px 14px rgba(43,24,16,0.28)'; }}
          >
            <ShoppingBag size={15} />
            <span>Bag</span>
            {getItemCount() > 0 && (
              <span style={{ background:'rgba(255,255,255,0.22)', borderRadius:7, padding:'2px 7px', fontSize:11, fontWeight:700 }}>
                {getItemCount()}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Navbar spacer */}
      <div style={{ height:70 }} />

      {/* ══════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════ */}
      <section style={{
        background:'linear-gradient(155deg,#1C0F0A 0%,#2B1810 35%,#3E2723 70%,#4A2C20 100%)',
        padding:'72px clamp(20px,4vw,60px) 64px',
        position:'relative', overflow:'hidden',
        minHeight:520,
      }}>
        {/* Decorative background shapes */}
        <div style={{ position:'absolute', top:-140, right:-100, width:580, height:580, borderRadius:'50%', background:'rgba(181,122,60,0.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, left:-60, width:380, height:380, borderRadius:'50%', background:'rgba(181,122,60,0.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'40%', right:'20%', width:200, height:200, borderRadius:'50%', background:'rgba(212,175,55,0.04)', pointerEvents:'none' }}/>

        {/* Floating coffee bean decorations */}
        <div style={{ position:'absolute', top:80, right:'8%', fontSize:32, opacity:0.12, animation:'float 7s ease-in-out infinite', pointerEvents:'none' }}>☕</div>
        <div style={{ position:'absolute', top:200, right:'4%', fontSize:20, opacity:0.09, animation:'float 9s ease-in-out infinite 1.5s', pointerEvents:'none' }}>🫘</div>
        <div style={{ position:'absolute', bottom:100, right:'12%', fontSize:24, opacity:0.08, animation:'float 8s ease-in-out infinite 3s', pointerEvents:'none' }}>✨</div>

        <div style={{ maxWidth:1140, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr auto', gap:48, alignItems:'center', position:'relative' }}>

          {/* LEFT — Copy + Search */}
          <div style={{ animation:'fadeInUp 0.7s ease both' }}>

            {/* Status pill */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,0.07)', borderRadius:24,
              padding:'6px 14px', marginBottom:24,
              border:'1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#6DBF7E', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)', letterSpacing:'0.04em' }}>Open · Closes 11 PM</span>
            </div>

            <h1 style={{
              fontFamily:'"Playfair Display",serif',
              fontSize:'clamp(38px,5.5vw,64px)',
              lineHeight:1.08, color:'#FAF8F5',
              marginBottom:20, fontWeight:700,
              letterSpacing:'-0.025em',
            }}>
              Crafted Coffee,<br />
              <span style={{ color:'#D7C5AE', fontStyle:'italic' }}>Delivered Fresh.</span>
            </h1>

            <p style={{ fontSize:15, color:'rgba(255,255,255,0.6)', lineHeight:1.75, marginBottom:32, maxWidth:440 }}>
              Freshly brewed coffee, artisan beverages, gourmet snacks and desserts crafted with warmth — delivered to your door.
            </p>

            {/* Search bar */}
            <div id="search-section" style={{
              display:'flex', alignItems:'center', gap:12,
              background: searchFocused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
              border: searchFocused ? '1.5px solid rgba(181,122,60,0.6)' : '1.5px solid rgba(255,255,255,0.15)',
              borderRadius:16, padding:'13px 18px',
              maxWidth:480, marginBottom:18,
              transition:'all 0.25s',
              boxShadow: searchFocused ? '0 0 0 4px rgba(181,122,60,0.12)' : 'none',
            }}>
              <Search size={18} color={searchFocused ? '#D7C5AE' : 'rgba(255,255,255,0.4)'} style={{ flexShrink:0 }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search coffee, snacks, desserts…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  background:'transparent', border:'none', outline:'none',
                  fontSize:14, color:'#FAF8F5', flex:1, fontFamily:'Inter,sans-serif',
                }}
              />
              <button
                style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.1)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)'; }}
                title="Voice search"
              >
                <Mic size={14} color="rgba(255,255,255,0.5)" />
              </button>
            </div>

            {/* Popular tags */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:36, alignItems:'center' }}>
              <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)', letterSpacing:'0.04em', marginRight:4 }}>Popular:</span>
              {POPULAR_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  style={{
                    padding:'5px 13px', borderRadius:20,
                    background: searchQuery === tag ? 'rgba(181,122,60,0.3)' : 'rgba(255,255,255,0.07)',
                    border: searchQuery === tag ? '1px solid rgba(181,122,60,0.5)' : '1px solid rgba(255,255,255,0.12)',
                    fontSize:12, color: searchQuery === tag ? '#D4AF37' : 'rgba(255,255,255,0.65)',
                    cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.13)'; }}
                  onMouseLeave={e => { if (searchQuery !== tag) (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)'; }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button
                onClick={() => router.push('/menu')}
                style={{
                  padding:'14px 30px', borderRadius:14,
                  background:'linear-gradient(135deg,#B57A3C,#C9964A)',
                  color:'#FAF8F5', fontSize:14, fontWeight:600,
                  border:'none', cursor:'pointer', transition:'all 0.25s',
                  boxShadow:'0 4px 22px rgba(181,122,60,0.45)',
                  display:'flex', alignItems:'center', gap:8, fontFamily:'Inter,sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 30px rgba(181,122,60,0.55)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 22px rgba(181,122,60,0.45)'; }}
              >
                Order Now <ArrowRight size={16} />
              </button>
              <button
                onClick={() => document.getElementById('menu-section')?.scrollIntoView({ behavior:'smooth' })}
                style={{
                  padding:'14px 28px', borderRadius:14,
                  background:'rgba(255,255,255,0.09)',
                  border:'1.5px solid rgba(255,255,255,0.22)',
                  color:'rgba(255,255,255,0.88)', fontSize:14, fontWeight:500,
                  cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.09)'; }}
              >
                Browse Menu
              </button>
            </div>
          </div>

          {/* RIGHT — Stats cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, minWidth:260, animation:'fadeInUp 0.7s ease 0.2s both' }}>
            {STATS.map((s, i) => (
              <div
                key={i}
                style={{
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.09)',
                  borderRadius:18, padding:'18px 22px',
                  display:'flex', alignItems:'center', gap:16,
                  transition:'all 0.25s', cursor:'default',
                  backdropFilter:'blur(8px)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform='translateX(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform='translateX(0)'; }}
              >
                <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontFamily:'"Playfair Display",serif', fontSize:24, fontWeight:700, color:'#FAF8F5', lineHeight:1 }}>
                    {s.value}
                    {s.unit && <span style={{ fontSize:14, color:s.color, marginLeft:3, fontStyle:'normal' }}>{s.unit}</span>}
                  </div>
                  <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.5)', marginTop:4, letterSpacing:'0.03em' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          OFFERS SECTION
      ══════════════════════════════════════════════════ */}
      <section id="offers-section" style={{ padding:'48px clamp(20px,4vw,60px) 0', maxWidth:1180, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <div className="section-eyebrow" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B57A3C', marginBottom:6 }}>Limited Time</div>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(22px,3vw,28px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>Exclusive Offers</h2>
          </div>
          <button style={{ fontSize:12.5, color:'#B57A3C', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
            View All <ChevronRight size={14}/>
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {OFFERS.map((o, i) => (
            <div
              key={i}
              style={{
                borderRadius:20, padding:'26px 24px 22px',
                background:o.bg, position:'relative', overflow:'hidden',
                cursor:'pointer', transition:'transform 0.28s, box-shadow 0.28s',
                minHeight:140,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-4px) scale(1.01)'; (e.currentTarget as HTMLElement).style.boxShadow='0 16px 48px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow='none'; }}
            >
              {/* Decorative circle */}
              <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>

              <div style={{ position:'absolute', top:16, right:18 }}>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.4)', textTransform:'uppercase' }}>{o.tag}</span>
              </div>

              <div style={{ fontSize:28, marginBottom:10 }}>{o.emoji}</div>
              <div style={{ fontFamily:'"Playfair Display",serif', fontSize:30, fontWeight:700, color:'#FAF8F5', lineHeight:1, marginBottom:6 }}>{o.headline}</div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', marginBottom:16, lineHeight:1.55 }}>{o.sub}</div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  background:'rgba(255,255,255,0.12)', borderRadius:8,
                  padding:'5px 12px', fontSize:11, fontWeight:700,
                  color:o.accent, letterSpacing:'0.08em',
                  border:'1px solid rgba(255,255,255,0.08)',
                }}>
                  <Tag size={10}/> {o.code}
                </div>
                <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.35)', letterSpacing:'0.03em' }}>{o.expiry}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CATEGORY SECTION
      ══════════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section style={{ padding:'56px clamp(20px,4vw,60px) 0', maxWidth:1180, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B57A3C', marginBottom:6 }}>Browse</div>
              <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(22px,3vw,28px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>
                Explore Categories
              </h2>
              <p style={{ fontSize:14, color:'#9E7B6D', marginTop:5 }}>Discover what we brew and bake</p>
            </div>
          </div>

          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch' as any }}>
            {/* All chip */}
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                flexShrink:0, padding:'18px 20px', borderRadius:18, cursor:'pointer',
                background: selectedCategory === 'all' ? 'linear-gradient(135deg,#2B1810,#5D4037)' : '#FFFFFF',
                border: selectedCategory === 'all' ? 'none' : '1.5px solid rgba(93,64,55,0.15)',
                color: selectedCategory === 'all' ? '#FAF8F5' : '#5D4037',
                fontSize:13, fontWeight:600, transition:'all 0.25s',
                display:'flex', flexDirection:'column', alignItems:'center', gap:10, minWidth:88,
                boxShadow: selectedCategory === 'all' ? '0 6px 22px rgba(43,24,16,0.28)' : '0 2px 10px rgba(43,24,16,0.06)',
                transform: selectedCategory === 'all' ? 'translateY(-3px)' : 'translateY(0)',
              }}
            >
              <span style={{ fontSize:26 }}>🍽</span>
              <span>All</span>
            </button>

            {categories.map(cat => {
              const meta = getCatMeta(cat.name);
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    flexShrink:0, padding:'18px 20px', borderRadius:18, cursor:'pointer',
                    background: active ? meta.gradient : '#FFFFFF',
                    border: active ? 'none' : '1.5px solid rgba(93,64,55,0.15)',
                    color: active ? '#FAF8F5' : '#5D4037',
                    fontSize:13, fontWeight:600, transition:'all 0.25s',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:10, minWidth:88,
                    boxShadow: active ? '0 6px 22px rgba(43,24,16,0.25)' : '0 2px 10px rgba(43,24,16,0.06)',
                    transform: active ? 'translateY(-3px)' : 'translateY(0)',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(43,24,16,0.1)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 10px rgba(43,24,16,0.06)'; } }}
                >
                  <span style={{ fontSize:26 }}>{meta.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          TODAY'S SPECIALS
      ══════════════════════════════════════════════════ */}
      {dailySpecials.length > 0 && (
        <section style={{ padding:'56px clamp(20px,4vw,60px) 0', maxWidth:1180, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B57A3C', marginBottom:6 }}>Handpicked</div>
              <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(22px,3vw,28px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>
                Today's Specials
              </h2>
              <p style={{ fontSize:14, color:'#9E7B6D', marginTop:5 }}>Loved by everyone, made with care</p>
            </div>
            <button style={{ fontSize:12.5, color:'#B57A3C', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              See all <ChevronRight size={14}/>
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:22 }}>
            {dailySpecials.slice(0, 3).map(s => (
              <MenuCard
                key={s.id}
                id={s.menuItem.id}
                name={s.menuItem.name}
                description={s.menuItem.description}
                price={s.specialPrice}
                originalPrice={s.menuItem.price}
                imageUrl={s.menuItem.imageUrl}
                isAvailable={s.menuItem.isAvailable}
                categoryName={s.menuItem.category.name}
                isSpecial
                onOpen={() => router.push(`/menu/${s.menuItem.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          FULL MENU
      ══════════════════════════════════════════════════ */}
      <section id="menu-section" style={{ padding:'56px clamp(20px,4vw,60px) 80px', maxWidth:1180, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#B57A3C', marginBottom:6 }}>Our Craft</div>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(22px,3vw,28px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.02em' }}>
              {selectedCategory === 'all' ? 'Full Menu' : categories.find(c => c.id === selectedCategory)?.name ?? 'Menu'}
            </h2>
            <p style={{ fontSize:14, color:'#9E7B6D', marginTop:5 }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} {searchQuery ? `for "${searchQuery}"` : 'available'}
            </p>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div style={{
            textAlign:'center', padding:'80px 24px',
            background:'rgba(232,220,203,0.25)', borderRadius:24,
            border:'1px solid rgba(93,64,55,0.08)',
          }}>
            <div style={{ fontSize:48, marginBottom:16 }}>☕</div>
            <p style={{ fontFamily:'"Playfair Display",serif', fontSize:20, color:'#5D4037', marginBottom:8 }}>Nothing found</p>
            <p style={{ fontSize:14, color:'#9E7B6D' }}>Try a different search or browse a different category</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              style={{ marginTop:20, padding:'10px 24px', borderRadius:12, background:'linear-gradient(135deg,#3E2723,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'Inter,sans-serif' }}
            >
              Clear filters
            </button>
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

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer style={{
        background:'linear-gradient(160deg,#1C0F0A,#2B1810)',
        padding:'64px clamp(20px,4vw,60px) 40px',
        color:'rgba(255,255,255,0.65)',
      }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:48 }}>

            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#3E2723,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 12px rgba(43,24,16,0.4)' }}>
                  <Coffee size={20} color="#E8DCCB" />
                </div>
                <div>
                  <div style={{ fontFamily:'"Playfair Display",serif', fontSize:18, fontWeight:700, color:'#FAF8F5' }}>CaféConnect</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Artisan Coffee</div>
                </div>
              </div>
              <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.5)', lineHeight:1.75, maxWidth:280, marginBottom:24 }}>
                Premium artisan coffee, fresh-baked goods, and gourmet snacks crafted with care and delivered to your door.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                {['📸', '📘', '💼'].map((icon, i) => (
                  <div key={i} style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:15, transition:'all 0.2s' }}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Menu */}
            <div>
              <h4 style={{ fontFamily:'"Playfair Display",serif', fontSize:14, fontWeight:700, color:'#FAF8F5', marginBottom:18, letterSpacing:'-0.01em' }}>Menu</h4>
              {['Coffee', 'Cold Drinks', 'Snacks', 'Desserts', 'Specials'].map(item => (
                <button key={item} onClick={() => {}} style={{ display:'block', background:'none', border:'none', padding:'5px 0', fontSize:13, color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.9)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.5)'; }}
                >{item}</button>
              ))}
            </div>

            {/* Support */}
            <div>
              <h4 style={{ fontFamily:'"Playfair Display",serif', fontSize:14, fontWeight:700, color:'#FAF8F5', marginBottom:18, letterSpacing:'-0.01em' }}>Support</h4>
              {['My Orders', 'Track Delivery', 'Help Center', 'Contact Us', 'Feedback'].map(item => (
                <button key={item} onClick={() => {}} style={{ display:'block', background:'none', border:'none', padding:'5px 0', fontSize:13, color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.9)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.5)'; }}
                >{item}</button>
              ))}
            </div>

            {/* Newsletter */}
            <div>
              <h4 style={{ fontFamily:'"Playfair Display",serif', fontSize:14, fontWeight:700, color:'#FAF8F5', marginBottom:18, letterSpacing:'-0.01em' }}>Stay Updated</h4>
              <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.45)', lineHeight:1.65, marginBottom:14 }}>Get the latest offers and seasonal specials.</p>
              <div style={{ display:'flex', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:12, overflow:'hidden' }}>
                <input
                  type="email" placeholder="your@email.com"
                  style={{ flex:1, background:'transparent', border:'none', outline:'none', padding:'11px 14px', fontSize:13, color:'#FAF8F5', fontFamily:'Inter,sans-serif' }}
                />
                <button style={{ padding:'11px 14px', background:'linear-gradient(135deg,#B57A3C,#C9964A)', border:'none', cursor:'pointer', color:'#FAF8F5', fontSize:12, fontWeight:600, fontFamily:'Inter,sans-serif' }}>
                  Join
                </button>
              </div>
              {/* App download */}
              <div style={{ marginTop:20 }}>
                <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.35)', marginBottom:10, letterSpacing:'0.06em', textTransform:'uppercase' }}>Download App</p>
                <div style={{ display:'flex', gap:8 }}>
                  {['App Store', 'Google Play'].map(s => (
                    <div key={s} style={{ padding:'7px 12px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', fontSize:11, color:'rgba(255,255,255,0.6)', cursor:'pointer', transition:'all 0.2s' }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>
              © 2024 CaféConnect · Premium Café Experience
            </p>
            <div style={{ display:'flex', gap:20 }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
                <button key={item} style={{ background:'none', border:'none', fontSize:12, color:'rgba(255,255,255,0.3)', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.3)'; }}
                >{item}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════
          FLOATING CART BAR
      ══════════════════════════════════════════════════ */}
      {getItemCount() > 0 && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          zIndex:200, width:'calc(100% - 48px)', maxWidth:540,
          animation:'slideUp 0.35s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <button
            onClick={() => router.push('/cart')}
            style={{
              width:'100%',
              background:'linear-gradient(135deg,#1C0F0A,#3E2723)',
              color:'#FAF8F5', borderRadius:20, padding:'15px 22px',
              border:'1px solid rgba(255,255,255,0.1)',
              display:'flex', alignItems:'center', gap:14,
              cursor:'pointer', boxShadow:'0 10px 48px rgba(43,24,16,0.55)',
              transition:'transform 0.2s',
              fontFamily:'Inter,sans-serif',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; }}
          >
            <span style={{ background:'rgba(255,255,255,0.14)', width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 }}>
              {getItemCount()}
            </span>
            <span style={{ flex:1, fontSize:14, fontWeight:600, textAlign:'left' }}>View your bag</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontFamily:'"Playfair Display",serif', fontSize:17, fontWeight:700 }}>₹{getTotalPrice()}</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
            </div>
          </button>
        </div>
      )}

      <style>{`
        input::placeholder{color:rgba(255,255,255,0.4);}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-12px) rotate(4deg)}66%{transform:translateY(-6px) rotate(-3deg)}}
        ::-webkit-scrollbar{height:4px;background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(93,64,55,0.2);border-radius:4px}
      `}</style>
    </div>
  );
}

// ─── Menu Card Component ───────────────────────────────────────────────────────
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
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;

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
        boxShadow: hovered && isAvailable
          ? '0 20px 50px rgba(43,24,16,0.16)'
          : '0 2px 14px rgba(43,24,16,0.07)',
        border:'1px solid rgba(93,64,55,0.07)',
      }}
    >
      {/* Image area */}
      <div style={{
        height:190, background:catMeta.gradient,
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl} alt={name}
            style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ textAlign:'center' }}>
            <span style={{ fontSize:64, filter:'drop-shadow(0 6px 12px rgba(0,0,0,0.35))', display:'block' }}>{catMeta.emoji}</span>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:'linear-gradient(transparent, rgba(0,0,0,0.28))', pointerEvents:'none' }}/>

        {/* Badges top-left */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:6 }}>
          {isSpecial && (
            <span style={{ background:'linear-gradient(135deg,#B57A3C,#D4AF37)', color:'#FAF8F5', fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, letterSpacing:'0.06em' }}>
              ✦ TODAY'S SPECIAL
            </span>
          )}
          {discount && (
            <span style={{ background:'rgba(43,24,16,0.82)', backdropFilter:'blur(8px)', color:'#FAF8F5', fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:8, letterSpacing:'0.04em' }}>
              {discount}% OFF
            </span>
          )}
          {!isAvailable && (
            <span style={{ background:'rgba(0,0,0,0.68)', backdropFilter:'blur(8px)', color:'rgba(255,255,255,0.8)', fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:8 }}>
              SOLD OUT
            </span>
          )}
        </div>

        {/* Heart */}
        <button
          onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
          style={{
            position:'absolute', top:10, right:10,
            width:34, height:34, borderRadius:10,
            background: liked ? 'rgba(169,68,66,0.9)' : 'rgba(250,248,245,0.88)',
            backdropFilter:'blur(8px)',
            border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            transform: liked ? 'scale(1.12)' : 'scale(1)',
          }}
        >
          <Heart size={15} color={liked ? '#FAF8F5' : '#9E7B6D'} fill={liked ? '#FAF8F5' : 'none'} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding:'17px 18px 18px' }}>

        {/* Category badge */}
        <div style={{ marginBottom:8 }}>
          <span style={{ background:'rgba(232,220,203,0.6)', color:'#6D4C41', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:6, letterSpacing:'0.05em', textTransform:'uppercase' }}>
            {categoryName}
          </span>
        </div>

        <h3 style={{ fontFamily:'"Playfair Display",serif', fontSize:17, fontWeight:700, color:'#2B1810', lineHeight:1.3, marginBottom:6 }}>
          {name}
        </h3>

        {description && (
          <p style={{
            fontSize:12.5, color:'#9E7B6D', lineHeight:1.6, marginBottom:12,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden',
          }}>
            {description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#9E7B6D' }}>
            <Star size={11} fill="#D4AF37" color="#D4AF37" />
            4.{Math.floor(id.charCodeAt(id.length - 1) % 3) + 7}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#9E7B6D' }}>
            <Clock size={11} />
            15–20 min
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#4F7A54' }}>
            <Leaf size={11} color="#4F7A54" />
            Fresh
          </span>
        </div>

        {/* Price + Add button */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <span style={{ fontFamily:'"Playfair Display",serif', fontSize:20, fontWeight:700, color:'#2B1810' }}>
              ₹{price}
            </span>
            {originalPrice && originalPrice > price && (
              <span style={{ fontSize:12.5, color:'#B0998B', textDecoration:'line-through', marginLeft:6 }}>
                ₹{originalPrice}
              </span>
            )}
          </div>

          {isAvailable && (
            <button
              onClick={e => { e.stopPropagation(); onOpen(); }}
              style={{
                padding:'9px 18px', borderRadius:12,
                background: hovered ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'linear-gradient(135deg,#3E2723,#6D4C41)',
                color:'#FAF8F5', fontSize:13, fontWeight:600,
                border:'none', cursor:'pointer', transition:'all 0.25s',
                display:'flex', alignItems:'center', gap:5,
                boxShadow: hovered ? '0 4px 16px rgba(43,24,16,0.3)' : 'none',
              }}
            >
              Add +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
