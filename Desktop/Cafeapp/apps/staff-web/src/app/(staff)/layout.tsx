'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { Coffee, LayoutDashboard, ClipboardList, UtensilsCrossed, LogOut, ChevronRight, Sparkles, Receipt, ShieldAlert } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',        label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/orders',           label: 'Orders',     icon: ClipboardList },
  { href: '/menu',             label: 'Menu',       icon: UtensilsCrossed },
  { href: '/menu/specials',    label: 'Specials',   icon: Sparkles },
  { href: '/billing',          label: 'Billing',    icon: Receipt },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !isAuthenticated()) router.push('/login');
  }, [mounted, isAuthenticated, router]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  if (!mounted || !isAuthenticated()) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', display: 'flex' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: 240,
        background: 'linear-gradient(175deg,#1C0F0A 0%,#2B1810 45%,#3E2723 100%)',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
      }}>

        {/* Logo */}
        <div style={{ padding: '28px 22px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg,#B57A3C,#C9964A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(181,122,60,0.4)', flexShrink: 0,
            }}>
              <Coffee size={19} color="#FAF8F5" />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#FAF8F5', letterSpacing: '-0.02em' }}>
                CaféConnect
              </div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3 }}>
                Staff Panel
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {[
            ...NAV_ITEMS,
            ...(user?.role === 'SUPER_ADMIN'
              ? [{ href: '/admin', label: 'Admin Control', icon: ShieldAlert }]
              : []),
          ].map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12,
                  background: active ? 'rgba(181,122,60,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(181,122,60,0.3)' : '1px solid transparent',
                  color: active ? '#D7C5AE' : 'rgba(255,255,255,0.55)',
                  fontSize: 13.5, fontWeight: active ? 600 : 400,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.85)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.55)'; } }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={13} style={{ opacity: 0.6 }} />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '16px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding: '10px 14px', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FAF8F5' }}>{user?.name || user?.email}</div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'rgba(181,122,60,0.2)', color: '#D4AF37',
              borderRadius: 6, padding: '2px 7px',
            }}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(169,68,66,0.12)', border: '1px solid rgba(169,68,66,0.2)',
              color: '#F08080', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: 'Inter,sans-serif',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.12)'; }}
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', padding: '36px 40px' }}>
        {children}
      </main>

    </div>
  );
}

// Made with Bob
