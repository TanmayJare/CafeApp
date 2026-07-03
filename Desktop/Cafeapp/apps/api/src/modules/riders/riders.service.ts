import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { PostLocationDto } from './dto/post-location.dto';

// Throttle: persist location at most once per 3 seconds per rider
const locationThrottle = new Map<string, number>();

@Injectable()
export class RidersService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
  ) {}

  // ── GET /riders/available-orders ─────────────────────────────────────────
  async getAvailableOrders(riderId: string) {
    // Confirm rider is online
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId: riderId },
    });
    if (!profile?.isOnline) return [];

    return this.prisma.order.findMany({
      where: { status: 'READY', riderId: null },
      include: {
        items: { select: { name: true, quantity: true } },
        address: true,
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── PATCH /riders/online ──────────────────────────────────────────────────
  async setOnline(riderId: string, isOnline: boolean) {
    const profile = await this.prisma.riderProfile.upsert({
      where: { userId: riderId },
      update: { isOnline },
      create: { userId: riderId, isOnline },
    });
    return { isOnline: profile.isOnline };
  }

  // ── POST /riders/location ─────────────────────────────────────────────────
  async postLocation(riderId: string, dto: PostLocationDto) {
    const now = Date.now();
    const last = locationThrottle.get(riderId) ?? 0;
    if (now - last < 3000) return { throttled: true };
    locationThrottle.set(riderId, now);

    await this.prisma.riderLocation.create({
      data: {
        riderId,
        orderId: dto.orderId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed,
      },
    });

    // Broadcast to the order room so the customer tracking screen updates live
    this.ordersGateway.server
      .to(`order:${dto.orderId}`)
      .emit('rider:location', {
        orderId: dto.orderId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed ?? 0,
      });

    return { saved: true };
  }

  // ── PATCH /orders/:id/assign ──────────────────────────────────────────────
  async assignOrder(riderId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'READY') {
      throw new BadRequestException(
        `Cannot assign order with status ${order.status}`,
      );
    }
    if (order.riderId) {
      throw new BadRequestException('Order already assigned to another rider');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'ASSIGNED',
        riderId,
        statusHistory: {
          create: { status: 'ASSIGNED', note: 'Rider accepted delivery' },
        },
      },
      include: {
        items: { select: { name: true, quantity: true, unitPrice: true } },
        address: true,
        customer: { select: { name: true, phone: true, email: true } },
      },
    });

    // Notify customer
    this.ordersGateway.emitOrderStatusUpdate(orderId, 'ASSIGNED', updated);

    return updated;
  }

  // ── PATCH /orders/:id/pickup ──────────────────────────────────────────────
  async pickupOrder(riderId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your order');
    if (order.status !== 'ASSIGNED') {
      throw new BadRequestException(
        `Cannot pick up order with status ${order.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'OUT_FOR_DELIVERY',
        statusHistory: {
          create: { status: 'OUT_FOR_DELIVERY', note: 'Rider picked up order' },
        },
      },
      include: {
        items: { select: { name: true, quantity: true, unitPrice: true } },
        address: true,
        customer: { select: { name: true, phone: true, email: true } },
      },
    });

    this.ordersGateway.emitOrderStatusUpdate(orderId, 'OUT_FOR_DELIVERY', updated);
    return updated;
  }

  // ── PATCH /orders/:id/deliver ─────────────────────────────────────────────
  async deliverOrder(riderId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.riderId !== riderId) throw new ForbiddenException('Not your order');
    if (order.status !== 'OUT_FOR_DELIVERY') {
      throw new BadRequestException(
        `Cannot deliver order with status ${order.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        statusHistory: {
          create: { status: 'DELIVERED', note: 'Order delivered' },
        },
      },
      include: {
        items: { select: { name: true, quantity: true, unitPrice: true, lineTotal: true } },
        address: true,
        customer: { select: { name: true, phone: true, email: true } },
      },
    });

    this.ordersGateway.emitOrderStatusUpdate(orderId, 'DELIVERED', updated);
    return updated;
  }

  // ── GET /riders/earnings ──────────────────────────────────────────────────
  async getEarnings(riderId: string) {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayOrders, weekOrders, monthOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          riderId,
          status: 'DELIVERED',
          deliveredAt: { gte: startOfDay },
        },
        select: { id: true, orderNumber: true, grandTotal: true, deliveredAt: true, address: true },
        orderBy: { deliveredAt: 'desc' },
      }),
      this.prisma.order.aggregate({
        where: { riderId, status: 'DELIVERED', deliveredAt: { gte: startOfWeek } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { riderId, status: 'DELIVERED', deliveredAt: { gte: startOfMonth } },
        _sum: { grandTotal: true },
        _count: true,
      }),
    ]);

    // Platform takes 10% — rider earns 90%
    const riderShare = (amount: number) => Math.round(amount * 0.9 * 100) / 100;

    return {
      today: riderShare(todayOrders.reduce((s, o) => s + o.grandTotal, 0)),
      todayCount: todayOrders.length,
      week: riderShare(weekOrders._sum.grandTotal ?? 0),
      weekCount: weekOrders._count,
      month: riderShare(monthOrders._sum.grandTotal ?? 0),
      monthCount: monthOrders._count,
      deliveriesToday: todayOrders.map((o) => ({
        ...o,
        earnings: riderShare(o.grandTotal),
      })),
    };
  }
}

// Made with Bob
