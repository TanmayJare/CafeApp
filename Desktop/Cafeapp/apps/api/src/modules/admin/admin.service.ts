import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole, OrderStatus, BillStatus, PaymentStatus } from '@cafeconnect/database';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'cafeconnect-kot-secret';
  }

  // --- Users Management ---
  async getUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.STAFF, UserRole.RIDER, UserRole.SUPER_ADMIN],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(data: any) {
    const { email, password, name, phone, role } = data;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password || 'cafestaff2024', 10);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        role: role as UserRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });
  }

  async updateUser(id: string, data: any) {
    const { email, password, name, phone, role } = data;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {
      email,
      name,
      phone: phone || null,
      role: role as UserRole,
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.order.updateMany({
      where: { riderId: id },
      data: { riderId: null },
    });

    return this.prisma.user.delete({ where: { id } });
  }

  // --- Customers Directory ---
  async getCustomers() {
    const customers = await this.prisma.user.findMany({
      where: { role: UserRole.CUSTOMER },
      include: {
        orders: {
          select: {
            grandTotal: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => {
      const orders = c.orders || [];
      const totalSpent = orders
        .filter((o) => o.status === OrderStatus.DELIVERED)
        .reduce((sum, o) => sum + o.grandTotal, 0);

      return {
        id: c.id,
        email: c.email,
        name: c.name,
        phone: c.phone,
        createdAt: c.createdAt,
        ordersCount: orders.length,
        totalSpent,
      };
    });
  }

  async getCustomerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: { include: { menuItem: true } },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Orders Control ---
  async getOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        items: { include: { menuItem: true } },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        rider: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => {
      const iat = Math.floor(Date.now() / 1000);
      const payload = `${o.id}:${iat}`;
      const sig = crypto.createHmac('sha256', this.jwtSecret).update(payload).digest('hex').slice(0, 16);
      const kotToken = `${payload}:${sig}`;

      return {
        ...o,
        kotToken,
      };
    });
  }

  async updateOrder(id: string, data: any) {
    const { status, riderId, subtotal, taxAmount, deliveryFee, discountAmount, grandTotal, notes } = data;

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updateData: any = {
      status: status as OrderStatus,
      riderId: riderId || null,
      subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
      taxAmount: taxAmount !== undefined ? Number(taxAmount) : undefined,
      deliveryFee: deliveryFee !== undefined ? Number(deliveryFee) : undefined,
      discountAmount: discountAmount !== undefined ? Number(discountAmount) : undefined,
      grandTotal: grandTotal !== undefined ? Number(grandTotal) : undefined,
      notes: notes || null,
    };

    if (status && status !== order.status) {
      if (status === OrderStatus.ACCEPTED) {
        updateData.acceptedAt = new Date();
        updateData.acceptedStaffName = 'Admin Override';
      } else if (status === OrderStatus.READY) {
        updateData.confirmedAt = new Date();
        updateData.confirmedStaffName = 'Admin Override';
      } else if (status === OrderStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { menuItem: true } },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        rider: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async deleteOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.orderItem.deleteMany({ where: { orderId: id } });
    await this.prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await this.prisma.riderLocation.deleteMany({ where: { orderId: id } });
    await this.prisma.payment.deleteMany({ where: { orderId: id } });

    return this.prisma.order.delete({ where: { id } });
  }

  // --- Billing History ---
  async getBills() {
    return this.prisma.bill.findMany({
      include: {
        table: {
          select: { number: true },
        },
        orders: {
          select: {
            orderNumber: true,
            grandTotal: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBill(id: string, data: any) {
    const { status, discountAmount, taxAmount, grandTotal, voidReason } = data;

    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Bill not found');

    return this.prisma.bill.update({
      where: { id },
      data: {
        status: status as BillStatus,
        discountAmount: discountAmount !== undefined ? Number(discountAmount) : undefined,
        cgstAmount: taxAmount !== undefined ? Number(taxAmount) / 2 : undefined,
        sgstAmount: taxAmount !== undefined ? Number(taxAmount) / 2 : undefined,
        taxableAmount: taxAmount !== undefined ? (bill.subtotal - (discountAmount ?? bill.discountAmount)) : undefined,
        grandTotal: grandTotal !== undefined ? Number(grandTotal) : undefined,
        voidReason: voidReason || null,
      },
      include: {
        payments: true,
      },
    });
  }

  async deleteBill(id: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Bill not found');

    await this.prisma.billPayment.deleteMany({ where: { billId: id } });
    await this.prisma.billItem.deleteMany({ where: { billId: id } });

    // Nullify order references
    await this.prisma.order.updateMany({
      where: { billId: id },
      data: { billId: null },
    });

    return this.prisma.bill.delete({ where: { id } });
  }
}
