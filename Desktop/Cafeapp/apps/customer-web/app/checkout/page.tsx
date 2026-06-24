'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';

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
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('/api/address');
      setAddresses(response.data);
      const defaultAddr = response.data.find((a: Address) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAddressDetails = () => {
    return addresses.find((a) => a.id === selectedAddress);
  };

  const calculateTotal = () => {
    const subtotal = getTotal();
    const address = getSelectedAddressDetails();
    const deliveryFee = address?.deliveryFee || 0;
    return subtotal + deliveryFee;
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setError('Please select a delivery address');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // Create order
      const orderData = {
        addressId: selectedAddress,
        paymentMethod,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          // options field can be added here if needed in the future
        })),
      };

      const response = await api.post('/api/orders', orderData);
      const order = response.data;

      // Clear cart
      clearCart();

      // Redirect to order tracking
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Checkout</h1>
            <button
              onClick={() => router.push('/cart')}
              className="text-primary hover:text-primary-dark"
            >
              ← Back to Cart
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Delivery Address */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Delivery Address</h2>
            <button
              onClick={() => router.push('/addresses/new')}
              className="text-primary hover:text-primary-dark text-sm font-medium"
            >
              + Add New
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No addresses found</p>
              <button
                onClick={() => router.push('/addresses/new')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Add Address
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedAddress === address.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={selectedAddress === address.id}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{address.label}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {address.addressLine1}
                        {address.addressLine2 && `, ${address.addressLine2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                      <p className="text-sm text-primary mt-2">
                        {address.deliveryZone} Zone • Delivery Fee: ₹{address.deliveryFee}
                      </p>
                    </div>
                    {address.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
          <div className="space-y-3">
            <label className="block p-4 border-2 rounded-lg cursor-pointer transition-colors border-primary bg-primary/5">
              <input
                type="radio"
                name="payment"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={(e) => setPaymentMethod(e.target.value as 'COD')}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Cash on Delivery</p>
                  <p className="text-sm text-gray-600">Pay when you receive your order</p>
                </div>
                <span className="text-2xl">💵</span>
              </div>
            </label>

            <label className="block p-4 border-2 rounded-lg cursor-not-allowed opacity-50 border-gray-200">
              <input
                type="radio"
                name="payment"
                value="ONLINE"
                disabled
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Online Payment</p>
                  <p className="text-sm text-gray-600">Coming soon (Razorpay)</p>
                </div>
                <span className="text-2xl">💳</span>
              </div>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-gray-900">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">₹{getTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="text-gray-900">
                  ₹{(getSelectedAddressDetails()?.deliveryFee ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={submitting || !selectedAddress || addresses.length === 0}
          className="w-full bg-primary text-white py-4 rounded-lg hover:bg-primary-dark transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Placing Order...' : `Place Order • ₹${calculateTotal().toFixed(2)}`}
        </button>
      </main>
    </div>
  );
}

// Made with Bob
