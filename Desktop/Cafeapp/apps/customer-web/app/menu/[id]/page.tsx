'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import { ArrowLeft, Minus, Plus } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
  };
}

export default function MenuItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<'regular' | 'large'>('regular');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Size options with prices
  const sizeOptions = [
    { id: 'regular', label: 'Regular', price: 0 },
    { id: 'large', label: 'Large', price: 40 },
  ];

  // Add-on options
  const addonOptions = [
    { id: 'extra-shot', label: 'Extra shot', price: 40 },
    { id: 'oat-milk', label: 'Oat milk', price: 30 },
    { id: 'sugar-free', label: 'Sugar-free', price: 0 },
  ];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchItem();
  }, [params.id]);

  const fetchItem = async () => {
    try {
      const response = await api.get(`/api/menu/items/${params.id}`);
      setItem(response.data);
    } catch (error) {
      console.error('Failed to fetch item:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    if (!item) return 0;
    
    let total = item.price;
    
    // Add size price
    const sizePrice = sizeOptions.find(s => s.id === selectedSize)?.price || 0;
    total += sizePrice;
    
    // Add addon prices
    selectedAddons.forEach(addonId => {
      const addon = addonOptions.find(a => a.id === addonId);
      if (addon) total += addon.price;
    });
    
    return total * quantity;
  };

  const handleAddToCart = () => {
    if (!item) return;
    
    const customizations = [];
    if (selectedSize === 'large') customizations.push('Large');
    selectedAddons.forEach(addonId => {
      const addon = addonOptions.find(a => a.id === addonId);
      if (addon) customizations.push(addon.label);
    });
    
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: calculateTotal() / quantity,
      quantity,
      customizations: customizations.join(', '),
    });
    
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Item not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Product Image */}
        <div className="relative h-64 bg-gradient-to-br from-amber-50 to-orange-50">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-contain p-8"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">☕</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 px-6 py-6 min-h-[calc(100vh-16rem)]">
          {/* Title and Price */}
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900 flex-1">{item.name}</h1>
            <span className="text-2xl font-bold text-gray-900">₹{item.price}</span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Size Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">SIZE</h3>
            <div className="flex gap-3">
              {sizeOptions.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id as 'regular' | 'large')}
                  className={`flex-1 py-3 px-4 rounded-full font-medium transition-colors ${
                    selectedSize === size.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  {size.label} • ₹{item.price + size.price}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">ADD-ONS</h3>
            <div className="space-y-2">
              {addonOptions.map((addon) => (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`w-full py-3 px-4 rounded-full font-medium text-left flex items-center justify-between transition-colors ${
                    selectedAddons.includes(addon.id)
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <span>{addon.label}</span>
                  <span>{addon.price > 0 ? `+₹${addon.price}` : 'Free'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!item.isAvailable}
            className={`w-full py-4 rounded-full font-semibold text-lg transition-colors ${
              item.isAvailable
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {item.isAvailable
              ? `Add to cart • ₹${calculateTotal()}`
              : 'Currently Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
