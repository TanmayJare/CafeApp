'use client';

/**
 * KOT Modal — 38B.2
 * A5/thermal-optimised kitchen order ticket with QR code.
 * Print button triggers window.print() with print-only CSS that hides all UI chrome.
 */
import { useState } from 'react';
import { api } from '@/lib/api';

interface KOTData {
  qrCodeBase64: string;
  orderNumber: string;
  issuedAt: string;
  expiresAt: string;
  items: { name: string; quantity: number; options: { name: string }[] }[];
  customer: { name: string | null; email: string; phone: string | null };
  address: {
    type?: string;
    tower?: string | null; wing?: string | null; floor?: string | null; flatNumber?: string | null;
    addressLine?: string | null; societyName?: string | null;
  };
  total: number;
}

interface Props {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}

function formatKotAddress(addr: KOTData['address']): string {
  if (!addr) return '';
  if (addr.type === 'SOCIETY') {
    return [addr.flatNumber, addr.floor ? `Floor ${addr.floor}` : null, addr.wing ? `${addr.wing}-Wing` : null, addr.tower, addr.societyName].filter(Boolean).join(', ');
  }
  return addr.addressLine ?? '';
}

export function KOTModal({ orderId, orderNumber, onClose }: Props) {
  const [kot, setKot] = useState<KOTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch on mount
  useState(() => {
    api.get(`/orders/${orderId}/kot`)
      .then((r) => { setKot(r.data); setLoading(false); })
      .catch(() => { setError('Could not load KOT data.'); setLoading(false); });
  });

  const handlePrint = () => window.print();

  return (
    <>
      {/* Modal backdrop — hidden when printing */}
      <div className="kot-backdrop" style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div className="kot-modal" style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          padding: 0,
        }}>
          {/* Modal header (screen-only) */}
          <div className="kot-screen-only" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 14px',
            borderBottom: '1px solid rgba(93,64,55,0.12)',
          }}>
            <div style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: '#2B1810' }}>
              KOT — #{orderNumber}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handlePrint} style={{
                background: 'linear-gradient(135deg,#2B1810,#5D4037)', color: '#FAF8F5',
                border: 'none', borderRadius: 10, padding: '8px 18px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter,sans-serif',
              }}>
                🖨 Print KOT
              </button>
              <button onClick={onClose} style={{
                background: 'rgba(93,64,55,0.08)', border: 'none', borderRadius: 10,
                padding: '8px 14px', fontSize: 13, color: '#5D4037', cursor: 'pointer',
              }}>
                ✕
              </button>
            </div>
          </div>

          {/* KOT body */}
          <div id="kot-print-area" style={{ padding: '20px 22px 24px' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E7B6D' }}>
                <div style={{ width: 32, height: 32, border: '2.5px solid #E8DCCB', borderTopColor: '#3E2723', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 14px' }} />
                Loading KOT…
              </div>
            )}
            {error && <p style={{ color: '#A94442', fontFamily: 'Inter,sans-serif', textAlign: 'center', padding: 24 }}>{error}</p>}

            {kot && !loading && (
              <>
                {/* CaféConnect header */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: '#2B1810' }}>CaféConnect</div>
                  <div style={{ fontSize: 11, color: '#9E7B6D', marginTop: 2 }}>Kitchen Order Ticket</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#B57A3C', marginTop: 4 }}>KOT-{kot.orderNumber}</div>
                  <div style={{ fontSize: 11, color: '#9E7B6D', marginTop: 2 }}>
                    {new Date(kot.issuedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px dashed rgba(93,64,55,0.3)', marginBottom: 14 }} />

                {/* Items (qty + name, no prices) */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B57A3C', marginBottom: 8 }}>Items</div>
                  {kot.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 24, fontWeight: 800, fontSize: 14, color: '#2B1810', flexShrink: 0 }}>{item.quantity}×</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#2B1810' }}>{item.name}</div>
                        {item.options?.length > 0 && (
                          <div style={{ fontSize: 11, color: '#9E7B6D' }}>{item.options.map((o: any) => o.name || o).join(', ')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px dashed rgba(93,64,55,0.3)', marginBottom: 14 }} />

                {/* Delivery */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B57A3C', marginBottom: 6 }}>Deliver to</div>
                  <div style={{ fontSize: 12, color: '#2B1810', fontWeight: 600 }}>{kot.customer.name || kot.customer.email}</div>
                  {kot.customer.phone && <div style={{ fontSize: 11, color: '#9E7B6D' }}>{kot.customer.phone}</div>}
                  <div style={{ fontSize: 12, color: '#5D4037', marginTop: 4 }}>{formatKotAddress(kot.address)}</div>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1.5px solid rgba(93,64,55,0.2)', borderBottom: '1.5px solid rgba(93,64,55,0.2)', marginBottom: 18 }}>
                  <span style={{ fontFamily: '"Playfair Display",serif', fontWeight: 700, fontSize: 14 }}>Total</span>
                  <span style={{ fontFamily: '"Playfair Display",serif', fontWeight: 700, fontSize: 15, color: '#B57A3C' }}>₹{kot.total.toFixed(2)}</span>
                </div>

                {/* QR Code */}
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={`data:image/png;base64,${kot.qrCodeBase64}`}
                    alt="KOT QR Code"
                    style={{ width: 200, height: 200, display: 'block', margin: '0 auto 8px' }}
                  />
                  <div style={{ fontSize: 10, color: '#9E7B6D', maxWidth: 200, margin: '0 auto', lineHeight: 1.5 }}>
                    Scan to mark <strong>OUT FOR DELIVERY</strong> when rider picks up
                  </div>
                  <div style={{ fontSize: 9, color: '#C4B5AC', marginTop: 4 }}>
                    Expires: {new Date(kot.expiresAt).toLocaleString('en-IN', { timeStyle: 'short' })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Made with Bob
