'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  user: {
    email: string;
    name: string | null;
  };
}

const statusColors = {
  PLACED: 'bg-blue-500',
  ACCEPTED: 'bg-purple-500',
  PREPARING: 'bg-yellow-500',
  READY: 'bg-green-500',
  DELIVERED: 'bg-gray-500',
  CANCELLED: 'bg-red-500',
};

const statusLabels = {
  PLACED: 'New Order',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    fetchOrders();
    
    // Initialize Socket.IO connection
    if (accessToken) {
      const newSocket = io('http://localhost:3000/orders', {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        setConnectionStatus('connected');
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        setConnectionStatus('disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setConnectionStatus('disconnected');
      });

      // Listen for new orders
      newSocket.on('order:new', (order: Order) => {
        console.log('🔔 New order received:', order);
        setOrders((prev) => [order, ...prev]);
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order!', {
            body: `Order #${order.orderNumber} - ₹${order.totalAmount}`,
            icon: '/favicon.ico',
          });
        }
      });

      // Listen for order status updates
      newSocket.on('order:status', (data: { orderId: string; status: Order['status'] }) => {
        console.log('📦 Order status updated:', data);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === data.orderId ? { ...order, status: data.status } : order
          )
        );
      });

      setSocket(newSocket);

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      return () => {
        newSocket.close();
      };
    }
  }, [accessToken]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      // The socket will handle the UI update
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const statusFlow: Record<Order['status'], Order['status'] | null> = {
      PLACED: 'ACCEPTED',
      ACCEPTED: 'PREPARING',
      PREPARING: 'READY',
      READY: 'DELIVERED',
      DELIVERED: null,
      CANCELLED: null,
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus: Order['status']): string => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return '';
    return statusLabels[nextStatus];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage incoming orders in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            {connectionStatus === 'connected' ? 'Live' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             'Disconnected'}
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 text-lg">No orders yet</p>
            <p className="text-gray-400 text-sm mt-2">New orders will appear here automatically</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Order #{order.orderNumber}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <Badge className={`${statusColors[order.status]} text-white`}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-3">Items</h3>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.menuItem.name}
                            {item.customizations && (
                              <span className="text-gray-500 text-xs ml-2">
                                ({item.customizations})
                              </span>
                            )}
                          </span>
                          <span className="font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{order.totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Delivery Info */}
                  <div>
                    <h3 className="font-semibold mb-3">Delivery Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <p className="font-medium">{order.user?.name || order.user?.email || 'N/A'}</p>
                      </div>
                      {order.customerPhone && (
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium">{order.customerPhone}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Address:</span>
                        <p className="font-medium">{order.deliveryAddress}</p>
                      </div>
                      {order.specialInstructions && (
                        <div>
                          <span className="text-gray-600">Special Instructions:</span>
                          <p className="font-medium text-orange-600">{order.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  {getNextStatus(order.status) && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                      className="flex-1"
                    >
                      Mark as {getNextStatusLabel(order.status)}
                    </Button>
                  )}
                  {order.status === 'PLACED' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Made with Bob