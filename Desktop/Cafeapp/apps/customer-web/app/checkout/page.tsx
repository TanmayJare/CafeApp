'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import { ArrowLeft, MapPin, CreditCard, Banknote, ChevronRight, Check, Plus, Coffee, Shield } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  deliveryZone: string;
  deliveryFee: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, getTotal, clearCart } = useCartStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    if (items.length === 0) { router.push('/cart'); return; }
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('/address');
      setAddresses(response.data);
      const def = response.data.find((a: Address) => a.isDefault);
      if (def) setSelectedAddress(def.id);
    } catch (e) {
      console.error('Failed to fetch addresses:', e);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAddressDetails = () => addresses.find(a => a.id === selectedAddress);

  const calculateTotal = () => {
    const subtotal = getTotal();
    const deliveryFee = getSelectedAddressDetails()?.deliveryFee ?? 0;
    return subtotal + deliveryFee;
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError('Please select a delivery address'); return; }
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/orders', {
        addressId: selectedAddress,
        paymentMethod,
        items: items.map(item => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
      });
      clearCart();
      router.push(`/orders/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF8F5' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ position:'relative', width:56, height:56, margin:'0 auto 20px' }}>
            <div style={{ width:56, height:56, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Coffee size={20} color="#B57A3C" /></div>
          </div>
          <p style={{ fontFamily:'"Playfair Display",serif', fontSize:16, color:'#5D4037', fontWeight:600 }}>Loading checkout…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
          onClick={() => router.push('/cart')}
          style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', borderRadius:12, padding:'8px 16px', cursor:'pointer', fontSize:13.5, fontWeight:500, color:'#5D4037', transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.85)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
        >
          <ArrowLeft size={15}/> Back to bag
        </button>

        <div style={{ textAlign:'center' }}>
          <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:19, fontWeight:700, color:'#2B1810' }}>Checkout</h1>
        </div>

        {/* Progress pills */}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          {['Address', 'Payment', 'Confirm'].map((step, i) => (
            <div key={step} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{
                padding:'5px 12px', borderRadius:20,
                background: i === 0 ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(93,64,55,0.09)',
                color: i === 0 ? '#FAF8F5' : '#B0998B',
                fontSize:10.5, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase',
              }}>{step}</span>
              {i < 2 && <ChevronRight size={11} color="#C4B0A3"/>}
            </div>
          ))}
        </div>
      </header>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'36px clamp(16px,4vw,40px) 120px', display:'grid', gridTemplateColumns:'1fr 360px', gap:28 }}>

        {/* ── Left Column ── */}
        <div>

          {/* Delivery Address */}
          <Section title="Delivery Address" action={
            <button
              onClick={() => router.push('/addresses/new')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, background:'rgba(232,220,203,0.5)', border:'1px solid rgba(93,64,55,0.18)', color:'#5D4037', fontSize:12.5, fontWeight:600, cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.85)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)'; }}
            >
              <Plus size={12}/> New address
            </button>
          }>
            {addresses.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 24px', background:'rgba(232,220,203,0.2)', borderRadius:18, border:'1.5px dashed rgba(93,64,55,0.2)' }}>
                <div style={{ width:52, height:52, borderRadius:16, background:'rgba(232,220,203,0.5)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                  <MapPin size={22} color="#B0998B"/>
                </div>
                <p style={{ fontFamily:'"Playfair Display",serif', fontSize:16, color:'#5D4037', fontWeight:600, marginBottom:6 }}>No saved addresses</p>
                <p style={{ fontSize:13, color:'#9E7B6D', marginBottom:20 }}>Add a delivery address to continue</p>
                <button
                  onClick={() => router.push('/addresses/new')}
                  style={{ padding:'11px 26px', borderRadius:12, background:'linear-gradient(135deg,#3E2723,#5D4037)', color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'Inter,sans-serif', boxShadow:'0 4px 16px rgba(43,24,16,0.25)' }}
                >
                  Add your first address
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {addresses.map(address => {
                  const active = selectedAddress === address.id;
                  return (
                    <label
                      key={address.id}
                      style={{ display:'block', padding:'16px 18px', borderRadius:16, cursor:'pointer', background: active ? 'rgba(62,39,35,0.04)' : '#FFFFFF', border: active ? '1.5px solid rgba(93,64,55,0.45)' : '1.5px solid rgba(93,64,55,0.12)', transition:'all 0.22s', boxShadow: active ? '0 4px 16px rgba(43,24,16,0.1)' : '0 2px 8px rgba(43,24,16,0.04)' }}
                    >
                      <input type="radio" name="address" value={address.id} checked={active} onChange={e => setSelectedAddress(e.target.value)} style={{ display:'none' }} />
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', gap:12, flex:1 }}>
                          <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background: active ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(232,220,203,0.5)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                            <MapPin size={16} color={active ? '#FAF8F5' : '#9E7B6D'}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                              <span style={{ fontSize:14, fontWeight:700, color:'#2B1810' }}>{address.label}</span>
                              {address.isDefault && <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(181,122,60,0.12)', color:'#B57A3C', fontSize:10, fontWeight:700, letterSpacing:'0.04em' }}>DEFAULT</span>}
                            </div>
                            <p style={{ fontSize:13, color:'#6D4C41', lineHeight:1.5 }}>
                              {address.addressLine1}{address.addressLine2 && `, ${address.addressLine2}`}
                            </p>
                            <p style={{ fontSize:12.5, color:'#9E7B6D' }}>{address.city}, {address.state} — {address.pincode}</p>
                            <p style={{ fontSize:12, color:'#B57A3C', marginTop:5, fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
                              <span>📍</span>{address.deliveryZone} Zone · ₹{address.deliveryFee} delivery
                            </p>
                          </div>
                        </div>
                        {active && (
                          <div style={{ width:24, height:24, borderRadius:8, flexShrink:0, background:'linear-gradient(135deg,#2B1810,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Check size={13} color="#FAF8F5"/>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Payment Method */}
          <Section title="Payment Method">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { id:'COD',    icon:Banknote,    label:'Cash on Delivery', sub:'Pay when your order arrives',    available:true  },
                { id:'ONLINE', icon:CreditCard,  label:'Online Payment',   sub:'Coming soon — Razorpay',         available:false },
              ].map(({ id, icon:Icon, label, sub, available }) => {
                const active = paymentMethod === id;
                return (
                  <label
                    key={id}
                    style={{ display:'block', padding:'16px 18px', borderRadius:16, cursor: available ? 'pointer' : 'not-allowed', background: active ? 'rgba(62,39,35,0.04)' : '#FFFFFF', border: active ? '1.5px solid rgba(93,64,55,0.45)' : '1.5px solid rgba(93,64,55,0.12)', opacity: available ? 1 : 0.5, transition:'all 0.22s', boxShadow: active ? '0 4px 16px rgba(43,24,16,0.1)' : '0 2px 8px rgba(43,24,16,0.04)' }}
                  >
                    <input type="radio" name="payment" value={id} checked={active} disabled={!available} onChange={e => setPaymentMethod(e.target.value as 'COD' | 'ONLINE')} style={{ display:'none' }} />
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                        <div style={{ width:42, height:42, borderRadius:13, background: active ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(232,220,203,0.5)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                          <Icon size={18} color={active ? '#FAF8F5' : '#9E7B6D'}/>
                        </div>
                        <div>
                          <p style={{ fontSize:14, fontWeight:700, color:'#2B1810', marginBottom:2 }}>{label}</p>
                          <p style={{ fontSize:12, color:'#9E7B6D' }}>{sub}</p>
                        </div>
                      </div>
                      {active && <div style={{ width:24, height:24, borderRadius:8, background:'linear-gradient(135deg,#2B1810,#5D4037)', display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={13} color="#FAF8F5"/></div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </Section>
        </div>

        {/* ── Right Column — Order Summary ── */}
        <div>
          <div style={{ background:'#FFFFFF', borderRadius:22, border:'1px solid rgba(93,64,55,0.1)', padding:'24px', position:'sticky', top:84, boxShadow:'0 4px 24px rgba(43,24,16,0.08)' }}>
            <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:18, fontWeight:700, color:'#2B1810', marginBottom:20 }}>
              Order Summary
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              {items.map(item => (
                <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13.5, fontWeight:500, color:'#2B1810', marginBottom:2 }}>{item.name}</p>
                    <p style={{ fontSize:12, color:'#B0998B' }}>× {item.quantity}</p>
                  </div>
                  <span style={{ fontSize:13.5, fontWeight:700, color:'#2B1810', flexShrink:0 }}>₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop:'1px solid rgba(93,64,55,0.09)', paddingTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, color:'#9E7B6D' }}>Subtotal</span>
                <span style={{ fontSize:13, color:'#2B1810', fontWeight:500 }}>₹{getTotal().toFixed(0)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ fontSize:13, color:'#9E7B6D' }}>Delivery</span>
                <span style={{ fontSize:13, color:'#2B1810', fontWeight:500 }}>
                  {(getSelectedAddressDetails()?.deliveryFee ?? 0) === 0
                    ? <span style={{ color:'#4F7A54', fontWeight:700 }}>Free 🎉</span>
                    : `₹${getSelectedAddressDetails()?.deliveryFee}`}
                </span>
              </div>
              <div style={{ borderTop:'1px solid rgba(93,64,55,0.09)', paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'"Playfair Display",serif', fontSize:16, fontWeight:700, color:'#2B1810' }}>Total</span>
                <span style={{ fontFamily:'"Playfair Display",serif', fontSize:24, fontWeight:700, color:'#2B1810' }}>₹{calculateTotal().toFixed(0)}</span>
              </div>
            </div>

            {error && (
              <div style={{ marginTop:16, background:'rgba(169,68,66,0.08)', border:'1px solid rgba(169,68,66,0.25)', color:'#A94442', padding:'12px 14px', borderRadius:12, fontSize:13, lineHeight:1.5 }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddress || addresses.length === 0}
              style={{
                width:'100%', marginTop:20, padding:'16px 24px', borderRadius:16,
                background: (submitting || !selectedAddress || addresses.length === 0)
                  ? 'rgba(93,64,55,0.3)'
                  : 'linear-gradient(135deg,#2B1810,#5D4037)',
                color:'#FAF8F5', fontSize:15, fontWeight:700, border:'none',
                cursor: (submitting || !selectedAddress || addresses.length === 0) ? 'not-allowed' : 'pointer',
                transition:'all 0.25s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: (!submitting && selectedAddress) ? '0 6px 24px rgba(43,24,16,0.3)' : 'none',
                fontFamily:'"Playfair Display",serif',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e => { if (!submitting && selectedAddress) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 32px rgba(43,24,16,0.4)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow=(!submitting && selectedAddress) ? '0 6px 24px rgba(43,24,16,0.3)' : 'none'; }}
            >
              {submitting ? (
                <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#FAF8F5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Placing order…</>
              ) : (
                <><Shield size={16}/> Place order · ₹{calculateTotal().toFixed(0)}</>
              )}
            </button>

            <p style={{ textAlign:'center', fontSize:11.5, color:'#B0998B', marginTop:12, lineHeight:1.5 }}>
              🔒 Secure checkout · By placing your order you agree to our terms
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:18, fontWeight:700, color:'#2B1810' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
