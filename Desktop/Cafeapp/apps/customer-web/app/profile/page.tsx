'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ArrowLeft, MapPin, Package, ChevronRight, LogOut } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, token, refreshToken, setAuth } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleUpdateName = async () => {
    if (!nameVal.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch('/auth/me', { name: nameVal.trim() });
      if (user && token) {
        setAuth({ ...user, name: res.data.name }, token, refreshToken || undefined);
      }
      setEditingName(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [addressRes, ordersRes] = await Promise.all([
        api.get('/address'),
        api.get('/orders'),
      ]);
      setAddresses(addressRes.data);
      setOrderCount(ordersRes.data.length);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getInitials = () => {
    const name = user?.name;
    if (!name) return user?.email?.[0]?.toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* User Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="border rounded px-2 py-1 text-sm text-gray-900 w-full"
                  placeholder="Enter your name"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={saving}
                  className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-gray-500 text-xs px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 text-lg truncate">
                  {user?.name || 'Guest'}
                </h2>
                <button
                  onClick={() => { setNameVal(user?.name || ''); setEditingName(true); }}
                  className="text-xs text-blue-600 font-semibold"
                >
                  {user?.name ? 'Edit' : 'Set Name'}
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-sm text-gray-500 mt-1">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{addresses.length}</p>
            <p className="text-sm text-gray-500 mt-1">Saved Addresses</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => router.push('/orders')}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">My Orders</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => router.push('/addresses/new')}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium text-gray-900">Add Address</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Saved Addresses */}
        {!loadingAddresses && addresses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Saved Addresses</h3>
            </div>
            {addresses.map((addr, i) => (
              <div
                key={addr.id}
                className={`px-4 py-3 flex items-start gap-3 ${
                  i < addresses.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{addr.label}</p>
                    {addr.isDefault && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ''} — {addr.city}, {addr.pincode}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-white rounded-xl px-4 py-4 shadow-sm text-red-600 font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <button onClick={() => router.push('/')} className="flex flex-col items-center gap-1 py-2 px-4">
              <span className="text-xl">🏠</span>
              <span className="text-xs text-gray-500">Home</span>
            </button>
            <button onClick={() => router.push('/menu')} className="flex flex-col items-center gap-1 py-2 px-4">
              <span className="text-xl">📋</span>
              <span className="text-xs text-gray-500">Menu</span>
            </button>
            <button onClick={() => router.push('/cart')} className="flex flex-col items-center gap-1 py-2 px-4">
              <span className="text-xl">🛒</span>
              <span className="text-xs text-gray-500">Cart</span>
            </button>
            <button onClick={() => router.push('/orders')} className="flex flex-col items-center gap-1 py-2 px-4">
              <span className="text-xl">📦</span>
              <span className="text-xs text-gray-500">Orders</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2 px-4">
              <span className="text-xl">👤</span>
              <span className="text-xs font-medium text-gray-900">Profile</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

// Made with Bob
