'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import { Search, ShoppingCart, MapPin } from 'lucide-react';

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

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

interface DailySpecial {
  id: string;
  menuItem: MenuItem;
  specialPrice: number;
  availableFrom: string;
  availableUntil: string;
}

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { items: cartItems, addItem, getItemCount, getTotalPrice } = useCartStore();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dailySpecials, setDailySpecials] = useState<DailySpecial[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes, specialsRes] = await Promise.all([
        api.get('/api/menu/categories'),
        api.get('/api/menu/items'),
        api.get('/api/menu/daily-specials'),
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(itemsRes.data);
      setDailySpecials(specialsRes.data);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem, isSpecial?: boolean, specialPrice?: number) => {
    router.push(`/menu/${item.id}`);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category.id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold">CafeConnect</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>Tower B, Flat 903</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/profile')}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
              >
                <span className="text-sm font-medium">{user?.name?.[0] || 'U'}</span>
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
              >
                <span className="text-sm">📋</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Search */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="mb-4">
            <div className="inline-block bg-green-600 text-white text-xs px-3 py-1 rounded-full mb-2">
              🎉 Free delivery in your society • Open - Closes 11 PM
            </div>
            <h2 className="text-2xl font-bold mb-1">What are you craving today?</h2>
            <p className="text-sm text-gray-300">Delivered in 20-35 min</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for coffee, food, snacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Offers Section */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Offers</h3>
          <button className="text-sm text-blue-600">See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex-shrink-0 w-40 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-4">
            <div className="text-xs mb-1 text-gray-300">TODAY ONLY</div>
            <div className="font-bold text-lg mb-1">Flat 20% on your first order</div>
          </div>
          <div className="flex-shrink-0 w-40 bg-gradient-to-br from-green-700 to-green-600 text-white rounded-xl p-4">
            <div className="text-xs mb-1 text-green-100">SOCIETY PERK</div>
            <div className="font-bold text-lg mb-1">Free delivery on all orders</div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Today's Specials */}
      {dailySpecials.length > 0 && (
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">Today's Specials</h3>
            <button className="text-sm text-blue-600">See all</button>
          </div>
          <div className="space-y-3">
            {dailySpecials.slice(0, 3).map((special) => (
              <div
                key={special.id}
                onClick={() => handleAddToCart(special.menuItem, true, special.specialPrice)}
                className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                  {special.menuItem.imageUrl ? (
                    <img
                      src={special.menuItem.imageUrl}
                      alt={special.menuItem.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-2xl">☕</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">● {special.menuItem.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{special.menuItem.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="font-bold text-sm">₹{special.specialPrice}</div>
                      {special.specialPrice < special.menuItem.price && (
                        <div className="text-xs text-gray-400 line-through">₹{special.menuItem.price}</div>
                      )}
                    </div>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Items */}
      <div className="max-w-md mx-auto px-4 py-4">
        <h3 className="font-bold text-lg mb-3">All Items</h3>
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleAddToCart(item)}
                className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-2xl">☕</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">● {item.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                    </div>
                    <div className="font-bold text-sm flex-shrink-0">₹{item.price}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(item);
                  }}
                  disabled={!item.isAvailable}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.isAvailable
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {getItemCount() > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-50 px-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => router.push('/cart')}
              className="w-full bg-gray-900 text-white rounded-xl py-4 px-6 flex items-center justify-between shadow-lg hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white text-gray-900 rounded-lg flex items-center justify-center font-bold">
                  {getItemCount()}
                </div>
                <span className="font-medium">View cart</span>
              </div>
              <span className="font-bold">₹{getTotalPrice()}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <button className="flex flex-col items-center gap-1 py-2 px-4">
              <span className="text-xl">🏠</span>
              <span className="text-xs font-medium text-gray-900">Home</span>
            </button>
            <button
              onClick={() => router.push('/menu')}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <span className="text-xl">📋</span>
              <span className="text-xs text-gray-500">Menu</span>
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <span className="text-xl">🛒</span>
              <span className="text-xs text-gray-500">Cart</span>
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <span className="text-xl">📦</span>
              <span className="text-xs text-gray-500">Orders</span>
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="flex flex-col items-center gap-1 py-2 px-4"
            >
              <span className="text-xl">👤</span>
              <span className="text-xs text-gray-500">Profile</span>
            </button>
          </div>
        </div>
      </nav>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// Made with Bob
