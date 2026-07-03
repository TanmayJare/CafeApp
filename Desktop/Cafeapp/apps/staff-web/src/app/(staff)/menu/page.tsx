'use client';

import { useEffect, useState } from 'react';
import { menuApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, UtensilsCrossed, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Category {
  id: string; name: string; description: string | null; sortOrder: number; isActive: boolean;
}
interface MenuItem {
  id: string; name: string; description: string | null; price: number;
  isAvailable: boolean; categoryId: string; imageUrl: string | null;
  sortOrder: number; category: { id: string; name: string };
}
interface ItemForm {
  name: string; description: string; price: string;
  categoryId: string; imageUrl: string; sortOrder: number;
}

/* ─── Shared input style ──────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px',
  border:'1.5px solid rgba(93,64,55,0.2)', borderRadius:10,
  background:'#FAF8F5', fontSize:13.5, color:'#2B1810',
  fontFamily:'Inter,sans-serif', outline:'none',
  transition:'border-color 0.2s, box-shadow 0.2s',
};
const labelStyle: React.CSSProperties = {
  display:'block', fontSize:12, fontWeight:600,
  color:'#5D4037', marginBottom:6, letterSpacing:'0.02em',
};
const btnPrimary: React.CSSProperties = {
  padding:'10px 22px', borderRadius:12, background:'linear-gradient(135deg,#2B1810,#5D4037)',
  color:'#FAF8F5', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600,
  fontFamily:'Inter,sans-serif', transition:'all 0.2s', boxShadow:'0 3px 12px rgba(43,24,16,0.25)',
};
const btnGhost: React.CSSProperties = {
  padding:'10px 18px', borderRadius:12, background:'rgba(232,220,203,0.4)',
  border:'1.5px solid rgba(93,64,55,0.18)', color:'#5D4037',
  cursor:'pointer', fontSize:13.5, fontWeight:500, fontFamily:'Inter,sans-serif', transition:'all 0.2s',
};

/* ─── ItemFormFields — top-level so React never remounts it on parent re-render ── */
function ItemFormFields({
  form, setForm, categories,
}: {
  form: ItemForm;
  setForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  categories: Category[];
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="Item name"
          onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
          onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{...inputStyle, resize:'vertical', minHeight:72}} value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Short description"
          onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
          onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={labelStyle}>Price (₹) *</label>
          <input style={inputStyle} type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({...f, price:e.target.value}))} placeholder="0.00"
            onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
            onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
        </div>
        <div>
          <label style={labelStyle}>Category *</label>
          <select style={{...inputStyle, height:42}} value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId:e.target.value}))}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Image URL</label>
        <input style={inputStyle} value={form.imageUrl} onChange={e => setForm(f => ({...f, imageUrl:e.target.value}))} placeholder="https://..."
          onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
          onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
      </div>
      <div>
        <label style={labelStyle}>Sort Order</label>
        <input style={inputStyle} type="number" value={form.sortOrder} onChange={e => setForm(f => ({...f, sortOrder:parseInt(e.target.value)||0}))}
          onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
          onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [allItems,    setAllItems]    = useState<MenuItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // 34B.3 — flip availability toggle in-place when another session changes it
  useSocket(accessToken, {
    'menu:item_updated': (d: { menuItemId: string; isAvailable: boolean }) => {
      setAllItems((prev) =>
        prev.map((item) =>
          item.id === d.menuItemId ? { ...item, isAvailable: d.isAvailable } : item,
        ),
      );
    },
  });

  const [isAddCatOpen,  setIsAddCatOpen]  = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditOpen,    setIsEditOpen]    = useState(false);
  const [editingItem,   setEditingItem]   = useState<MenuItem | null>(null);

  const [catForm,  setCatForm]  = useState({ name:'', description:'', sortOrder:0 });
  const blankItem = { name:'', description:'', price:'', categoryId:'', imageUrl:'', sortOrder:0 };
  const [itemForm, setItemForm] = useState(blankItem);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, itemRes] = await Promise.all([menuApi.getCategories(), menuApi.getItems()]);
      setCategories(catRes.data.map(({ menuItems, items, ...c }: any) => c));
      setAllItems(itemRes.data);
    } catch {}
    setLoading(false);
  };

  const handleAddCat = async () => {
    if (!catForm.name.trim()) return;
    try { await menuApi.createCategory({ ...catForm, sortOrder: Number(catForm.sortOrder)||0 }); setIsAddCatOpen(false); setCatForm({ name:'', description:'', sortOrder:0 }); loadData(); } catch {}
  };

  const handleAddItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId) return;
    try { await menuApi.createItem({ ...itemForm, price:parseFloat(itemForm.price), sortOrder:Number(itemForm.sortOrder)||0 }); setIsAddItemOpen(false); setItemForm(blankItem); loadData(); } catch {}
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    try { await menuApi.updateItem(editingItem.id, { ...itemForm, price:parseFloat(itemForm.price), sortOrder:Number(itemForm.sortOrder)||0 }); setIsEditOpen(false); setEditingItem(null); loadData(); } catch {}
  };

  const handleToggle = async (id: string) => {
    try {
      await menuApi.toggleAvailability(id);
      setAllItems(prev => prev.map(i => i.id === id ? { ...i, isAvailable: !i.isAvailable } : i));
    } catch { loadData(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try { await menuApi.deleteItem(id); setAllItems(prev => prev.filter(i => i.id !== id)); } catch {}
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({ name:item.name, description:item.description||'', price:item.price.toString(), categoryId:item.categoryId, imageUrl:item.imageUrl||'', sortOrder:item.sortOrder||0 });
    setIsEditOpen(true);
  };

  const filteredItems = selectedCat ? allItems.filter(i => i.categoryId === selectedCat) : allItems;

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'80px 0', color:'#9E7B6D', fontFamily:'Inter,sans-serif' }}>
        <div style={{ width:40, height:40, border:'2.5px solid #E8DCCB', borderTopColor:'#3E2723', borderRadius:'50%', animation:'spin 0.9s linear infinite', marginBottom:14 }}/>
        <p style={{ fontSize:14 }}>Loading menu…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:'Inter,sans-serif', color:'#2B1810' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'"Playfair Display",serif', fontSize:'clamp(24px,3vw,32px)', fontWeight:700, color:'#2B1810', letterSpacing:'-0.025em', marginBottom:5 }}>
            Menu Management
          </h1>
          <p style={{ fontSize:13.5, color:'#9E7B6D' }}>
            {allItems.length} items · {allItems.filter(i => i.isAvailable).length} visible to customers
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>

          {/* Add Category */}
          <Dialog open={isAddCatOpen} onOpenChange={setIsAddCatOpen}>
            <DialogTrigger asChild>
              <button style={btnGhost}>+ Category</button>
            </DialogTrigger>
            <DialogContent style={{ fontFamily:'Inter,sans-serif', borderRadius:20, border:'1px solid rgba(93,64,55,0.12)' }}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily:'"Playfair Display",serif', color:'#2B1810' }}>Add Category</DialogTitle>
                <DialogDescription style={{ color:'#9E7B6D' }}>Create a new menu category</DialogDescription>
              </DialogHeader>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input style={inputStyle} value={catForm.name} onChange={e => setCatForm({...catForm,name:e.target.value})}
                    onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{...inputStyle, resize:'vertical', minHeight:64}} value={catForm.description} onChange={e => setCatForm({...catForm,description:e.target.value})}
                    onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
                </div>
                <div>
                  <label style={labelStyle}>Sort Order</label>
                  <input style={inputStyle} type="number" value={catForm.sortOrder} onChange={e => setCatForm({...catForm,sortOrder:parseInt(e.target.value)||0})}
                    onFocus={e=>{e.target.style.borderColor='#B57A3C';e.target.style.boxShadow='0 0 0 3px rgba(181,122,60,0.1)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(93,64,55,0.2)';e.target.style.boxShadow='none';}}/>
                </div>
              </div>
              <DialogFooter>
                <button style={btnGhost} onClick={() => setIsAddCatOpen(false)}>Cancel</button>
                <button style={btnPrimary} onClick={handleAddCat} disabled={!catForm.name.trim()}>Create</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Item */}
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <button style={{ ...btnPrimary, display:'flex', alignItems:'center', gap:7 }}>
                <Plus size={15}/> Add Item
              </button>
            </DialogTrigger>
            <DialogContent style={{ fontFamily:'Inter,sans-serif', maxWidth:480, maxHeight:'90vh', overflowY:'auto', borderRadius:20, border:'1px solid rgba(93,64,55,0.12)' }}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily:'"Playfair Display",serif', color:'#2B1810' }}>Add Menu Item</DialogTitle>
                <DialogDescription style={{ color:'#9E7B6D' }}>Create a new item visible to customers</DialogDescription>
              </DialogHeader>
              <ItemFormFields form={itemForm} setForm={setItemForm} categories={categories}/>
              <DialogFooter>
                <button style={btnGhost} onClick={() => setIsAddItemOpen(false)}>Cancel</button>
                <button style={btnPrimary} onClick={handleAddItem} disabled={!itemForm.name.trim() || !itemForm.price || !itemForm.categoryId}>Create</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category filter tabs */}
      <div style={{ background:'#FFFFFF', borderRadius:16, border:'1px solid rgba(93,64,55,0.08)', padding:'16px 20px', marginBottom:20, display:'flex', flexWrap:'wrap', gap:8 }}>
        {[{ id:null, name:`All (${allItems.length})` }, ...categories.map(c => ({ id:c.id, name:`${c.name} (${allItems.filter(i=>i.categoryId===c.id).length})` }))].map(c => (
          <button key={c.id ?? 'all'} onClick={() => setSelectedCat(c.id)}
            style={{
              padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:600,
              background: selectedCat===c.id ? 'linear-gradient(135deg,#2B1810,#5D4037)' : 'rgba(232,220,203,0.4)',
              color: selectedCat===c.id ? '#FAF8F5' : '#5D4037',
              border: selectedCat===c.id ? 'none' : '1px solid rgba(93,64,55,0.15)',
              cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif',
            }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Items table */}
      <div style={{ background:'#FFFFFF', borderRadius:20, border:'1px solid rgba(93,64,55,0.08)', overflow:'hidden', boxShadow:'0 2px 12px rgba(43,24,16,0.05)' }}>
        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 100px 140px 140px', gap:0, padding:'13px 22px', background:'rgba(250,248,245,0.8)', borderBottom:'1px solid rgba(93,64,55,0.08)' }}>
          {['Item', 'Category', 'Price', 'Visibility', 'Actions'].map(h => (
            <div key={h} style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#B57A3C' }}>{h}</div>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ padding:56, textAlign:'center', color:'#9E7B6D' }}>
            <UtensilsCrossed size={32} color="#E8DCCB" style={{ margin:'0 auto 12px' }}/>
            <p style={{ fontSize:14 }}>No items found</p>
          </div>
        ) : (
          filteredItems.map((item, i) => (
            <div key={item.id} style={{
              display:'grid', gridTemplateColumns:'2fr 1fr 100px 140px 140px',
              gap:0, padding:'14px 22px', alignItems:'center',
              borderBottom: i < filteredItems.length-1 ? '1px solid rgba(93,64,55,0.06)' : 'none',
              opacity: item.isAvailable ? 1 : 0.6,
              transition:'background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; }}
            >
              {/* Name */}
              <div>
                <div style={{ fontSize:13.5, fontWeight:600, color:'#2B1810' }}>{item.name}</div>
                {item.description && <div style={{ fontSize:11.5, color:'#B0998B', marginTop:2 }}>{item.description.slice(0,60)}{item.description.length>60?'…':''}</div>}
              </div>
              {/* Category */}
              <div>
                <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, background:'rgba(181,122,60,0.1)', fontSize:11.5, fontWeight:600, color:'#B57A3C' }}>
                  {item.category?.name || categories.find(c=>c.id===item.categoryId)?.name || '—'}
                </span>
              </div>
              {/* Price */}
              <div style={{ fontFamily:'"Playfair Display",serif', fontSize:14, fontWeight:700, color:'#B57A3C' }}>
                ₹{item.price.toFixed(2)}
              </div>
              {/* Toggle */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Switch checked={item.isAvailable} onCheckedChange={() => handleToggle(item.id)}/>
                <span style={{ fontSize:12, fontWeight:600, color: item.isAvailable ? '#4F7A54' : '#B0998B' }}>
                  {item.isAvailable ? 'Visible' : 'Hidden'}
                </span>
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => openEdit(item)} style={{ width:32, height:32, borderRadius:9, border:'1.5px solid rgba(93,64,55,0.18)', background:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(232,220,203,0.5)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='#FFFFFF';}}>
                  <Pencil size={13} color="#5D4037"/>
                </button>
                <button onClick={() => handleDelete(item.id)} style={{ width:32, height:32, borderRadius:9, border:'1.5px solid rgba(169,68,66,0.2)', background:'rgba(169,68,66,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.14)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(169,68,66,0.06)';}}>
                  <Trash2 size={13} color="#A94442"/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent style={{ fontFamily:'Inter,sans-serif', maxWidth:480, maxHeight:'90vh', overflowY:'auto', borderRadius:20, border:'1px solid rgba(93,64,55,0.12)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily:'"Playfair Display",serif', color:'#2B1810' }}>Edit Menu Item</DialogTitle>
            <DialogDescription style={{ color:'#9E7B6D' }}>Changes are immediately visible to customers once saved.</DialogDescription>
          </DialogHeader>
          <ItemFormFields form={itemForm} setForm={setItemForm} categories={categories}/>
          <DialogFooter>
            <button style={btnGhost} onClick={() => setIsEditOpen(false)}>Cancel</button>
            <button style={btnPrimary} onClick={handleEditItem}>Save Changes</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Made with Bob
