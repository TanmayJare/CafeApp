'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, MapPin, Home, Building, Navigation } from 'lucide-react';

const LABEL_PRESETS = [
  { icon:Home,       label:'Home'   },
  { icon:Building,   label:'Office' },
  { icon:Navigation, label:'Other'  },
];

export default function NewAddressPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    label: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    isDefault: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/address', {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      });
      router.push('/checkout');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add address');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

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

        <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:19, fontWeight:700, color:'#2B1810' }}>New Address</h1>
        <div style={{ width:80 }}/>
      </header>

      <div style={{ maxWidth:660, margin:'0 auto', padding:'40px clamp(16px,4vw,40px) 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom:36, padding:'24px 28px', background:'linear-gradient(135deg,rgba(43,24,16,0.04),rgba(181,122,60,0.06))', borderRadius:20, border:'1px solid rgba(93,64,55,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#3E2723,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(43,24,16,0.25)' }}>
              <MapPin size={22} color="#E8DCCB"/>
            </div>
            <div>
              <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:22, fontWeight:700, color:'#2B1810', lineHeight:1.2 }}>Where shall we deliver?</h2>
              <p style={{ fontSize:13.5, color:'#9E7B6D', marginTop:4, lineHeight:1.5 }}>Add a delivery address to complete your order</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Label presets */}
          <div style={{ marginBottom:28 }}>
            <FieldLabel>Address Label</FieldLabel>
            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
              {LABEL_PRESETS.map(({ icon:Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, label }))}
                  style={{
                    flex:1, padding:'11px 12px', borderRadius:13, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    background: formData.label === label ? 'linear-gradient(135deg,#2B1810,#5D4037)' : '#FFFFFF',
                    border: formData.label === label ? 'none' : '1.5px solid rgba(93,64,55,0.18)',
                    color: formData.label === label ? '#FAF8F5' : '#5D4037',
                    fontSize:13, fontWeight:600, transition:'all 0.22s',
                    boxShadow: formData.label === label ? '0 4px 14px rgba(43,24,16,0.22)' : '0 2px 6px rgba(43,24,16,0.05)',
                    fontFamily:'Inter,sans-serif',
                  }}
                  onMouseEnter={e => { if (formData.label !== label) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow='0 4px 12px rgba(43,24,16,0.1)'; } }}
                  onMouseLeave={e => { if (formData.label !== label) { (e.currentTarget as HTMLElement).style.borderColor='rgba(93,64,55,0.18)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 6px rgba(43,24,16,0.05)'; } }}
                >
                  <Icon size={14}/> {label}
                </button>
              ))}
            </div>
            <StyledInput
              id="label" name="label" type="text"
              value={formData.label} onChange={handleChange}
              placeholder="Or type a custom label"
              required
            />
          </div>

          {/* Address fields */}
          <div style={{ marginBottom:20 }}>
            <FieldLabel>Address Line 1 *</FieldLabel>
            <StyledInput id="addressLine1" name="addressLine1" type="text" value={formData.addressLine1} onChange={handleChange} placeholder="Building name, street address" required />
          </div>

          <div style={{ marginBottom:20 }}>
            <FieldLabel>Address Line 2</FieldLabel>
            <StyledInput id="addressLine2" name="addressLine2" type="text" value={formData.addressLine2} onChange={handleChange} placeholder="Apartment, floor, wing (optional)" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div>
              <FieldLabel>City *</FieldLabel>
              <StyledInput id="city" name="city" type="text" value={formData.city} onChange={handleChange} placeholder="City" required />
            </div>
            <div>
              <FieldLabel>State *</FieldLabel>
              <StyledInput id="state" name="state" type="text" value={formData.state} onChange={handleChange} placeholder="State" required />
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <FieldLabel>Pincode *</FieldLabel>
            <StyledInput id="pincode" name="pincode" type="text" value={formData.pincode} onChange={handleChange} placeholder="6-digit pincode" required maxLength={6} />
          </div>

          {/* Coordinates */}
          <div style={{ background:'linear-gradient(135deg,rgba(181,122,60,0.06),rgba(212,175,55,0.04))', borderRadius:18, padding:'18px 20px', marginBottom:20, border:'1.5px solid rgba(181,122,60,0.18)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(181,122,60,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <MapPin size={14} color="#B57A3C"/>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:'#B57A3C', letterSpacing:'0.06em', textTransform:'uppercase' }}>Location Coordinates</span>
            </div>
            <p style={{ fontSize:12.5, color:'#9E7B6D', marginBottom:14, lineHeight:1.55, background:'rgba(232,220,203,0.3)', padding:'8px 12px', borderRadius:9 }}>
              💡 Test: Primary zone (3km): 28.6139, 77.2090 · Secondary (5km): 28.6300, 77.2200
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <FieldLabel>Latitude *</FieldLabel>
                <StyledInput id="latitude" name="latitude" type="number" value={formData.latitude} onChange={handleChange} placeholder="28.6139" required />
              </div>
              <div>
                <FieldLabel>Longitude *</FieldLabel>
                <StyledInput id="longitude" name="longitude" type="number" value={formData.longitude} onChange={handleChange} placeholder="77.2090" required />
              </div>
            </div>
          </div>

          {/* Default toggle */}
          <label style={{
            display:'flex', alignItems:'center', gap:14, cursor:'pointer',
            padding:'15px 18px', borderRadius:15, marginBottom:24,
            background: formData.isDefault ? 'rgba(62,39,35,0.05)' : 'rgba(232,220,203,0.25)',
            border: formData.isDefault ? '1.5px solid rgba(93,64,55,0.35)' : '1.5px solid rgba(93,64,55,0.1)',
            transition:'all 0.2s',
            boxShadow: formData.isDefault ? '0 3px 12px rgba(43,24,16,0.08)' : 'none',
          }}>
            <input id="isDefault" name="isDefault" type="checkbox" checked={formData.isDefault} onChange={handleChange} style={{ display:'none' }} />
            <div style={{
              width:24, height:24, borderRadius:8, flexShrink:0,
              background: formData.isDefault ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(93,64,55,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: formData.isDefault ? '0 2px 8px rgba(43,24,16,0.25)' : 'none',
            }}>
              {formData.isDefault && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#FAF8F5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:'#2B1810' }}>Set as default address</p>
              <p style={{ fontSize:12, color:'#9E7B6D' }}>Used automatically at checkout</p>
            </div>
          </label>

          {error && (
            <div style={{ background:'rgba(169,68,66,0.08)', border:'1px solid rgba(169,68,66,0.25)', color:'#A94442', padding:'12px 16px', borderRadius:12, fontSize:13, marginBottom:20, lineHeight:1.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width:'100%', padding:'16px 24px', borderRadius:16,
              background: loading ? 'rgba(93,64,55,0.3)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
              color:'#FAF8F5', fontSize:15, fontWeight:700, border:'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily:'"Playfair Display",serif',
              transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(43,24,16,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 32px rgba(43,24,16,0.4)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow=loading ? 'none' : '0 6px 24px rgba(43,24,16,0.3)'; }}
          >
            {loading ? (
              <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#FAF8F5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving…</>
            ) : (
              '✦ Save Address'
            )}
          </button>
        </form>
      </div>

      <style>{`
        input::placeholder{color:#C4B0A3;}
        input[type=number]{-moz-appearance:textfield;}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#5D4037', marginBottom:8, letterSpacing:'0.07em', textTransform:'uppercase' }}>
      {children}
    </label>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width:'100%', padding:'13px 16px', borderRadius:13,
        background:'#FFFFFF', outline:'none',
        border: focused ? '1.5px solid #B57A3C' : '1.5px solid rgba(93,64,55,0.16)',
        fontSize:14, color:'#2B1810', fontFamily:'Inter,sans-serif',
        transition:'all 0.2s', boxSizing:'border-box',
        boxShadow: focused ? '0 0 0 3px rgba(181,122,60,0.1)' : '0 2px 6px rgba(43,24,16,0.04)',
      }}
    />
  );
}
