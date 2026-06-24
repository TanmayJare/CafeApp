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
    credentials: true,
  },
  namespace: '/orders',
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

      // Join staff room if user is staff/admin
      if (client.userRole === 'STAFF' || client.userRole === 'ADMIN') {
        client.join('staff');
        this.logger.log(`Client ${client.id} joined staff room`);
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

  // Emit new order to staff
  emitNewOrder(order: any) {
    this.server.to('staff').emit('order:new', order);
    this.logger.log(`Emitted new order ${order.id} to staff`);
  }

  // Emit order status update
  emitOrderStatusUpdate(orderId: string, status: string, order: any) {
    // Emit to specific order room (customer tracking)
    this.server.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status,
      order,
    });

    // Also emit to staff room
    this.server.to('staff').emit('order:status', {
      orderId,
      status,
      order,
    });

    this.logger.log(`Emitted status update for order ${orderId}: ${status}`);
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
