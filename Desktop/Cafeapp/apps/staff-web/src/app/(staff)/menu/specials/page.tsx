'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { menuApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { SpecialSheet } from './sheet';
import { GripVertical, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
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

/* ─── Formatting helpers ──────────────────────────────────────────────────── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ─── Sortable card ───────────────────────────────────────────────────────── */
function SpecialCard({
  special,
  onEdit,
  onDelete,
  onToggle,
}: {
  special: Special;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: special.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : special.isActive ? 1 : 0.55,
    background: '#FFFFFF',
    borderRadius: 14,
    border: `1px solid ${special.isActive ? 'rgba(93,64,55,0.1)' : 'rgba(93,64,55,0.05)'}`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    marginBottom: 8,
  };

  const isLive = new Date() >= new Date(special.availableFrom) && new Date() <= new Date(special.availableUntil);

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: '#B0998B', flexShrink: 0 }}>
        <GripVertical size={16} />
      </div>

      {/* Badge chip */}
      {special.badgeText && (
        <div style={{
          background: '#3E2723', color: '#FAF8F5',
          borderRadius: 20, padding: '3px 9px', fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {special.badgeText}
        </div>
      )}

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: '#2B1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {special.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {special.originalPrice != null && (
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#B0998B', textDecoration: 'line-through' }}>
              ₹{special.originalPrice}
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#2B1810' }}>
            ₹{special.discountedPrice}
          </span>
          <span style={{ fontSize: 11.5, color: '#B0998B' }}>
            {fmtDate(special.availableFrom)} {fmtTime(special.availableFrom)} – {fmtTime(special.availableUntil)}
          </span>
        </div>
      </div>

      {/* Live / availability dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isLive && special.isActive ? '#6DBF7E' : '#E8DCCB',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 11, color: '#B0998B' }}>
          {isLive && special.isActive ? 'Live' : special.isActive ? 'Scheduled' : 'Off'}
        </span>
      </div>

      {/* Active toggle */}
      <button
        type="button"
        onClick={onToggle}
        title={special.isActive ? 'Deactivate' : 'Activate'}
        style={{
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: special.isActive ? '#6DBF7E' : '#E8DCCB', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          left: special.isActive ? 18 : 2,
        }} />
      </button>

      {/* Edit */}
      <button onClick={onEdit} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid rgba(93,64,55,0.18)', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Pencil size={13} color="#5D4037" />
      </button>

      {/* Delete */}
      <button onClick={onDelete} style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid rgba(169,68,66,0.2)', background: 'rgba(169,68,66,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Trash2 size={13} color="#A94442" />
      </button>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function SpecialsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Special | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(async () => {
    try {
      const r = await menuApi.getSpecials();
      setSpecials(r.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // 34B.4 — subscribe to specials socket updates
  useSocket(accessToken, {
    'menu:specials_updated': () => load(),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = specials.findIndex((s) => s.id === active.id);
    const newIdx = specials.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(specials, oldIdx, newIdx).map((s, i) => ({
      ...s,
      sortOrder: i,
    }));

    // Optimistic update
    setSpecials(reordered);

    // Persist to API
    try {
      await menuApi.reorderSpecials(reordered.map((s) => ({ id: s.id, sortOrder: s.sortOrder })));
    } catch {
      load(); // rollback on error
    }
  };

  const handleToggle = async (special: Special) => {
    // Optimistic
    setSpecials((prev) =>
      prev.map((s) => (s.id === special.id ? { ...s, isActive: !s.isActive } : s)),
    );
    try {
      await menuApi.updateSpecial(special.id, { isActive: !special.isActive });
    } catch {
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this special? This cannot be undone.')) return;
    setSpecials((prev) => prev.filter((s) => s.id !== id));
    try {
      await menuApi.deleteSpecial(id);
    } catch {
      load();
    }
  };

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (s: Special) => { setEditing(s); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditing(null); };
  const onSaved = () => { closeSheet(); load(); };

  const activeCount = specials.filter((s) => s.isActive).length;

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: '#2B1810' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color="#B57A3C" />
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 700, color: '#2B1810', letterSpacing: '-0.025em' }}>
              Daily Specials
            </h1>
          </div>
          <p style={{ fontSize: 13.5, color: '#9E7B6D' }}>
            {activeCount} active · Updates live on the customer app within 2s
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg,#2B1810,#5D4037)',
            color: '#FAF8F5', border: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600, fontFamily: 'Inter,sans-serif',
            boxShadow: '0 3px 14px rgba(43,24,16,0.25)',
          }}
        >
          <Plus size={15} /> Add special
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#9E7B6D', fontSize: 14 }}>
          <div style={{ width: 32, height: 32, border: '2.5px solid #E8DCCB', borderTopColor: '#3E2723', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        </div>
      ) : specials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 24px', background: '#FFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.08)' }}>
          <Sparkles size={40} color="#E8DCCB" style={{ margin: '0 auto 14px' }} />
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, color: '#5D4037', marginBottom: 6 }}>No specials yet</p>
          <p style={{ fontSize: 13, color: '#9E7B6D', marginBottom: 20 }}>Add a special and it'll appear on the customer home screen within 2s</p>
          <button
            onClick={openAdd}
            style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#2B1810,#5D4037)', color: '#FAF8F5', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}
          >
            Add your first special
          </button>
        </div>
      ) : (
        <div style={{ background: '#FFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.08)', padding: '16px 16px 8px', boxShadow: '0 2px 12px rgba(43,24,16,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B57A3C', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: 4, marginBottom: 12 }}>
            Drag to reorder · {specials.length} special{specials.length !== 1 ? 's' : ''}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={specials.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {specials.map((s) => (
                <SpecialCard
                  key={s.id}
                  special={s}
                  onEdit={() => openEdit(s)}
                  onDelete={() => handleDelete(s.id)}
                  onToggle={() => handleToggle(s)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Sheet */}
      {sheetOpen && (
        <SpecialSheet
          special={editing}
          onClose={closeSheet}
          onSaved={onSaved}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
