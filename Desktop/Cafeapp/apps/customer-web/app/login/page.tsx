'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Mail, ArrowRight, Coffee, Shield, Star } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.toLowerCase().trim() });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Strip any spaces / non-digits the browser may inject (letterSpacing artefacts)
    const cleanOtp = otp.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email: email.toLowerCase().trim(), code: cleanOtp });
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:'Inter,sans-serif', background:'#FAF8F5' }}>

      {/* ══════════════════════════════════════════════════
          LEFT — Brand Panel
      ══════════════════════════════════════════════════ */}
      <div style={{
        width:'45%', flexShrink:0,
        background:'linear-gradient(155deg,#1C0F0A 0%,#2B1810 40%,#3E2723 75%,#5D4037 100%)',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        padding:'48px 52px', position:'relative', overflow:'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-100, right:-100, width:420, height:420, borderRadius:'50%', background:'rgba(181,122,60,0.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, left:-50, width:300, height:300, borderRadius:'50%', background:'rgba(181,122,60,0.05)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'45%', right:'10%', width:160, height:160, borderRadius:'50%', background:'rgba(212,175,55,0.04)', pointerEvents:'none' }}/>

        {/* Floating decorations */}
        <div style={{ position:'absolute', top:120, right:60, fontSize:28, opacity:0.1, animation:'float 7s ease-in-out infinite', pointerEvents:'none' }}>☕</div>
        <div style={{ position:'absolute', bottom:160, right:40, fontSize:18, opacity:0.08, animation:'float 9s ease-in-out infinite 2s', pointerEvents:'none' }}>🫘</div>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
          <div style={{ width:42, height:42, borderRadius:13, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.16)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
            <Coffee size={21} color="#D7C5AE" />
          </div>
          <div>
            <span style={{ fontFamily:'"Playfair Display",serif', fontSize:21, fontWeight:700, color:'#FAF8F5', letterSpacing:'-0.02em', display:'block' }}>CaféConnect</span>
            <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Artisan Coffee</span>
          </div>
        </div>

        {/* Center copy */}
        <div style={{ position:'relative' }}>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(30px,3.5vw,46px)', fontWeight:700, color:'#FAF8F5', lineHeight:1.12, marginBottom:18, letterSpacing:'-0.025em' }}>
            Every cup<br />
            <span style={{ color:'#D7C5AE', fontStyle:'italic' }}>tells a story.</span>
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.75, maxWidth:320, marginBottom:36 }}>
            Artisan coffee, fresh-baked goods, and gourmet snacks — crafted with care and delivered to your door.
          </p>

          {/* Feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { icon:'☕', text:'Freshly brewed on order' },
              { icon:'🚀', text:'20–35 minute delivery' },
              { icon:'🌿', text:'Sustainably sourced ingredients' },
            ].map((f, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize:13.5, color:'rgba(255,255,255,0.65)', lineHeight:1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Rating */}
          <div style={{ marginTop:36, padding:'14px 18px', background:'rgba(255,255,255,0.06)', borderRadius:14, border:'1px solid rgba(255,255,255,0.09)', display:'inline-flex', alignItems:'center', gap:12 }}>
            <div style={{ display:'flex', gap:3 }}>
              {[1,2,3,4,5].map(n => <Star key={n} size={13} fill="#D4AF37" color="#D4AF37" />)}
            </div>
            <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)' }}>4.8 · 500+ happy customers</span>
          </div>
        </div>

        {/* Bottom tag */}
        <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.3)', letterSpacing:'0.04em', position:'relative' }}>
          © 2024 CaféConnect · Premium Café Experience
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RIGHT — Auth Form
      ══════════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Step indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:40 }}>
            <div style={{
              width:34, height:34, borderRadius:10,
              background: step === 'email' ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(79,122,84,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.3s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: step === 'email' ? '0 3px 12px rgba(43,24,16,0.25)' : 'none',
            }}>
              <Mail size={14} color={step === 'email' ? '#FAF8F5' : '#4F7A54'} />
            </div>
            <div style={{ flex:1, height:2, background:'rgba(93,64,55,0.15)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width: step === 'otp' ? '100%' : '0%', background:'linear-gradient(90deg,#B57A3C,#D4AF37)', transition:'width 0.5s ease', borderRadius:2 }}/>
            </div>
            <div style={{
              width:34, height:34, borderRadius:10,
              background: step === 'otp' ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(93,64,55,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.3s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: step === 'otp' ? '0 3px 12px rgba(43,24,16,0.25)' : 'none',
            }}>
              <Shield size={14} color={step === 'otp' ? '#FAF8F5' : '#B0998B'} />
            </div>
          </div>

          <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(26px,3.5vw,34px)', fontWeight:700, color:'#2B1810', marginBottom:8, letterSpacing:'-0.025em' }}>
            {step === 'email' ? 'Welcome back.' : 'Verify your email.'}
          </h1>
          <p style={{ fontSize:14, color:'#9E7B6D', marginBottom:36, lineHeight:1.65 }}>
            {step === 'email'
              ? "Enter your email and we'll send you a one-time code."
              : `We've sent a 6-digit code to ${email}`}
          </p>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom:22 }}>
                <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#5D4037', marginBottom:8, letterSpacing:'0.07em', textTransform:'uppercase' }}>
                  Email address
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:12, background:'#FFFFFF', border:'1.5px solid rgba(93,64,55,0.18)', borderRadius:14, padding:'13px 18px', transition:'all 0.2s' }}
                  onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor='#B57A3C'; (e.currentTarget as HTMLElement).style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)'; }}
                  onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; (e.currentTarget as HTMLElement).style.boxShadow='none'; }}
                >
                  <Mail size={16} color="#B0998B" />
                  <input
                    id="email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ background:'transparent', border:'none', outline:'none', fontSize:14, color:'#2B1810', flex:1, fontFamily:'Inter,sans-serif' }}
                  />
                </div>
              </div>

              {error && <ErrorBanner msg={error} />}

              <button
                type="submit" disabled={loading}
                style={{
                  width:'100%', padding:'15px 24px', borderRadius:14,
                  background: loading ? 'rgba(93,64,55,0.4)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
                  color:'#FAF8F5', fontSize:14, fontWeight:600, border:'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  transition:'all 0.25s', boxShadow: loading ? 'none' : '0 4px 20px rgba(43,24,16,0.3)',
                  fontFamily:'Inter,sans-serif',
                }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 28px rgba(43,24,16,0.4)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow=loading ? 'none' : '0 4px 20px rgba(43,24,16,0.3)'; }}
              >
                {loading
                  ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#FAF8F5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Sending code…</>
                  : <><span>Send verification code</span><ArrowRight size={16}/></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom:22 }}>
                <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#5D4037', marginBottom:8, letterSpacing:'0.07em', textTransform:'uppercase' }}>
                  6-digit code
                </label>
                <input
                  id="otp" type="text" inputMode="numeric" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  autoComplete="one-time-code"
                  required maxLength={6}
                  style={{
                    width:'100%', padding:'18px 24px', borderRadius:14,
                    background:'#FFFFFF', border:'1.5px solid rgba(93,64,55,0.18)',
                    fontSize:28, color:'#2B1810', outline:'none',
                    textAlign:'center', letterSpacing:'0.35em', fontWeight:700,
                    fontFamily:'"Playfair Display",serif',
                    transition:'all 0.2s', boxSizing:'border-box',
                  }}
                  onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor='#B57A3C'; (e.currentTarget as HTMLElement).style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)'; }}
                  onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; (e.currentTarget as HTMLElement).style.boxShadow='none'; }}
                />
              </div>

              {error && <ErrorBanner msg={error} />}

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button
                  type="submit" disabled={loading}
                  style={{
                    width:'100%', padding:'15px 24px', borderRadius:14,
                    background: loading ? 'rgba(93,64,55,0.4)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
                    color:'#FAF8F5', fontSize:14, fontWeight:600, border:'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    transition:'all 0.25s', boxShadow: loading ? 'none' : '0 4px 20px rgba(43,24,16,0.3)',
                    fontFamily:'Inter,sans-serif',
                  }}
                  onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 28px rgba(43,24,16,0.4)'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow=loading ? 'none' : '0 4px 20px rgba(43,24,16,0.3)'; }}
                >
                  {loading
                    ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#FAF8F5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Verifying…</>
                    : <><span>Verify & continue</span><ArrowRight size={16}/></>}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  style={{ width:'100%', padding:'12px', borderRadius:14, background:'transparent', border:'1.5px solid rgba(93,64,55,0.15)', color:'#5D4037', fontSize:13.5, fontWeight:500, cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(93,64,55,0.06)'; (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.15)'; }}
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* Footer note */}
          <p style={{ textAlign:'center', fontSize:12, color:'#B0998B', marginTop:32, lineHeight:1.6 }}>
            🔒 Secure · No password needed · Your data is safe
          </p>
        </div>
      </div>

      <style>{`
        input::placeholder{color:#C4B0A3;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-12px) rotate(4deg)}66%{transform:translateY(-6px) rotate(-3deg)}}
      `}</style>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background:'rgba(169,68,66,0.08)', border:'1px solid rgba(169,68,66,0.25)', color:'#A94442', padding:'12px 16px', borderRadius:12, fontSize:13, marginBottom:18, lineHeight:1.5 }}>
      {msg}
    </div>
  );
}
