import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/orders',
  transports: ['polling', 'websocket'],
})
export class OrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.logger.log(`Client connected: ${client.id} (User: ${client.userId}, Role: ${client.userRole})`);

      // Staff/Admin join both 'staff' and 'menu' rooms
      if (client.userRole === 'STAFF' || client.userRole === 'ADMIN' || client.userRole === 'SUPER_ADMIN') {
        client.join('staff');
        client.join('menu');
        this.logger.log(`Client ${client.id} joined staff + menu rooms`);
      }

      // Customers and Riders join their personal room for targeted events
      if (client.userRole === 'CUSTOMER' || client.userRole === 'RIDER') {
        client.join(`customer:${client.userId}`);
        this.logger.log(`Client ${client.id} joined customer:${client.userId} room`);
      }
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-order')
  handleJoinOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() orderId: string,
  ) {
    client.join(`order:${orderId}`);
    this.logger.log(`Client ${client.id} joined order room: ${orderId}`);
    return { event: 'joined-order', data: orderId };
  }

  @SubscribeMessage('leave-order')
  handleLeaveOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() orderId: string,
  ) {
    client.leave(`order:${orderId}`);
    this.logger.log(`Client ${client.id} left order room: ${orderId}`);
    return { event: 'left-order', data: orderId };
  }

  // Emit new order to staff AND the placing customer
  emitNewOrder(order: any) {
    this.server.to('staff').emit('order:new', order);
    if (order.customerId) {
      this.server.to(`customer:${order.customerId}`).emit('order:new', order);
    }
    this.logger.log(`Emitted new order ${order.id} to staff + customer:${order.customerId}`);
  }

  // Emit order status update to order room, staff room, and the customer's personal room
  emitOrderStatusUpdate(orderId: string, status: string, order: any) {
    const payload = { orderId, status, order };
    this.server.to(`order:${orderId}`).emit('order:status', payload);
    this.server.to('staff').emit('order:status', payload);
    if (order.customerId) {
      this.server.to(`customer:${order.customerId}`).emit('order:status', payload);
    }
    this.logger.log(`Emitted status update for order ${orderId}: ${status}`);
  }

  // Emit menu item availability change to all staff in the menu room
  emitMenuItemUpdated(menuItemId: string, isAvailable: boolean) {
    this.server.to('menu').emit('menu:item_updated', {
      menuItemId,
      isAvailable,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(`Emitted menu:item_updated for item ${menuItemId}`);
  }

  // Emit specials change to menu room (staff) and all customers via broadcast
  emitSpecialsUpdated(action: 'created' | 'updated' | 'deleted', special: any) {
    const payload = { action, special };
    this.server.to('menu').emit('menu:specials_updated', payload);
    // Broadcast to all connected sockets so customers on home screen get the push
    this.server.emit('menu:specials_updated', payload);
    this.logger.log(`Emitted menu:specials_updated (${action}) for special ${special?.id}`);
  }

  // Emit cart update to the owning customer's personal room
  emitCartUpdated(userId: string, cart: any) {
    this.server.to(`customer:${userId}`).emit('cart:updated', { cart });
    this.logger.log(`Emitted cart:updated to customer:${userId}`);
  }

  // Emit revenue delta to staff dashboard
  emitRevenueUpdated(delta: number, newTotal: number) {
    this.server.to('staff').emit('revenue:updated', { delta, newTotal });
    this.logger.log(`Emitted revenue:updated delta=${delta} newTotal=${newTotal}`);
  }

  // Emit notification
  emitNotification(userId: string, notification: any) {
    this.server.emit('notification', {
      userId,
      ...notification,
    });
    this.logger.log(`Emitted notification to user ${userId}`);
  }
}

// Made with Bob
