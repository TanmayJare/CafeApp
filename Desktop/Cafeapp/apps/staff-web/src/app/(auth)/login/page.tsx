'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Coffee, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authApi.staffLogin(email, password);
      const { accessToken, refreshToken, user } = response.data;
      if (user.role !== 'STAFF' && user.role !== 'SUPER_ADMIN' && user.role !== 'RIDER') {
        setError('Access denied. Staff or rider accounts only.');
        return;
      }
      setAuth(user, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter,sans-serif' }}>

      {/* ── Left — Brand panel ──────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 44%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(155deg,#1C0F0A 0%,#2B1810 40%,#3E2723 75%,#4A2C20 100%)',
        padding: '48px 40px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', top:-80, right:-60, width:340, height:340, borderRadius:'50%', background:'rgba(181,122,60,0.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-50, left:-40, width:220, height:220, borderRadius:'50%', background:'rgba(181,122,60,0.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:90, right:48, fontSize:26, opacity:0.1, pointerEvents:'none' }}>☕</div>
        <div style={{ position:'absolute', bottom:130, right:36, fontSize:17, opacity:0.08, pointerEvents:'none' }}>🫘</div>

        <div style={{ maxWidth: 340, width: '100%', position: 'relative' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:40 }}>
            <div style={{ width:46, height:46, borderRadius:13, background:'linear-gradient(135deg,#B57A3C,#C9964A)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 18px rgba(181,122,60,0.45)' }}>
              <Coffee size={22} color="#FAF8F5" />
            </div>
            <div>
              <div style={{ fontFamily:'"Playfair Display",serif', fontSize:22, fontWeight:700, color:'#FAF8F5', letterSpacing:'-0.02em' }}>CaféConnect</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.14em', textTransform:'uppercase' }}>Staff Panel</div>
            </div>
          </div>

          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(26px,3.5vw,36px)', fontWeight:700, color:'#FAF8F5', lineHeight:1.15, marginBottom:14 }}>
            Run your café<br/>
            <span style={{ color:'#D7C5AE', fontStyle:'italic' }}>with precision.</span>
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.7, marginBottom:36 }}>
            Manage orders, control the menu, and configure daily specials — all from one place.
          </p>

          {[
            { icon:'📦', text:'Real-time order management' },
            { icon:'🍽',  text:'Full menu & category control' },
            { icon:'✨', text:'Daily specials configuration' },
          ].map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{f.icon}</div>
              <span style={{ fontSize:13.5, color:'rgba(255,255,255,0.7)' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — Auth form ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:28, fontWeight:700, color:'#2B1810', letterSpacing:'-0.025em', marginBottom:6 }}>
              Welcome back
            </h1>
            <p style={{ fontSize:14, color:'#9E7B6D' }}>Sign in to your staff account to continue</p>
          </div>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Email */}
            <div>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#5D4037', marginBottom:7, letterSpacing:'0.02em' }}>Email address</label>
              <div style={{ position:'relative' }}>
                <Mail size={15} color="#B0998B" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="staff@cafeconnect.com" required disabled={loading}
                  autoComplete="email"
                  style={{
                    width:'100%', padding:'12px 14px 12px 40px',
                    border:'1.5px solid rgba(93,64,55,0.2)', borderRadius:12,
                    background:'#FFFFFF', fontSize:14, color:'#2B1810',
                    fontFamily:'Inter,sans-serif', outline:'none',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor='#B57A3C'; e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)'; }}
                  onBlur={e =>  { e.target.style.borderColor='rgba(93,64,55,0.2)'; e.target.style.boxShadow='none'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#5D4037', marginBottom:7, letterSpacing:'0.02em' }}>Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={15} color="#B0998B" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required disabled={loading}
                  autoComplete="current-password"
                  style={{
                    width:'100%', padding:'12px 42px 12px 40px',
                    border:'1.5px solid rgba(93,64,55,0.2)', borderRadius:12,
                    background:'#FFFFFF', fontSize:14, color:'#2B1810',
                    fontFamily:'Inter,sans-serif', outline:'none',
                    transition:'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor='#B57A3C'; e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)'; }}
                  onBlur={e =>  { e.target.style.borderColor='rgba(93,64,55,0.2)'; e.target.style.boxShadow='none'; }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:2, color:'#B0998B', display:'flex', alignItems:'center' }}>
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding:'11px 14px', borderRadius:10, background:'rgba(169,68,66,0.08)', border:'1px solid rgba(169,68,66,0.2)', fontSize:13, color:'#A94442' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'13px', borderRadius:13,
                background: loading ? 'rgba(62,39,35,0.5)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
                color:'#FAF8F5', fontSize:14, fontWeight:600,
                border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'Inter,sans-serif', transition:'all 0.25s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: loading ? 'none' : '0 4px 18px rgba(43,24,16,0.3)',
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 28px rgba(43,24,16,0.4)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 18px rgba(43,24,16,0.3)'; }}
            >
              {loading
                ? <><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#FAF8F5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:24, fontSize:12, color:'#B0998B' }}>
            🔒 Staff accounts only · Contact admin to reset access
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Made with Bob
