'use client';

import { useState, useEffect } from 'react';
import { menuApi } from '@/lib/api';

interface Special {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  badgeText?: string | null;
  originalPrice?: number | null;
  discountedPrice: number;
  linkedMenuItemId?: string | null;
  availableFrom: string;
  availableUntil: string;
  isActive: boolean;
  sortOrder: number;
}

interface Props {
  special?: Special | null; // null = add mode, Special = edit mode
  onClose: () => void;
  onSaved: () => void;
}

const input: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid rgba(93,64,55,0.2)', borderRadius: 10,
  background: '#FAF8F5', fontSize: 13.5, color: '#2B1810',
  fontFamily: 'Inter,sans-serif', outline: 'none',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#5D4037', marginBottom: 5, letterSpacing: '0.02em',
};

function toLocalDatetime(iso: string): string {
  // Converts ISO UTC to YYYY-MM-DDTHH:mm for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayAt(h: number, m = 0): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SpecialSheet({ special, onClose, onSaved }: Props) {
  const isEdit = !!special;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    badgeText: '',
    originalPrice: '',
    discountedPrice: '',
    linkedMenuItemId: '',
    availableFrom: todayAt(new Date().getHours()),
    availableUntil: todayAt(23, 59),
    isActive: true,
    sortOrder: '0',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    // Load menu items for the "link" dropdown
    menuApi.getItems().then((r) => setMenuItems(r.data)).catch(() => {});
    menuApi.getCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (special) {
      setForm({
        title: special.title,
        description: special.description ?? '',
        imageUrl: special.imageUrl ?? '',
        badgeText: special.badgeText ?? '',
        originalPrice: special.originalPrice != null ? String(special.originalPrice) : '',
        discountedPrice: String(special.discountedPrice),
        linkedMenuItemId: special.linkedMenuItemId ?? '',
        availableFrom: toLocalDatetime(special.availableFrom),
        availableUntil: toLocalDatetime(special.availableUntil),
        isActive: special.isActive,
        sortOrder: String(special.sortOrder),
      });
    }
  }, [special]);

  // When a menu item is linked, auto-fill imageUrl if empty
  const handleLinkChange = (menuItemId: string) => {
    setForm((f) => {
      const mi = menuItems.find((m) => m.id === menuItemId);
      return {
        ...f,
        linkedMenuItemId: menuItemId,
        imageUrl: f.imageUrl || (mi?.imageUrl ?? ''),
        title: f.title || mi?.name || '',
        discountedPrice: f.discountedPrice || (mi?.price ? String(mi.price) : ''),
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.discountedPrice || !form.availableFrom || !form.availableUntil) {
      setError('Title, discounted price, and time range are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        badgeText: form.badgeText.trim().slice(0, 20) || undefined,
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        discountedPrice: parseFloat(form.discountedPrice),
        linkedMenuItemId: form.linkedMenuItemId || undefined,
        availableFrom: new Date(form.availableFrom).toISOString(),
        availableUntil: new Date(form.availableUntil).toISOString(),
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (isEdit) {
        await menuApi.updateSpecial(special!.id, payload);
      } else {
        await menuApi.createSpecial(payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Save failed — check the form.');
    } finally {
      setSaving(false);
    }
  };

  const F = (field: keyof typeof form) => ({
    value: String(form[field]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value })),
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(43,24,16,0.45)',
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'auto',
          background: '#FAF8F5', borderRadius: '20px 20px 0 0', padding: '28px 28px 36px',
          fontFamily: 'Inter,sans-serif', color: '#2B1810',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8DCCB', margin: '0 auto 22px' }} />

        <div style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
          {isEdit ? 'Edit Special' : 'Add Special'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Link to menu item */}
          <div>
            <label style={lbl}>Link to menu item (optional — auto-fills name + image)</label>
            <select style={{ ...input, height: 40 }}
              value={form.linkedMenuItemId}
              onChange={(e) => handleLinkChange(e.target.value)}
            >
              <option value="">— No link —</option>
              {menuItems.map((mi: any) => (
                <option key={mi.id} value={mi.id}>{mi.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={lbl}>Name *</label>
            <input style={input} placeholder="e.g. Masala Chai" {...F('title')} />
          </div>

          {/* Badge text */}
          <div>
            <label style={lbl}>Badge text (max 20 chars, e.g. "Chef's pick")</label>
            <input style={input} placeholder="Chef's pick" maxLength={20} {...F('badgeText')} />
            <div style={{ fontSize: 11, color: '#B0998B', marginTop: 3 }}>
              {form.badgeText.length}/20
            </div>
          </div>

          {/* Prices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Original price (₹) — for strikethrough</label>
              <input style={input} type="number" min="0" step="0.01" placeholder="e.g. 280" {...F('originalPrice')} />
            </div>
            <div>
              <label style={lbl}>Discounted price (₹) *</label>
              <input style={input} type="number" min="0" step="0.01" placeholder="e.g. 220" {...F('discountedPrice')} />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label style={lbl}>Image URL (optional)</label>
            <input style={input} placeholder="https://..." {...F('imageUrl')} />
          </div>

          {/* Description */}
          <div>
            <label style={lbl}>Description</label>
            <textarea style={{ ...input, resize: 'vertical', minHeight: 60 } as any}
              placeholder="Short description…" {...F('description')}
            />
          </div>

          {/* Time range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Available from *</label>
              <input style={input} type="datetime-local" {...F('availableFrom')} />
            </div>
            <div>
              <label style={lbl}>Available until *</label>
              <input style={input} type="datetime-local" {...F('availableUntil')} />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: form.isActive ? '#6DBF7E' : '#E8DCCB', transition: 'background 0.2s',
                position: 'relative', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                left: form.isActive ? 23 : 3,
              }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: form.isActive ? '#4F7A54' : '#B0998B' }}>
              {form.isActive ? 'Active — visible to customers' : 'Inactive — hidden from customers'}
            </span>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(169,68,66,0.08)', border: '1px solid rgba(169,68,66,0.2)', fontSize: 13, color: '#A94442' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: 12,
              background: 'rgba(232,220,203,0.4)', border: '1.5px solid rgba(93,64,55,0.18)',
              color: '#5D4037', cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
              fontFamily: 'Inter,sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 2, padding: '11px', borderRadius: 12,
              background: saving ? 'rgba(43,24,16,0.5)' : 'linear-gradient(135deg,#2B1810,#5D4037)',
              color: '#FAF8F5', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13.5, fontWeight: 600, fontFamily: 'Inter,sans-serif',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Special'}
          </button>
        </div>
      </div>
    </div>
  );
}
