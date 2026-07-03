import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvoiceService } from './invoice.service';
import { KotService } from './kot.service';
import { OrdersService } from '../orders/orders.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@cafeconnect/database';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class InvoicesController {
  constructor(
    private invoiceService: InvoiceService,
    private kotService: KotService,
    private ordersService: OrdersService,
    private ordersGateway: OrdersGateway,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ─── 38A.3 — Customer invoice download ───────────────────────────────────
  // Accepts Bearer token in Authorization header OR ?token= query param
  // so it works when opened directly in a browser via Linking.openURL.

  @Get('orders/:id/invoice')
  async downloadInvoice(
    @Param('id') id: string,
    @Query('token') queryToken: string | undefined,
    @Request() req,
    @Res() res: Response,
  ) {
    // Resolve user from header or query param token
    let userId: string | undefined;
    let userRole: string | undefined;
    const authHeader: string | undefined = req.headers?.authorization;
    const rawToken = authHeader?.split(' ')[1] ?? queryToken;
    if (rawToken) {
      try {
        const payload = this.jwtService.verify(rawToken) as any;
        userId = payload.sub;
        userRole = payload.role;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
    if (!userId) throw new UnauthorizedException('Authentication required');

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new BadRequestException('Order not found');

    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const pdfBuffer = await this.invoiceService.generateCustomerInvoice(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  // ─── 38A.5 — Staff KOT data (with QR code) ───────────────────────────────

  @Get('orders/:id/kot')
  @UseGuards(JwtAuthGuard)
  async getKOT(@Param('id') id: string, @Request() req) {
    if (!['STAFF', 'SUPER_ADMIN'].includes(req.user.role)) {
      throw new ForbiddenException('STAFF access required');
    }
    return this.kotService.getKOTData(id);
  }

  // ─── 38A.6 — Scan KOT (public + signature validation) ────────────────────
  // Rate-limited: max 10 scans/min per IP to prevent QR replay attacks.

  @Post('orders/scan-kot')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async scanKOT(@Body() body: { token: string; riderId?: string }) {
    const { token } = body;

    let orderId: string;
    try {
      const result = this.kotService.verifyKotToken(token);
      orderId = result.orderId;
    } catch (err: any) {
      if (err.message === 'Token expired') {
        throw new UnauthorizedException('QR code has expired — ask staff to regenerate');
      }
      throw new UnauthorizedException('Invalid KOT token');
    }

    // Find the order
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    // Must be READY to transition
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException({
        error: 'Order is not in READY status',
        currentStatus: order.status,
      });
    }

    // Transition to OUT_FOR_DELIVERY
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.OUT_FOR_DELIVERY },
      include: {
        items: { include: { menuItem: true } },
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        rider: { select: { id: true, name: true, phone: true } },
      },
    });

    // Emit socket event so staff dashboard updates live (34B.2)
    this.ordersGateway.emitOrderStatusUpdate(orderId, OrderStatus.OUT_FOR_DELIVERY, updated);

    return {
      success: true,
      orderId,
      orderNumber: updated.orderNumber,
      newStatus: OrderStatus.OUT_FOR_DELIVERY,
    };
  }
}

// Made with Bob
