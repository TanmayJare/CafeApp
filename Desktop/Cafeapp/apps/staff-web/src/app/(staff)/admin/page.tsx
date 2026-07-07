'use client';

import { useEffect, useState } from 'react';
import { api, adminApi, menuApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ShieldAlert,
  Users,
  ShoppingBag,
  Receipt,
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Key,
  MapPin,
  Clock,
  Search,
  RefreshCw,
  X,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Eye,
} from 'lucide-react';

type Tab = 'overview' | 'staff' | 'customers' | 'orders' | 'billing' | 'menu';

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Overview Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeOrdersCount: 0,
    totalStaffCount: 0,
    totalCustomersCount: 0,
  });

  // Data states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [billsList, setBillsList] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Search/Filters
  const [staffSearch, setStaffSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [menuSearch, setMenuSearch] = useState('');

  // Modals / Selected Items
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF',
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderEditModal, setShowOrderEditModal] = useState(false);
  const [orderEditForm, setOrderEditForm] = useState({
    status: '',
    riderId: '',
    notes: '',
  });

  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [showBillEditModal, setShowBillEditModal] = useState(false);
  const [billEditForm, setBillEditForm] = useState({
    status: '',
    discountAmount: 0,
    voidReason: '',
  });

  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any | null>(null);
  const [menuItemForm, setMenuItemForm] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    isAvailable: true,
    isSpecial: false,
  });

  const showToast = (msg: string, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      loadTabData(activeTab);
    }
  }, [activeTab, user]);

  const loadTabData = async (tab: Tab) => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (tab === 'overview') {
        const [usersRes, custRes, ordersRes, billsRes] = await Promise.all([
          adminApi.getUsers(),
          adminApi.getCustomers(),
          adminApi.getOrders(),
          adminApi.getBills(),
        ]);
        const paidRevenue = billsRes.data
          .filter((b: any) => b.status === 'PAID')
          .reduce((sum: number, b: any) => sum + b.grandTotal, 0);

        setStats({
          totalRevenue: paidRevenue,
          activeOrdersCount: ordersRes.data.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
          totalStaffCount: usersRes.data.length,
          totalCustomersCount: custRes.data.length,
        });
      } else if (tab === 'staff') {
        const res = await adminApi.getUsers();
        setStaffList(res.data);
      } else if (tab === 'customers') {
        const res = await adminApi.getCustomers();
        setCustomersList(res.data);
      } else if (tab === 'orders') {
        const [ordersRes, usersRes] = await Promise.all([
          adminApi.getOrders(),
          adminApi.getUsers(),
        ]);
        setOrdersList(ordersRes.data);
        setStaffList(usersRes.data.filter((u: any) => u.role === 'RIDER'));
      } else if (tab === 'billing') {
        const res = await adminApi.getBills();
        setBillsList(res.data);
      } else if (tab === 'menu') {
        const [itemsRes, catRes] = await Promise.all([
          menuApi.getItems(),
          menuApi.getCategories(),
        ]);
        setMenuItems(itemsRes.data);
        setCategories(catRes.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch administrative data logs.', false);
    } finally {
      setLoading(false);
    }
  };

  // --- Staff Operations ---
  const handleOpenStaffModal = (staff: any = null) => {
    setSelectedStaff(staff);
    if (staff) {
      setStaffForm({
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        password: '',
        role: staff.role || 'STAFF',
      });
    } else {
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'STAFF',
      });
    }
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedStaff) {
        await adminApi.updateUser(selectedStaff.id, staffForm);
        showToast('Staff credentials updated successfully.');
      } else {
        await adminApi.createUser(staffForm);
        showToast('New staff account registered successfully.');
      }
      setShowStaffModal(false);
      loadTabData('staff');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save staff record.', false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this staff member?')) return;
    try {
      await adminApi.deleteUser(id);
      showToast('Staff account removed.');
      loadTabData('staff');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete staff member.', false);
    }
  };

  // --- Customer History Operations ---
  const handleViewCustomerDetails = async (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerOrdersLoading(true);
    try {
      const res = await adminApi.getCustomerOrders(cust.id);
      setCustomerOrders(res.data);
    } catch (err: any) {
      showToast('Failed to pull order logs.', false);
    } finally {
      setCustomerOrdersLoading(false);
    }
  };

  // --- Order Operations ---
  const handleOpenOrderEdit = (order: any) => {
    setSelectedOrder(order);
    setOrderEditForm({
      status: order.status || '',
      riderId: order.riderId || '',
      notes: order.notes || '',
    });
    setShowOrderEditModal(true);
  };

  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await adminApi.updateOrder(selectedOrder.id, orderEditForm);
      showToast(`Order #${selectedOrder.orderNumber} status updated.`);
      setShowOrderEditModal(false);
      loadTabData('orders');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update order status details.', false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Warning: Deleting this order will erase all related status logs and payments. Proceed?')) return;
    try {
      await adminApi.deleteOrder(id);
      showToast('Order wiped from database.');
      loadTabData('orders');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Wipe transaction failed.', false);
    }
  };

  // --- Bill Operations ---
  const handleOpenBillEdit = (bill: any) => {
    setSelectedBill(bill);
    setBillEditForm({
      status: bill.status || 'OPEN',
      discountAmount: bill.discountAmount || 0,
      voidReason: bill.voidReason || '',
    });
    setShowBillEditModal(true);
  };

  const handleSaveBillEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    try {
      await adminApi.updateBill(selectedBill.id, billEditForm);
      showToast(`Invoice updated successfully.`);
      setShowBillEditModal(false);
      loadTabData('billing');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update invoice billing records.', false);
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Warning: Wiping this invoice deletes its child billing payments. Proceed?')) return;
    try {
      await adminApi.deleteBill(id);
      showToast('Invoice document deleted.');
      loadTabData('billing');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to wipe bill record.', false);
    }
  };

  // --- Menu Operations ---
  const handleOpenMenuItemModal = (item: any = null) => {
    setSelectedMenuItem(item);
    if (item) {
      setMenuItemForm({
        name: item.name || '',
        description: item.description || '',
        price: item.price || 0,
        categoryId: item.categoryId || '',
        isAvailable: item.isAvailable ?? true,
        isSpecial: item.isSpecial ?? false,
      });
    } else {
      setMenuItemForm({
        name: '',
        description: '',
        price: 0,
        categoryId: categories[0]?.id || '',
        isAvailable: true,
        isSpecial: false,
      });
    }
    setShowMenuItemModal(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedMenuItem) {
        await menuApi.updateItem(selectedMenuItem.id, menuItemForm);
        showToast('Menu item updated.');
      } else {
        await menuApi.createItem(menuItemForm);
        showToast('New menu item created.');
      }
      setShowMenuItemModal(false);
      loadTabData('menu');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update menu details.', false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this dish item?')) return;
    try {
      await menuApi.deleteItem(id);
      showToast('Menu item deleted.');
      loadTabData('menu');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete menu item.', false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <ShieldAlert size={64} color="#A94442" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700 }}>Access Denied</h2>
        <p style={{ color: '#9E7B6D', marginTop: 8 }}>Only Super Admins can access the administrative console panel.</p>
      </div>
    );
  }

  // --- Filtering computations ---
  const filteredStaff = staffList.filter(
    (s) =>
      s.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.role?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const filteredCustomers = customersList.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredOrders = ordersList.filter(
    (o) =>
      o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.status?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const filteredBills = billsList.filter(
    (b) =>
      b.billNumber?.toLowerCase().includes(billSearch.toLowerCase()) ||
      b.status?.toLowerCase().includes(billSearch.toLowerCase())
  );

  const filteredMenuItems = menuItems.filter(
    (m) =>
      m.name?.toLowerCase().includes(menuSearch.toLowerCase()) ||
      m.description?.toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#2B1810' }}>
      {/* Toast Feedbacks */}
      {successMsg && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#1A3B2B', border: '1px solid #2D6A4F', color: '#D8F3DC', padding: '12px 24px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#5C1C1C', border: '1px solid #991B1B', color: '#FCA5A5', padding: '12px 24px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <AlertCircle size={15} /> {errorMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={28} color="#B57A3C" /> Admin Controls
        </h1>
        <p style={{ color: '#9E7B6D', fontSize: 14, marginTop: 4 }}>System configuration, rider controls, customer logs, and override options.</p>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(93,64,55,0.08)', paddingBottom: 12, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { key: 'overview', label: 'System Overview', icon: Eye },
          { key: 'staff', label: 'Staff & Riders', icon: Users },
          { key: 'customers', label: 'Customer Profiles', icon: Users },
          { key: 'orders', label: 'Order Controller', icon: ShoppingBag },
          { key: 'billing', label: 'Billing Invoices', icon: Receipt },
          { key: 'menu', label: 'Menu Catalog', icon: UtensilsCrossed },
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setSelectedCustomer(null);
                setActiveTab(t.key as Tab);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                border: 'none',
                background: isSelected ? 'linear-gradient(135deg,#3E2723,#5D4037)' : 'transparent',
                color: isSelected ? '#FAF8F5' : '#6D4C41',
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9E7B6D' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E8DCCB', borderTopColor: '#3E2723', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          Loading logs...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {[
                { label: 'Paid Revenue', val: `₹${stats.totalRevenue.toLocaleString()}`, color: '#4F7A54', bg: 'rgba(79,122,84,0.1)' },
                { label: 'Active Delivery Orders', val: stats.activeOrdersCount, color: '#0369A1', bg: '#E0F2FE' },
                { label: 'Registered Team Staff', val: stats.totalStaffCount, color: '#B57A3C', bg: 'rgba(181,122,60,0.1)' },
                { label: 'Customer Accounts', val: stats.totalCustomersCount, color: '#5D4037', bg: 'rgba(93,64,55,0.1)' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid rgba(93,64,55,0.08)', boxShadow: '0 2px 12px rgba(43,24,16,0.03)' }}>
                  <div style={{ fontSize: 13, color: '#9E7B6D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: STAFF & RIDERS */}
          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                  <Search size={15} color="#9E7B6D" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search name, email, or role..."
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 12, border: '1.5px solid rgba(93,64,55,0.12)', fontSize: 13 }}
                  />
                </div>
                <button
                  onClick={() => handleOpenStaffModal()}
                  style={{ background: '#2B1810', color: '#FAF8F5', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={15} /> Add Team Member
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {filteredStaff.map((s) => (
                  <div key={s.id} style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(93,64,55,0.09)', padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</h4>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#B57A3C', background: 'rgba(181,122,60,0.1)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', display: 'inline-block', marginTop: 4 }}>
                          {s.role}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleOpenStaffModal(s)} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5D4037' }}><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteStaff(s.id)} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A94442' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#9E7B6D', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div>✉️ {s.email}</div>
                      {s.phone && <div>📞 {s.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER PROFILES */}
          {activeTab === 'customers' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 340px' : '1fr', gap: 24 }}>
              <div>
                <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
                  <Search size={15} color="#9E7B6D" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name, phone, email..."
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 12, border: '1.5px solid rgba(93,64,55,0.12)', fontSize: 13 }}
                  />
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(93,64,55,0.08)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ background: '#FAF8F5', borderBottom: '1px solid rgba(93,64,55,0.08)', textAlign: 'left' }}>
                        <th style={{ padding: 14 }}>Customer Name</th>
                        <th style={{ padding: 14 }}>Contact Info</th>
                        <th style={{ padding: 14 }}>Joined At</th>
                        <th style={{ padding: 14 }}>Orders</th>
                        <th style={{ padding: 14 }}>Spent</th>
                        <th style={{ padding: 14 }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(93,64,55,0.04)' }}>
                          <td style={{ padding: 14, fontWeight: 700 }}>{c.name || 'Anonymous'}</td>
                          <td style={{ padding: 14, color: '#5D4037' }}>
                            <div>{c.email}</div>
                            <div style={{ fontSize: 12, color: '#9E7B6D' }}>{c.phone}</div>
                          </td>
                          <td style={{ padding: 14, color: '#9E7B6D' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                          <td style={{ padding: 14, fontWeight: 700 }}>{c.ordersCount}</td>
                          <td style={{ padding: 14, fontWeight: 700, color: '#4F7A54' }}>₹{c.totalSpent.toFixed(0)}</td>
                          <td style={{ padding: 14 }}>
                            <button
                              onClick={() => handleViewCustomerDetails(c)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B57A3C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}
                            >
                              History <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedCustomer && (
                <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.09)', padding: 20, height: 'fit-content' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Order History</h3>
                    <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E7B6D' }}><X size={16} /></button>
                  </div>
                  <div style={{ fontSize: 13, color: '#9E7B6D', marginBottom: 16 }}>
                    Customer: <strong>{selectedCustomer.name}</strong>
                  </div>

                  {customerOrdersLoading ? (
                    <div>Loading...</div>
                  ) : customerOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9E7B6D', padding: 24 }}>No order logs found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                      {customerOrders.map((o) => (
                        <div key={o.id} style={{ border: '1px solid rgba(93,64,55,0.08)', borderRadius: 12, padding: 12, background: '#FAF8F5' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>
                            <span>#{o.orderNumber}</span>
                            <span>₹{o.grandTotal.toFixed(0)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#9E7B6D' }}>
                            <span>{new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                            <span style={{ fontWeight: 600 }}>{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ORDER CONTROL */}
          {activeTab === 'orders' && (
            <div>
              <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
                <Search size={15} color="#9E7B6D" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order #, customer, status..."
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 12, border: '1.5px solid rgba(93,64,55,0.12)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredOrders.map((o) => (
                  <div key={o.id} style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(93,64,55,0.08)', padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h4 style={{ fontSize: 16, fontWeight: 700 }}>#{o.orderNumber}</h4>
                          <span style={{ fontSize: 11, background: '#E8DCCB', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{o.paymentMethod}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#9E7B6D', marginTop: 4 }}>ID: {o.id}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#B57A3C' }}>₹{o.grandTotal}</span>
                        <button onClick={() => handleOpenOrderEdit(o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5D4037' }}><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteOrder(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A94442' }}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, borderTop: '1px solid rgba(93,64,55,0.06)', paddingTop: 12, fontSize: 12.5 }}>
                      <div>
                        <div style={{ color: '#9E7B6D', marginBottom: 2 }}>Customer Details</div>
                        <div style={{ fontWeight: 600 }}>{o.customer?.name || 'Anonymous'}</div>
                        <div style={{ color: '#5D4037' }}>{o.customer?.phone}</div>
                      </div>
                      <div>
                        <div style={{ color: '#9E7B6D', marginBottom: 2 }}>Workflow Status</div>
                        <div style={{ fontWeight: 700, color: '#4F7A54' }}>{o.status}</div>
                        {o.rider && <div style={{ color: '#5D4037' }}>Rider: {o.rider.name}</div>}
                        {o.acceptedStaffName && (
                          <div style={{ color: '#9E7B6D', fontSize: 11, marginTop: 4 }}>
                            ✓ Accepted: {o.acceptedStaffName} ({new Date(o.acceptedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                          </div>
                        )}
                        {o.confirmedStaffName && (
                          <div style={{ color: '#9E7B6D', fontSize: 11 }}>
                            ✓ Prepared: {o.confirmedStaffName} ({new Date(o.confirmedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                          </div>
                        )}
                        {o.pickedUpAt && (
                          <div style={{ color: '#9E7B6D', fontSize: 11 }}>
                            ✓ Picked Up: {o.pickedUpRiderName || 'Rider'} ({new Date(o.pickedUpAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                          </div>
                        )}
                        {o.deliveredAt && (
                          <div style={{ color: '#9E7B6D', fontSize: 11 }}>
                            ✓ Delivered: {new Date(o.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ color: '#9E7B6D', marginBottom: 4 }}>KOT Security Token String</div>
                        <div style={{ background: '#FAF8F5', border: '1px solid rgba(93,64,55,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ wordBreak: 'break-all' }}>{o.kotToken}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(o.kotToken);
                              showToast('Token copied to clipboard.');
                            }}
                            style={{ flexShrink: 0, padding: '3px 8px', border: 'none', background: '#3E2723', color: '#FFF', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BILLING HISTORY */}
          {activeTab === 'billing' && (
            <div>
              <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
                <Search size={15} color="#9E7B6D" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  placeholder="Search invoice number, status..."
                  style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 12, border: '1.5px solid rgba(93,64,55,0.12)', fontSize: 13 }}
                />
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(93,64,55,0.08)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#FAF8F5', borderBottom: '1px solid rgba(93,64,55,0.08)', textAlign: 'left' }}>
                      <th style={{ padding: 12 }}>Invoice #</th>
                      <th style={{ padding: 12 }}>Table / Channel</th>
                      <th style={{ padding: 12 }}>Subtotal / Disc</th>
                      <th style={{ padding: 12 }}>Total Paid</th>
                      <th style={{ padding: 12 }}>Status</th>
                      <th style={{ padding: 12 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(93,64,55,0.04)' }}>
                        <td style={{ padding: 12, fontWeight: 700 }}>
                          <div>{b.billNumber || 'DRAFT'}</div>
                          <div style={{ fontSize: 10, color: '#9E7B6D', fontWeight: 400 }}>{b.id}</div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <div>Table: {b.table?.number || 'N/A'}</div>
                          <div style={{ fontSize: 11, color: '#9E7B6D' }}>{b.channel}</div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <div>₹{b.subtotal}</div>
                          <div style={{ fontSize: 11, color: '#A94442' }}>- ₹{b.discountAmount}</div>
                        </td>
                        <td style={{ padding: 12, fontWeight: 700, color: '#4F7A54' }}>₹{b.grandTotal}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: b.status === 'PAID' ? '#DCFCE7' : b.status === 'VOIDED' ? '#FEE2E2' : '#FEF3C7',
                            color: b.status === 'PAID' ? '#15803D' : b.status === 'VOIDED' ? '#B91C1C' : '#D97706',
                          }}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleOpenBillEdit(b)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5D4037' }}><Edit2 size={13} /></button>
                            <button onClick={() => handleDeleteBill(b.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A94442' }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: MENU CATALOG */}
          {activeTab === 'menu' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                  <Search size={15} color="#9E7B6D" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search menu item..."
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 12, border: '1.5px solid rgba(93,64,55,0.12)', fontSize: 13 }}
                  />
                </div>
                <button
                  onClick={() => handleOpenMenuItemModal()}
                  style={{ background: '#2B1810', color: '#FAF8F5', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={15} /> Add Menu Item
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                {filteredMenuItems.map((item) => (
                  <div key={item.id} style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid rgba(93,64,55,0.08)', padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</h4>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#B57A3C', flexShrink: 0 }}>₹{item.price}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: '#9E7B6D', marginTop: 4, lineHeight: 1.4 }}>{item.description}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid rgba(93,64,55,0.06)', paddingTop: 10 }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: item.isAvailable ? '#DCFCE7' : '#FEE2E2',
                        color: item.isAvailable ? '#15803D' : '#B91C1C',
                      }}>
                        {item.isAvailable ? 'Available' : 'Sold Out'}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleOpenMenuItemModal(item)} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5D4037' }}><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteMenuItem(item.id)} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A94442' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STAFF MODAL ── */}
      {showStaffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(43,24,16,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, border: '1px solid rgba(93,64,55,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedStaff ? 'Edit Staff Member' : 'Register New Staff'}</h3>
              <button onClick={() => setShowStaffModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E7B6D' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Phone Number</label>
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Password {selectedStaff && '(leave empty to keep current)'}</label>
                <input
                  type="password"
                  required={!selectedStaff}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>User Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, background: '#FFF' }}
                >
                  <option value="STAFF">STAFF (Cashier / Manager)</option>
                  <option value="RIDER">RIDER (Delivery Agent)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Owner)</option>
                </select>
              </div>

              <button type="submit" style={{ background: '#2B1810', color: '#FAF8F5', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Save Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ORDER EDIT MODAL ── */}
      {showOrderEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(43,24,16,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, border: '1px solid rgba(93,64,55,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Alter Order Details</h3>
              <button onClick={() => setShowOrderEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E7B6D' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveOrderEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Workflow Status Override</label>
                <select
                  value={orderEditForm.status}
                  onChange={(e) => setOrderEditForm({ ...orderEditForm, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, background: '#FFF' }}
                >
                  <option value="PLACED">PLACED</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="READY">READY</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Assign Rider</label>
                <select
                  value={orderEditForm.riderId}
                  onChange={(e) => setOrderEditForm({ ...orderEditForm, riderId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, background: '#FFF' }}
                >
                  <option value="">No Rider Assigned</option>
                  {staffList.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Special Instructions</label>
                <textarea
                  value={orderEditForm.notes}
                  onChange={(e) => setOrderEditForm({ ...orderEditForm, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, fontFamily: 'sans-serif' }}
                />
              </div>

              <button type="submit" style={{ background: '#2B1810', color: '#FAF8F5', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Override Order Parameters
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BILL EDIT MODAL ── */}
      {showBillEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(43,24,16,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, border: '1px solid rgba(93,64,55,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Alter Billing Invoice</h3>
              <button onClick={() => setShowBillEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E7B6D' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveBillEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Payment Status</label>
                <select
                  value={billEditForm.status}
                  onChange={(e) => setBillEditForm({ ...billEditForm, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, background: '#FFF' }}
                >
                  <option value="OPEN">OPEN (Unpaid)</option>
                  <option value="PAID">PAID</option>
                  <option value="VOIDED">VOIDED</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Applied Discount (₹)</label>
                <input
                  type="number"
                  value={billEditForm.discountAmount}
                  onChange={(e) => setBillEditForm({ ...billEditForm, discountAmount: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              {billEditForm.status === 'VOIDED' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#A94442', marginBottom: 4 }}>Reason for Voiding</label>
                  <input
                    type="text"
                    required
                    value={billEditForm.voidReason}
                    onChange={(e) => setBillEditForm({ ...billEditForm, voidReason: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #FCA5A5', fontSize: 13 }}
                  />
                </div>
              )}

              <button type="submit" style={{ background: '#2B1810', color: '#FAF8F5', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Apply Invoice Overrides
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MENU ITEM MODAL ── */}
      {showMenuItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(43,24,16,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, border: '1px solid rgba(93,64,55,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedMenuItem ? 'Edit Dish Catalog' : 'Add New Item'}</h3>
              <button onClick={() => setShowMenuItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E7B6D' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Item Name</label>
                <input
                  type="text"
                  required
                  value={menuItemForm.name}
                  onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Price (₹)</label>
                <input
                  type="number"
                  required
                  value={menuItemForm.price}
                  onChange={(e) => setMenuItemForm({ ...menuItemForm, price: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Description</label>
                <textarea
                  value={menuItemForm.description}
                  onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, fontFamily: 'sans-serif' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#5D4037', marginBottom: 4 }}>Category</label>
                <select
                  value={menuItemForm.categoryId}
                  onChange={(e) => setMenuItemForm({ ...menuItemForm, categoryId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(93,64,55,0.15)', fontSize: 13, background: '#FFF' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={menuItemForm.isAvailable}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, isAvailable: e.target.checked })}
                  />
                  Is Available
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={menuItemForm.isSpecial}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, isSpecial: e.target.checked })}
                  />
                  Featured Special
                </label>
              </div>

              <button type="submit" style={{ background: '#2B1810', color: '#FAF8F5', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Save Menu Item
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
