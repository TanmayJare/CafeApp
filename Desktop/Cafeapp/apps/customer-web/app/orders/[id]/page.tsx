'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { MapPin, Clock } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  customizations: string | null;
  menuItem: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  deliveryAddress: string;
  customerPhone: string | null;
  specialInstructions: string | null;
  createdAt: string;
  items: OrderItem[];
}

const statusSteps = [
  { key: 'PLACED', label: 'Order placed', time: '10:01 AM' },
  { key: 'ACCEPTED', label: 'Accepted by café', time: '10:03 AM' },
  { key: 'PREPARING', label: 'Preparing your order', time: 'In progress' },
  { key: 'READY', label: 'Ready for pickup', time: '' },
  { key: 'DELIVERED', label: 'Delivered', time: '' },
];

export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { token, isAuthenticated } = useAuthStore();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrder();

    // Initialize Socket.IO connection
    if (token) {
      const newSocket = io('http://localhost:3000/orders', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        newSocket.emit('join-order', orderId);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
      });

      newSocket.on('order:status', (data: { orderId: string; status: Order['status'] }) => {
        console.log('📦 Order status updated:', data);
        if (data.orderId === orderId) {
          setOrder((prev) => prev ? { ...prev, status: data.status } : null);
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.emit('leave-order', orderId);
        newSocket.close();
      };
    }
  }, [orderId, token]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'CANCELLED') return -1;
    return statusSteps.findIndex((step) => step.key === order.status);
  };

  const getEstimatedTime = () => {
    if (!order) return '';
    const currentStep = getCurrentStepIndex();
    
    if (order.status === 'DELIVERED') return 'Delivered';
    if (order.status === 'CANCELLED') return 'Cancelled';
    if (order.status === 'READY') return 'Ready now';
    
    const minutesRemaining = (4 - currentStep) * 5;
    return `${minutesRemaining}-${minutesRemaining + 5} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Order not found</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="px-4 py-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">10:02</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">{order.orderNumber}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Being prepared</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Arriving by</span>
            <span className="font-semibold text-blue-600">10:28 AM</span>
            <span className="text-gray-600">• est. {getEstimatedTime()}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="px-4 py-6">
          <div className="relative">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isLast = index === statusSteps.length - 1;

              return (
                <div key={step.key} className="flex gap-4 pb-8 last:pb-0">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    {/* Circle */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? 'bg-green-600'
                          : isCurrent
                          ? 'bg-gray-900'
                          : 'bg-gray-200'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-white' : 'bg-gray-400'}`} />
                      )}
                    </div>
                    
                    {/* Vertical Line */}
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 mt-2 ${
                          isCompleted ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                        style={{ minHeight: '40px' }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <h3
                      className={`font-semibold ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </h3>
                    {step.time && (
                      <p className="text-sm text-gray-500 mt-1">{step.time}</p>
                    )}
                    {isCurrent && (
                      <p className="text-sm text-gray-600 mt-1">In progress</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="px-4 py-6 border-t">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">DELIVERING TO</h3>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Tower B, Floor 9, Flat 903</h4>
                <p className="text-sm text-gray-600 mt-1">Sunshine Society, Pune 411001</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="px-4 py-6 border-t">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">ORDER SUMMARY</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">{item.menuItem.name}</span>
                  {item.customizations && (
                    <p className="text-xs text-gray-500 mt-1">{item.customizations}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <span className="text-gray-900">₹{item.price * item.quantity}</span>
                  <p className="text-xs text-gray-500">× {item.quantity}</p>
                </div>
              </div>
            ))}
            
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total paid</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
