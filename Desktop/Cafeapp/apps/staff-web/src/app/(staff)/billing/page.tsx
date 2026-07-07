'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSocket } from '@/hooks/useSocket';
import { 
  Receipt, Plus, Printer, Check, AlertCircle, Search, 
  TrendingUp, X, DollarSign, Percent, FileText, Settings, UserCheck, ShieldAlert, Trash
} from 'lucide-react';

/* ─── Interfaces ─────────────────────────────────────────────────────────── */
interface Table {
  id: string;
  number: string;
  section: string | null;
  status: 'FREE' | 'OCCUPIED' | 'BILLING';
}

interface Manager {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: any;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  grandTotal: number;
  createdAt: string;
  items: OrderItem[];
  customer: {
    name: string | null;
    phone: string | null;
  };
}

interface BillItem {
  id: string;
  billId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  menuItem?: any;
}

interface BillPayment {
  id: string;
  method: string;
  amount: number;
  reference: string | null;
  createdAt: string;
}

interface Bill {
  id: string;
  billNumber: string | null;
  financialYear: string | null;
  tableId: string | null;
  channel: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  subtotal: number;
  discountAmount: number;
  discountReason: string | null;
  discountApprovedBy: string | null;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  roundOff: number;
  grandTotal: number;
  status: 'OPEN' | 'PAID' | 'VOID';
  createdBy: string | null;
  createdAt: string;
  closedAt: string | null;
  payments: BillPayment[];
  items: BillItem[];
  table?: Table | null;
}

interface ZReport {
  businessDate: string;
  periodStart: string;
  periodEnd: string;
  billsCount: number;
  totalSales: number;
  cgstCollected: number;
  sgstCollected: number;
  totalDiscounts: number;
  paymentModeBreakup: Record<string, number>;
  voidedCount: number;
  voidedValue: number;
}

interface GstSummary {
  startDate: string;
  endDate: string;
  billsCount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalTurnover: number;
}

interface ItemSales {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export default function BillingPage() {
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dine-in' | 'reports'>('dine-in');

  // Realtime updates
  useSocket(accessToken, {
    'order:new': () => fetchData(),
    'order:status': () => fetchData(),
  });

  // Lists & State
  const [tables, setTables] = useState<Table[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Table Configuration Form
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableSection, setNewTableSection] = useState('General');

  // Loading & Modals
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);

  // Payment Modal state
  const [payments, setPayments] = useState<Array<{ method: 'CASH' | 'UPI' | 'CARD'; amount: string; reference: string }>>([
    { method: 'CASH', amount: '', reference: '' }
  ]);

  // PIN / Discount state
  const [discountVal, setDiscountVal] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountReason, setDiscountReason] = useState('');
  const [managerId, setManagerId] = useState('');
  const [managerPin, setManagerPin] = useState('');

  // Void state
  const [voidReason, setVoidReason] = useState('');

  // Reports state
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportRangeStart, setReportRangeStart] = useState(new Date().toISOString().slice(0, 10));
  const [reportRangeEnd, setReportRangeEnd] = useState(new Date().toISOString().slice(0, 10));
  const [zReportData, setZReportData] = useState<ZReport | null>(null);
  const [gstSummaryData, setGstSummaryData] = useState<GstSummary | null>(null);
  const [itemSalesData, setItemSalesData] = useState<ItemSales[]>([]);

  /* ─── Notification Toast ────────────────────────────────────────────────── */
  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ─── Fetchers ─────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    // Only show full loading spinner on initial load
    if (tables.length === 0) {
      setLoading(true);
    }
    try {
      // 1. Fetch tables
      const tablesRes = await api.get('/billing/tables');
      setTables(tablesRes.data);

      // 2. Fetch managers for PIN modals (only if not already loaded)
      if (managers.length === 0) {
        const managersRes = await api.get('/billing/managers');
        setManagers(managersRes.data);
        if (managersRes.data.length > 0) {
          setManagerId(managersRes.data[0].id);
        }
      }

      // 3. Fetch menu items for standalone POS editor (only if not already loaded)
      if (menuItems.length === 0) {
        const menuRes = await api.get('/menu/items');
        setMenuItems(menuRes.data);
      }

    } catch (e: any) {
      console.error(e);
      triggerToast('Failed to fetch billing data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tables.length, managers.length, menuItems.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load selected table details (active unbilled orders or active bill)
  const handleSelectTable = async (table: Table) => {
    setSelectedTable(table);
    setSelectedBill(null);
    
    if (table.status === 'OCCUPIED' || table.status === 'BILLING') {
      try {
        const billRes = await api.get(`/billing/tables/${table.id}/bill`);
        setSelectedBill(billRes.data);
      } catch (e) {
        triggerToast('Failed to load table bill details', 'error');
      }
    }
  };


  /* ─── Actions ──────────────────────────────────────────────────────────── */
  // 1. Generate/Finalize bill
  const handleGenerateBill = async () => {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/tables/${selectedTable.id}/finalize`);
      triggerToast(`Bill ${res.data.billNumber} generated!`);
      await fetchData();
      const updatedTable = { ...selectedTable, status: 'BILLING' as const };
      setSelectedTable(updatedTable);
      await handleSelectTable(updatedTable);
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to generate bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Add item to table
  const handleAddTableItem = async (menuItemId: string) => {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/tables/${selectedTable.id}/items`, {
        menuItemId,
        quantity: 1,
      });
      triggerToast('Item added successfully');
      setSelectedBill(res.data);
      await fetchData();
      if (selectedTable.status === 'FREE') {
        const updatedTable = { ...selectedTable, status: 'OCCUPIED' as const };
        setSelectedTable(updatedTable);
      }
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to add item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update item quantity
  const handleUpdateItemQuantity = async (itemId: string, newQty: number) => {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/billing/tables/${selectedTable.id}/items/${itemId}`, {
        quantity: newQty,
      });
      if (res.data) {
        setSelectedBill(res.data);
      } else {
        setSelectedBill(null);
        setSelectedTable(null);
      }
      await fetchData();
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to update item quantity', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    await handleUpdateItemQuantity(itemId, 0);
  };

  // Unlock / reopen bill
  const handleUnlockBill = async () => {
    if (!selectedTable) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/billing/tables/${selectedTable.id}/unlock`);
      triggerToast('Bill unlocked for editing');
      setSelectedBill(res.data);
      await fetchData();
      const updatedTable = { ...selectedTable, status: 'OCCUPIED' as const };
      setSelectedTable(updatedTable);
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to unlock bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create table
  const handleCreateTable = async () => {
    if (!newTableNumber.trim()) return;
    setActionLoading(true);
    try {
      await api.post('/billing/tables', {
        number: newTableNumber,
        section: newTableSection,
      });
      triggerToast('Table created successfully');
      setNewTableNumber('');
      await fetchData();
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to create table', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete table
  const handleDeleteTable = async (id: string) => {
    setActionLoading(true);
    try {
      await api.delete(`/billing/tables/${id}`);
      triggerToast('Table deleted successfully');
      if (selectedTable?.id === id) {
        setSelectedTable(null);
        setSelectedBill(null);
      }
      await fetchData();
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to delete table', 'error');
    } finally {
      setActionLoading(false);
    }
  };


  // 2. Verify manager PIN (standalone test / helper)
  const handleVerifyPinOnly = async () => {
    setActionLoading(true);
    try {
      await api.post('/billing/pin/verify', {
        managerId,
        pin: managerPin
      });
      triggerToast('PIN Verified successfully!');
      setManagerPin('');
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Invalid manager PIN', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Apply discount
  const handleApplyDiscount = async () => {
    if (!selectedBill) return;
    setActionLoading(true);

    const payload: any = {
      reason: discountReason,
    };

    const parsedVal = parseFloat(discountVal);
    if (isNaN(parsedVal) || parsedVal <= 0) {
      triggerToast('Please enter a valid discount value', 'error');
      setActionLoading(false);
      return;
    }

    if (discountType === 'flat') {
      payload.discountAmount = parsedVal;
    } else {
      payload.discountPercentage = parsedVal;
    }

    // Check threshold client-side to prompt for PIN if needed
    const calculatedFlatDiscount = discountType === 'flat' 
      ? parsedVal 
      : (selectedBill.subtotal * parsedVal) / 100;

    const isAboveThreshold = calculatedFlatDiscount > 100 || (discountType === 'percent' && parsedVal > 10);

    if (isAboveThreshold) {
      if (!managerPin) {
        triggerToast('Discount exceeds limit. Manager PIN verification required.', 'error');
        setActionLoading(false);
        return;
      }
      payload.managerId = managerId;
      payload.managerPin = managerPin;
    }

    try {
      const res = await api.post(`/billing/bills/${selectedBill.id}/discount`, payload);
      triggerToast('Discount applied successfully!');
      setSelectedBill(res.data);
      setDiscountVal('');
      setDiscountReason('');
      setManagerPin('');
      setShowDiscountModal(false);
      await fetchData();
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to apply discount', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Record Payment / Complete payment (supports split)
  const handleAddPayment = async () => {
    if (!selectedBill) return;
    setActionLoading(true);

    try {
      let finalBill = selectedBill;
      for (const payment of payments) {
        const amt = parseFloat(payment.amount);
        if (isNaN(amt) || amt <= 0) continue;

        const res = await api.post(`/billing/bills/${selectedBill.id}/payments`, {
          method: payment.method,
          amount: amt,
          reference: payment.reference || undefined
        });
        
        finalBill = res.data.bill;
      }

      triggerToast(finalBill.status === 'PAID' ? 'Bill completed & paid!' : 'Payment recorded successfully!');
      
      setSelectedBill(finalBill);
      setShowPaymentModal(false);
      setPayments([{ method: 'CASH', amount: '', reference: '' }]);
      await fetchData();

      if (finalBill.status === 'PAID') {
        setSelectedBill(null);
        setSelectedTable(null);
      }
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Void Bill
  const handleVoidBill = async () => {
    if (!selectedBill) return;
    if (!voidReason) {
      triggerToast('Void reason is required', 'error');
      return;
    }
    if (!managerPin) {
      triggerToast('Manager PIN is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/billing/bills/${selectedBill.id}/void`, {
        reason: voidReason,
        managerId,
        managerPin
      });
      triggerToast('Bill voided successfully!');
      setSelectedBill(res.data);
      setVoidReason('');
      setManagerPin('');
      setShowVoidModal(false);
      await fetchData();
      setSelectedBill(null);
      setSelectedTable(null);
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to void bill', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Print Thermal Invoice
  const handlePrintBill = () => {
    if (!selectedBill) return;
    const url = `${api.defaults.baseURL}/billing/bills/${selectedBill.id}/invoice?token=${localStorage.getItem('accessToken')}`;
    window.open(url, '_blank');
  };

  // 7. Seed Table occupied status for testing
  const handleCreateTestOrder = async (table: Table) => {
    setActionLoading(true);
    try {
      // Find a menu item to add
      const itemsRes = await api.get('/menu/items');
      const item = itemsRes.data.find((i: any) => i.name === 'Green Tea') || itemsRes.data[0];
      if (!item) {
        triggerToast('No menu items found. Please seed menu first.', 'error');
        setActionLoading(false);
        return;
      }

      const res = await api.post(`/billing/tables/${table.id}/items`, {
        menuItemId: item.id,
        quantity: 1,
      });

      triggerToast(`Mock order created for table ${table.number}! Status is OCCUPIED.`);
      await fetchData();
      setSelectedTable({ ...table, status: 'OCCUPIED' });
      setSelectedBill(res.data);
    } catch (e: any) {
      console.error(e);
      triggerToast('Failed to create mock table order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Reports Fetchers ──────────────────────────────────────────────────── */
  const handleFetchZReport = async () => {
    setActionLoading(true);
    try {
      const res = await api.get('/billing/reports/z-report', { params: { date: reportDate } });
      setZReportData(res.data);
      triggerToast('Z-Report generated!');
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to fetch Z-Report', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchGstSummary = async () => {
    setActionLoading(true);
    try {
      const res = await api.get('/billing/reports/gst-summary', {
        params: { startDate: reportRangeStart, endDate: reportRangeEnd }
      });
      setGstSummaryData(res.data);
      triggerToast('GST Summary generated!');
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to fetch GST Summary', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchItemSales = async () => {
    setActionLoading(true);
    try {
      const res = await api.get('/billing/reports/item-sales', {
        params: { startDate: reportRangeStart, endDate: reportRangeEnd }
      });
      setItemSalesData(res.data);
      triggerToast('Item-wise Sales generated!');
    } catch (e: any) {
      triggerToast(e.response?.data?.message || 'Failed to fetch Item-wise Sales', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Exporter client-side
  const downloadCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(',')
      )
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format bill items display
  const renderBillItems = (bill: Bill) => {
    if (!bill || !bill.items) return null;
    return bill.items.map((item) => {
      const isOccupied = selectedTable?.status === 'OCCUPIED';
      return (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#2B1810', fontWeight: 600 }}>{item.name}</span>
            <span style={{ color: '#888', fontSize: 11 }}>₹{item.unitPrice.toFixed(2)} each</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isOccupied ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(93,64,55,0.05)', borderRadius: 8, padding: '2px 6px' }}>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                  style={{ border: 'none', background: 'transparent', color: '#B57A3C', fontWeight: 700, cursor: 'pointer', padding: '0 4px', fontSize: 14 }}
                >
                  -
                </button>
                <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center', fontSize: 12.5 }}>{item.quantity}</span>
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                  style={{ border: 'none', background: 'transparent', color: '#B57A3C', fontWeight: 700, cursor: 'pointer', padding: '0 4px', fontSize: 14 }}
                >
                  +
                </button>
              </div>
            ) : (
              <span style={{ color: '#888', fontSize: 12.5, fontWeight: 600 }}>x{item.quantity}</span>
            )}
            
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#5D4037', minWidth: 60, textAlign: 'right' }}>
              ₹{item.lineTotal.toFixed(2)}
            </span>

            {isOccupied && (
              <button
                disabled={actionLoading}
                onClick={() => handleDeleteItem(item.id)}
                style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
              >
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>
      );
    });
  };
  // A search catalog component to place inside the pane
  const renderItemCatalog = () => {
    const filteredItems = menuItems.filter(item => 
      item.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );

    return (
      <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#5D4037', margin: '0 0 10px 0' }}>Add Menu Items</h4>
        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF8F5', border: '1.5px solid rgba(93,64,55,0.15)', borderRadius: 10, padding: '4px 10px', marginBottom: 10 }}>
          <Search size={14} style={{ color: '#8C7A70', marginRight: 6 }} />
          <input
            type="text"
            placeholder="Search items..."
            value={catalogSearch}
            onChange={e => setCatalogSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 12.5, outline: 'none', color: '#2B1810' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', paddingRight: 4 }}>
          {filteredItems.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#FAFAF9', borderRadius: 8, border: '1px solid rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2B1810' }}>{item.name}</span>
                <span style={{ fontSize: 11, color: '#888' }}>₹{item.price.toFixed(2)}</span>
              </div>
              <button
                disabled={actionLoading}
                onClick={() => handleAddTableItem(item.id)}
                style={{
                  padding: '4px 8px', borderRadius: 6, background: '#B57A3C', color: '#FFF',
                  border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12,
          background: toast.type === 'success' ? '#E8F5E9' : '#FFEBEE',
          border: `1.5px solid ${toast.type === 'success' ? '#81C784' : '#E57373'}`,
          color: toast.type === 'success' ? '#2E7D32' : '#C62828',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontWeight: 600, fontSize: 13.5,
        }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, fontWeight: 700, color: '#1C0F0A', margin: 0 }}>
            Billing Operations
          </h1>
          <p style={{ fontSize: 13.5, color: '#5D4037', margin: '4px 0 0 0' }}>
            GST Invoicing, Split Payments settlement & Z-reporting dashboard.
          </p>
        </div>
        
        {/* Quick actions or status info */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={fetchData} 
            disabled={loading}
            style={{
              padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.18)',
              background: '#FFF', color: '#5D4037', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500
            }}
          >
            Refresh System Data
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(93,64,55,0.1)', paddingBottom: 2 }}>
        <button
          onClick={() => { setActiveTab('dine-in'); setSelectedBill(null); setSelectedTable(null); }}
          style={{
            padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
            background: activeTab === 'dine-in' ? '#FFF' : 'transparent',
            color: activeTab === 'dine-in' ? '#2B1810' : '#8C7A70',
            fontWeight: activeTab === 'dine-in' ? 700 : 500, fontSize: 14, cursor: 'pointer',
            borderBottom: activeTab === 'dine-in' ? '3px solid #B57A3C' : '3px solid transparent',
          }}
        >
          Dine-In Tables
        </button>

        <button
          onClick={() => { setActiveTab('reports'); setSelectedBill(null); setSelectedTable(null); }}
          style={{
            padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
            background: activeTab === 'reports' ? '#FFF' : 'transparent',
            color: activeTab === 'reports' ? '#2B1810' : '#8C7A70',
            fontWeight: activeTab === 'reports' ? 700 : 500, fontSize: 14, cursor: 'pointer',
            borderBottom: activeTab === 'reports' ? '3px solid #B57A3C' : '3px solid transparent',
          }}
        >
          Settlements & Reports
        </button>
      </div>

      {/* ── Loading state ────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <div style={{ border: '3px solid #E8E0D5', borderTop: '3px solid #B57A3C', borderRadius: '50%', width: 28, height: 28, animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ marginLeft: 12, color: '#5D4037', fontSize: 14 }}>Fetching database records...</span>
        </div>
      )}

      {/* ── Main Tab Content ─────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'reports' ? '1fr' : '1fr 380px', gap: 24, alignItems: 'start' }}>
          
          {/* Tab 1: Dine-In Tables */}
          {activeTab === 'dine-in' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#FFF', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2B1810', margin: '0 0 16px 0' }}>Dine-In Layout</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 16 }}>
                  {tables.map(table => {
                    const isSelected = selectedTable?.id === table.id;
                    let bg = '#FAFAF9';
                    let border = '1.5px solid rgba(0,0,0,0.06)';
                    let badgeBg = '#E5E7EB';
                    let badgeCol = '#4B5563';

                    if (table.status === 'OCCUPIED') {
                      bg = '#FFFBEB';
                      border = '1.5px solid #FCD34D';
                      badgeBg = '#FEF3C7';
                      badgeCol = '#D97706';
                    } else if (table.status === 'BILLING') {
                      bg = '#FEF2F2';
                      border = '1.5px solid #FCA5A5';
                      badgeBg = '#FEE2E2';
                      badgeCol = '#DC2626';
                    }

                    if (isSelected) {
                      border = '2px solid #B57A3C';
                    }

                    return (
                      <div
                        key={table.id}
                        onClick={() => handleSelectTable(table)}
                        style={{
                          background: bg, border: border, borderRadius: 14,
                          padding: 16, display: 'flex', flexDirection: 'column',
                          gap: 12, cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 4px 12px rgba(181,122,60,0.12)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#1C0F0A' }}>{table.number}</span>
                          <span style={{ fontSize: 11, background: badgeBg, color: badgeCol, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                            {table.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#78716C', fontWeight: 500 }}>
                          {table.section || 'General'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}



          {/* Right Pane: Selected Details */}
          {activeTab !== 'reports' && (
            <div style={{
              background: '#FFF', borderRadius: 16, padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1.5px solid rgba(93,64,55,0.06)',
              display: 'flex', flexDirection: 'column', gap: 20, minHeight: 400
            }}>
              
              {/* Empty state */}
              {!selectedTable && !selectedBill && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, color: '#8C7A70', gap: 10, padding: '40px 0' }}>
                  <Receipt size={40} style={{ opacity: 0.25 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No Selection</div>
                  <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 200 }}>Select a table layout card or open invoice to view items and record cash.</div>
                </div>
              )}

              {/* Table selected details but FREE */}
              {selectedTable && selectedTable.status === 'FREE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', flex: 1 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: 0 }}>Table {selectedTable.number}</h3>
                    <span style={{ fontSize: 12, color: '#8C7A70' }}>{selectedTable.section || 'General Area'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ border: '1.5px dashed rgba(93,64,55,0.15)', borderRadius: 12, padding: 16, textAlign: 'center', color: '#5D4037', background: '#FAFAF9', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <Check size={20} color="#4F7A54" />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>Table is Free</span>
                      <button
                        onClick={() => handleCreateTestOrder(selectedTable)}
                        disabled={actionLoading}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none',
                          background: '#B57A3C', color: '#FFF', fontWeight: 600,
                          cursor: 'pointer', fontSize: 11, transition: 'all 0.2s',
                        }}
                      >
                        Create Mock Table Order
                      </button>
                    </div>
                    {renderItemCatalog()}
                  </div>
                </div>
              )}

              {/* Table OCCUPIED - show active items and catalog */}
              {selectedTable && selectedTable.status === 'OCCUPIED' && selectedBill && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'space-between', height: '100%', flex: 1 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: 0 }}>Table {selectedTable.number}</h3>
                        <span style={{ fontSize: 12, color: '#8C7A70' }}>{selectedTable.section || 'General Area'}</span>
                      </div>
                      <span style={{ fontSize: 11, background: '#FEF3C7', color: '#D97706', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>OCCUPIED</span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 12, paddingTop: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: '#5D4037', margin: '0 0 10px 0' }}>Bill Items</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
                        {renderBillItems(selectedBill)}
                      </div>
                    </div>

                    {renderItemCatalog()}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5D4037' }}>
                        <span>Subtotal:</span>
                        <span style={{ fontWeight: 600 }}>₹{selectedBill.subtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5D4037' }}>
                        <span>CGST + SGST (5%):</span>
                        <span style={{ fontWeight: 600 }}>₹{(selectedBill.cgstAmount + selectedBill.sgstAmount).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#2B1810', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: 6 }}>
                        <span>Grand Total:</span>
                        <span>₹{selectedBill.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateBill}
                      disabled={actionLoading}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg,#B57A3C,#C9964A)', color: '#FAF8F5',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(181,122,60,0.2)'
                      }}
                    >
                      {actionLoading ? 'Finalizing Bill...' : 'Generate Bill (Lock Table)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Table BILLING - locked for checkout */}
              {selectedTable && selectedTable.status === 'BILLING' && selectedBill && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'space-between', height: '100%', flex: 1 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2B1810', margin: 0 }}>{selectedBill.billNumber || 'DRAFT'}</h3>
                        <span style={{ fontSize: 11, color: '#8C7A70' }}>FY: {selectedBill.financialYear || 'N/A'} • {selectedBill.channel}</span>
                      </div>
                      <span style={{ fontSize: 11, background: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {selectedBill.status}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 12, paddingTop: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: '#5D4037', margin: '0 0 10px 0' }}>Bill Line Items</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
                        {renderBillItems(selectedBill)}
                      </div>
                    </div>
                  </div>

                  {/* Calculations */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5D4037' }}>
                        <span>Subtotal:</span>
                        <span>₹{selectedBill.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedBill.discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D32', fontWeight: 600 }}>
                          <span>Discount ({selectedBill.discountReason}):</span>
                          <span>-₹{selectedBill.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5D4037' }}>
                        <span>Taxable Amount:</span>
                        <span>₹{selectedBill.taxableAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5D4037' }}>
                        <span>GST (2.5% CGST + 2.5% SGST):</span>
                        <span>₹{(selectedBill.cgstAmount + selectedBill.sgstAmount).toFixed(2)}</span>
                      </div>
                      {selectedBill.roundOff !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888' }}>
                          <span>Round Off:</span>
                          <span>₹{selectedBill.roundOff.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {selectedBill.payments.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B57A3C', fontWeight: 600, borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: 4 }}>
                          <span>Amount Settled (Paid):</span>
                          <span>₹{selectedBill.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#1C0F0A', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 6 }}>
                        <span>Grand Total:</span>
                        <span>₹{selectedBill.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Operational cashier buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          onClick={() => {
                            setPayments([{ method: 'CASH', amount: (selectedBill.grandTotal - selectedBill.payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2), reference: '' }]);
                            setShowPaymentModal(true);
                          }}
                          style={{
                            padding: '10px', borderRadius: 10, background: '#4F7A54',
                            color: '#FFF', border: 'none', fontWeight: 600, fontSize: 12.5,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <DollarSign size={14} /> Take Payment
                        </button>
                        <button
                          onClick={() => {
                            setDiscountVal('');
                            setDiscountReason('');
                            setManagerPin('');
                            setShowDiscountModal(true);
                          }}
                          style={{
                            padding: '10px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.18)',
                            background: '#FFF', color: '#5D4037', fontWeight: 600, fontSize: 12.5,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <Percent size={14} /> Discount
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          onClick={handlePrintBill}
                          style={{
                            padding: '10px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.18)',
                            background: '#FAF8F5', color: '#2B1810', fontWeight: 600, fontSize: 12.5,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <Printer size={14} /> Print Invoice
                        </button>
                        <button
                          onClick={() => {
                            setVoidReason('');
                            setManagerPin('');
                            setShowVoidModal(true);
                          }}
                          style={{
                            padding: '10px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.08)',
                            color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600, fontSize: 12.5,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <ShieldAlert size={14} /> Void Bill
                        </button>
                      </div>
                      
                      <button
                        onClick={handleUnlockBill}
                        style={{
                          padding: '10px', borderRadius: 10, border: '1.5px solid #C9964A',
                          background: '#FAF8F5', color: '#C9964A', fontWeight: 600, fontSize: 12.5,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        <Settings size={14} /> Unlock & Edit Items
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Tab 3: Reports & Settlement */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Daily Z-report Row */}
              <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1.5px solid rgba(93,64,55,0.06)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: '0 0 16px 0', fontFamily: 'Playfair Display, serif' }}>Daily Z-Report</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 13.5, color: '#5D4037', fontWeight: 600 }}>Select Business Day:</span>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)', background: '#FAF8F5' }}
                  />
                  <button
                    onClick={handleFetchZReport}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 20px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg,#B57A3C,#C9964A)', color: '#FAF8F5',
                      fontWeight: 600, cursor: 'pointer', fontSize: 13
                    }}
                  >
                    Generate report
                  </button>
                </div>

                {zReportData && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                      <div style={{ background: '#FAF8F5', border: '1px solid rgba(93,64,55,0.08)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>Total Sales (PAID)</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#2B1810', marginTop: 4 }}>₹{zReportData.totalSales.toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#FAF8F5', border: '1px solid rgba(93,64,55,0.08)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>GST Collected</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#2B1810', marginTop: 4 }}>₹{(zReportData.cgstCollected + zReportData.sgstCollected).toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#FAF8F5', border: '1px solid rgba(93,64,55,0.08)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>Total Discounts Given</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#2E7D32', marginTop: 4 }}>₹{zReportData.totalDiscounts.toFixed(2)}</div>
                      </div>
                      <div style={{ background: '#FAF8F5', border: '1px solid rgba(93,64,55,0.08)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>Voided Invoices</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#C62828', marginTop: 4 }}>{zReportData.voidedCount} (₹{zReportData.voidedValue.toFixed(2)})</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#2B1810', margin: '0 0 12px 0' }}>Payment Mode breakup</h4>
                      <div style={{ display: 'flex', gap: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#888' }}>CASH Settled:</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#2B1810' }}>₹{zReportData.paymentModeBreakup.CASH?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#888' }}>UPI Settled:</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#2B1810' }}>₹{zReportData.paymentModeBreakup.UPI?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#888' }}>CARD Settled:</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#2B1810' }}>₹{zReportData.paymentModeBreakup.CARD?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GST Turnover range report */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                
                {/* GST Summary & CSV */}
                <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1.5px solid rgba(93,64,55,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2B1810', margin: 0 }}>GST Summary (CSV Export)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Start Date</label>
                        <input type="date" value={reportRangeStart} onChange={e => setReportRangeStart(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1.5px solid rgba(93,64,55,0.2)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>End Date</label>
                        <input type="date" value={reportRangeEnd} onChange={e => setReportRangeEnd(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1.5px solid rgba(93,64,55,0.2)' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleFetchGstSummary}
                        disabled={actionLoading}
                        style={{
                          flex: 1, padding: 10, borderRadius: 10, border: 'none',
                          background: '#B57A3C', color: '#FFF', fontWeight: 600, cursor: 'pointer', fontSize: 12.5
                        }}
                      >
                        Generate GST
                      </button>
                      {gstSummaryData && (
                        <button
                          onClick={() => downloadCsv([gstSummaryData], `gst_summary_${reportRangeStart}_to_${reportRangeEnd}.csv`)}
                          style={{
                            padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)',
                            background: '#FFF', color: '#5D4037', fontWeight: 600, cursor: 'pointer', fontSize: 12.5
                          }}
                        >
                          Export CSV
                        </button>
                      )}
                    </div>
                  </div>

                  {gstSummaryData && (
                    <div style={{ background: '#FAF8F5', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, border: '1px solid rgba(93,64,55,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Taxable Value:</span>
                        <span style={{ fontWeight: 700 }}>₹{gstSummaryData.totalTaxable.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>CGST (2.5%):</span>
                        <span style={{ fontWeight: 700 }}>₹{gstSummaryData.totalCgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>SGST (2.5%):</span>
                        <span style={{ fontWeight: 700 }}>₹{gstSummaryData.totalSgst.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 6, fontSize: 14 }}>
                        <span className="bold">Total Turnover (Gross):</span>
                        <span style={{ fontWeight: 800, color: '#B57A3C' }}>₹{gstSummaryData.totalTurnover.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item-wise Sales */}
                <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1.5px solid rgba(93,64,55,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2B1810', margin: 0 }}>Item-wise Sales Breakdown</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleFetchItemSales}
                      disabled={actionLoading}
                      style={{
                        flex: 1, padding: 10, borderRadius: 10, border: 'none',
                        background: '#B57A3C', color: '#FFF', fontWeight: 600, cursor: 'pointer', fontSize: 12.5
                      }}
                    >
                      Load Item Sales
                    </button>
                    {itemSalesData.length > 0 && (
                      <button
                        onClick={() => downloadCsv(itemSalesData, `item_sales_${reportRangeStart}_to_${reportRangeEnd}.csv`)}
                        style={{
                          padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)',
                          background: '#FFF', color: '#5D4037', fontWeight: 600, cursor: 'pointer', fontSize: 12.5
                        }}
                      >
                        Export CSV
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid rgba(93,64,55,0.08)', borderRadius: 12 }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#FAF8F5', borderBottom: '1px solid rgba(93,64,55,0.08)', textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>Item Name</th>
                          <th style={{ padding: 8, textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: 8, textAlign: 'right' }}>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemSalesData.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#888' }}>No item sales records loaded.</td>
                          </tr>
                        ) : (
                          itemSalesData.map(sale => (
                            <tr key={sale.menuItemId} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                              <td style={{ padding: 8 }}>{sale.name}</td>
                              <td style={{ padding: 8, textAlign: 'center' }}>{sale.quantity}</td>
                              <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>₹{sale.revenue.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Table Configuration settings card */}
              <div style={{ background: '#FFF', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1.5px solid rgba(93,64,55,0.06)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: '0 0 8px 0', fontFamily: 'Playfair Display, serif' }}>Table Configuration Settings</h3>
                <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px 0' }}>Configure Dine-In tables layout by adding or deleting tables.</p>
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                  <input
                    type="text"
                    placeholder="Table No. (e.g. T-12)"
                    value={newTableNumber}
                    onChange={e => setNewTableNumber(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)', background: '#FAF8F5', width: 150 }}
                  />
                  <select
                    value={newTableSection}
                    onChange={e => setNewTableSection(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)', background: '#FAF8F5' }}
                  >
                    <option value="General">General</option>
                    <option value="Indoor">Indoor</option>
                    <option value="Patio">Patio</option>
                    <option value="Rooftop">Rooftop</option>
                  </select>
                  <button
                    onClick={handleCreateTable}
                    disabled={actionLoading || !newTableNumber.trim()}
                    style={{
                      padding: '10px 20px', borderRadius: 10, border: 'none',
                      background: '#4F7A54', color: '#FAF8F5',
                      fontWeight: 600, cursor: 'pointer', fontSize: 13
                    }}
                  >
                    Add Table
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {tables.map(table => (
                    <div key={table.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FAF8F5', borderRadius: 12, border: '1px solid rgba(93,64,55,0.08)' }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#2B1810' }}>{table.number}</span>
                        <div style={{ fontSize: 11, color: '#888' }}>{table.section || 'General'}</div>
                      </div>
                      <button
                        disabled={actionLoading || table.status !== 'FREE'}
                        onClick={() => handleDeleteTable(table.id)}
                        style={{
                          background: 'transparent', border: 'none', color: '#EF4444',
                          cursor: table.status === 'FREE' ? 'pointer' : 'not-allowed',
                          opacity: table.status === 'FREE' ? 1 : 0.4,
                          padding: '4px'
                        }}
                        title={table.status !== 'FREE' ? 'Cannot delete occupied table' : 'Delete table'}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ── Modal 1: PaymentModal ────────────────────────────────────────── */}
      {showPaymentModal && selectedBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 24, width: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: 0 }}>Record Bill Settlement</h3>
              <X size={20} onClick={() => setShowPaymentModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <div>
              <div style={{ fontSize: 13, color: '#5D4037', marginBottom: 2 }}>Settling Bill: <span className="bold">{selectedBill.billNumber}</span></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1C0F0A' }}>Remaining Balance: ₹{(selectedBill.grandTotal - selectedBill.payments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}</div>
            </div>

            {/* Split inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {payments.map((p, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 32px', gap: 8, alignItems: 'center' }}>
                  <select
                    value={p.method}
                    onChange={e => {
                      const newP = [...payments];
                      newP[index].method = e.target.value as any;
                      setPayments(newP);
                    }}
                    style={{ padding: 8, borderRadius: 8, border: '1.5px solid rgba(93,64,55,0.2)' }}
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={p.amount}
                    onChange={e => {
                      const newP = [...payments];
                      newP[index].amount = e.target.value;
                      setPayments(newP);
                    }}
                    style={{ padding: 8, borderRadius: 8, border: '1.5px solid rgba(93,64,55,0.2)', width: '100%' }}
                  />
                  <input
                    type="text"
                    placeholder="Ref # (optional)"
                    value={p.reference}
                    onChange={e => {
                      const newP = [...payments];
                      newP[index].reference = e.target.value;
                      setPayments(newP);
                    }}
                    style={{ padding: 8, borderRadius: 8, border: '1.5px solid rgba(93,64,55,0.2)', width: '100%' }}
                  />
                  <button
                    onClick={() => {
                      if (payments.length === 1) return;
                      setPayments(payments.filter((_, i) => i !== index));
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#EF4444', fontSize: 16, cursor: 'pointer' }}
                  >
                    X
                  </button>
                </div>
              ))}

              <button
                onClick={() => setPayments([...payments, { method: 'UPI', amount: '', reference: '' }])}
                style={{
                  padding: '6px 12px', border: '1.5px dashed rgba(93,64,55,0.3)', borderRadius: 8,
                  background: 'transparent', color: '#5D4037', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                }}
              >
                <Plus size={12} /> Add Split Payment row
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.06)', background: '#FAF9F6', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={actionLoading}
                style={{
                  flex: 1, padding: 10, borderRadius: 10, border: 'none',
                  background: '#4F7A54', color: '#FFF', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Recording...' : 'Submit Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: DiscountModal ────────────────────────────────────────── */}
      {showDiscountModal && selectedBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 24, width: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: 0 }}>Apply Discount</h3>
              <X size={20} onClick={() => setShowDiscountModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDiscountType('flat')}
                style={{
                  flex: 1, padding: 8, borderRadius: 8,
                  background: discountType === 'flat' ? 'rgba(181,122,60,0.15)' : '#FAFAF9',
                  border: `1.5px solid ${discountType === 'flat' ? '#B57A3C' : 'rgba(0,0,0,0.05)'}`,
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Flat Amount (₹)
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                style={{
                  flex: 1, padding: 8, borderRadius: 8,
                  background: discountType === 'percent' ? 'rgba(181,122,60,0.15)' : '#FAFAF9',
                  border: `1.5px solid ${discountType === 'percent' ? '#B57A3C' : 'rgba(0,0,0,0.05)'}`,
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Percentage (%)
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Value</label>
              <input
                type="number"
                value={discountVal}
                onChange={e => setDiscountVal(e.target.value)}
                placeholder={discountType === 'flat' ? '₹ value' : '% percentage'}
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Reason for Discount *</label>
              <input
                type="text"
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
                placeholder="Reason (e.g. CSR goodwill, promo)"
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)' }}
              />
            </div>

            {/* Threshold prompt if over ₹100 or 10% */}
            {(() => {
              const val = parseFloat(discountVal) || 0;
              const isOver = discountType === 'flat' ? val > 100 : val > 10;
              if (isOver) {
                return (
                  <div style={{
                    background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 12,
                    padding: 14, display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#F57F17', fontSize: 12, fontWeight: 600 }}>
                      <ShieldAlert size={14} />
                      <span>Manager approval required (&gt; ₹100 or 10%)</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#5D4037', marginBottom: 2 }}>Manager</label>
                        <select
                          value={managerId}
                          onChange={e => setManagerId(e.target.value)}
                          style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #D7CCC8' }}
                        >
                          {managers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#5D4037', marginBottom: 2 }}>PIN Code</label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="••••"
                          value={managerPin}
                          onChange={e => setManagerPin(e.target.value)}
                          style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #D7CCC8', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setShowDiscountModal(false)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.06)', background: '#FAF9F6', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                disabled={actionLoading}
                style={{
                  flex: 1, padding: 10, borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#B57A3C,#C9964A)', color: '#FFF', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Applying...' : 'Apply Discount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: VoidModal ────────────────────────────────────────────── */}
      {showVoidModal && selectedBill && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 24, width: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2B1810', margin: 0 }}>Void Invoice</h3>
              <X size={20} onClick={() => setShowVoidModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 12, padding: 12, color: '#C62828', fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
              <ShieldAlert size={16} />
              <span>Warning: Voiding will exclude the invoice from revenue reporting.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Reason for Voiding *</label>
              <input
                type="text"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Reason (e.g. Order cancelled, mistake)"
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.2)' }}
              />
            </div>

            <div style={{
              background: '#FAF8F5', border: '1px solid rgba(93,64,55,0.08)', borderRadius: 12,
              padding: 14, display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#5D4037', fontSize: 12, fontWeight: 600 }}>
                <UserCheck size={14} />
                <span>Manager PIN Required</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#5D4037', marginBottom: 2 }}>Manager</label>
                  <select
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #D7CCC8' }}
                  >
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#5D4037', marginBottom: 2 }}>PIN Code</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••"
                    value={managerPin}
                    onChange={e => setManagerPin(e.target.value)}
                    style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #D7CCC8', textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setShowVoidModal(false)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.06)', background: '#FAF9F6', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleVoidBill}
                disabled={actionLoading}
                style={{
                  flex: 1, padding: 10, borderRadius: 10, border: 'none',
                  background: '#DC2626', color: '#FFF', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
