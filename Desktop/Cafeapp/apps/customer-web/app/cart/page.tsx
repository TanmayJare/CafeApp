'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const [couponCode, setCouponCode] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, []);

  const calculateBill = () => {
    const subtotal = getTotal();
    const deliveryFee = 0; // Free delivery
    const platformFee = 5;
    const gst = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + deliveryFee + platformFee + gst;

    return {
      subtotal,
      deliveryFee,
      platformFee,
      gst,
      total,
    };
  };

  const bill = calculateBill();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-900 text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors font-medium"
            >
              Browse Menu
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Your cart</h1>
          <p className="text-sm text-gray-600">from CafeConnect</p>
        </div>

        {/* Cart Items */}
        <div className="space-y-4 mb-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 flex items-start gap-3">
              {/* Item Image */}
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">☕</span>
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                {item.customizations && (
                  <p className="text-xs text-gray-500 mt-1">{item.customizations}</p>
                )}
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-gray-900">₹{(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Coupon Input */}
        <div className="mb-6">
          <button className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 px-4 text-left text-gray-600 hover:border-gray-400 transition-colors">
            Apply coupon or promo code
          </button>
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">BILL SUMMARY</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{bill.subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery fee</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform fee</span>
              <span>₹{bill.platformFee}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span>₹{bill.gst}</span>
            </div>
            
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>₹{bill.total}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Tower B - Flat 903</h3>
              <button
                onClick={() => router.push('/checkout')}
                className="text-sm text-blue-600 hover:underline"
              >
                Change or add address
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-20">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/checkout')}
            className="w-full bg-gray-900 text-white rounded-xl py-4 px-6 flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <span className="font-semibold">Proceed to pay</span>
            <span className="font-bold">₹{bill.total}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
