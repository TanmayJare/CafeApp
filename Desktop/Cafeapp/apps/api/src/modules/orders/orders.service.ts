import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddressService } from '../address/address.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, UserRole } from '@cafeconnect/database';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private addressService: AddressService,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
  ) {}

  /**
   * Generate unique order number: CC-YYYYMMDD-XXX
   */
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Count orders today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let sequenceNum = count + 1;
    let orderNumber = `CC-${dateStr}-${sequenceNum.toString().padStart(3, '0')}`;
    
    while (true) {
      const existing = await this.prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      });
      if (!existing) {
        break;
      }
      sequenceNum++;
      orderNumber = `CC-${dateStr}-${sequenceNum.toString().padStart(3, '0')}`;
    }

    return orderNumber;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get cafe config for tax and delivery fees
   */
  private async getCafeConfig() {
    let config = await this.prisma.cafeConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      // Create default config if not exists
      config = await this.prisma.cafeConfig.create({
        data: {
          id: 'default',
          name: 'CafeConnect',
          address: 'Mumbai, India',
          latitude: 19.0760,
          longitude: 72.8777,
          taxRate: 0.05,
          primaryDeliveryFee: 20,
          secondaryDeliveryFee: 40,
          deliveryRadiusKm: 7,
          societyName: 'Default Society',
        },
      });
    }

    return config;
  }

  /**
   * Create order from cart or direct items
   */
  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { addressId, paymentMethod, couponCode, notes, items, tableId } = createOrderDto;

    // Validate customer name is set (not anonymous)
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!customer || !customer.name || !customer.name.trim()) {
      throw new BadRequestException('Customer name is required. Please set your name in your profile before placing an order.');
    }

    // Get cafe config
    const config = await this.getCafeConfig();

    // Calculate zone and delivery fee
    let deliveryFee = 0;
    let zoneType: 'PRIMARY' | 'SECONDARY' = 'PRIMARY';

    if (addressId) {
      // Validate address belongs to user
      const address = await this.addressService.findOne(addressId, userId);

      if (address.type === 'SOCIETY') {
        zoneType = 'PRIMARY';
        deliveryFee = config.primaryDeliveryFee;
      } else {
        // External address - calculate distance
        if (!address.latitude || !address.longitude) {
          throw new BadRequestException('Address coordinates are required');
        }

        const distance = this.addressService.calculateDistance(
          config.latitude,
          config.longitude,
          address.latitude,
          address.longitude
        );

        const zone = this.addressService.determineZone(distance);
        if (!zone) {
          throw new BadRequestException('Address is outside delivery range');
        }

        zoneType = zone;
        deliveryFee = zone === 'PRIMARY' ? config.primaryDeliveryFee : config.secondaryDeliveryFee;
      }
    }

    // Validate and calculate order items
    let subtotal = 0;
    const orderItems: Array<{
      menuItemId: string;
      name: string;
      unitPrice: number;
      quantity: number;
      options: Array<{ name: string; priceDelta: number }>;
      lineTotal: number;
    }> = [];

    for (const item of items) {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: { options: true },
      });

      if (!menuItem) {
        throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
      }

      if (!menuItem.isAvailable) {
        throw new BadRequestException(`${menuItem.name} is currently unavailable`);
      }

      let itemPrice = menuItem.price;
      const itemOptions: Array<{ name: string; priceDelta: number }> = [];

      // Validate and calculate options
      if (item.options && item.options.length > 0) {
        for (const opt of item.options) {
          const validOption = menuItem.options.find(o => o.name === opt.optionName);
          if (!validOption) {
            throw new BadRequestException(`Invalid option ${opt.optionName} for ${menuItem.name}`);
          }
          itemPrice += validOption.priceDelta;
          itemOptions.push({
            name: opt.optionName,
            priceDelta: validOption.priceDelta,
          });
        }
      }

      const lineTotal = itemPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        unitPrice: itemPrice,
        quantity: item.quantity,
        options: itemOptions,
        lineTotal,
      });
    }

    // Apply coupon if provided
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon || !coupon.isActive) {
        throw new BadRequestException('Invalid or inactive coupon');
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException('Coupon has expired');
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      if (subtotal < coupon.minOrderValue) {
        throw new BadRequestException(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`);
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else {
        discountAmount = coupon.discountValue;
      }

      // Update coupon usage
      await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Calculate totals
    const taxAmount = subtotal * config.taxRate;
    const grandTotal = subtotal + taxAmount + deliveryFee - discountAmount;

    // Generate order number and create order with retries for race conditions
    let order;
    let attempts = 0;
    while (attempts < 5) {
      try {
        const orderNumber = await this.generateOrderNumber();
        order = await this.prisma.order.create({
          data: {
            orderNumber,
            customerId: userId,
            addressId: addressId || null,
            tableId: tableId || null,
            status: OrderStatus.PLACED,
            subtotal,
            taxAmount,
            deliveryFee,
            discountAmount,
            grandTotal,
            couponCode,
            zoneType,
            paymentMethod,
            notes,
            items: {
              create: orderItems.map(item => ({
                menuItemId: item.menuItemId,
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                options: item.options,
                lineTotal: item.lineTotal,
              })),
            },
          },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            address: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        });
        break; // Success!
      } catch (err: any) {
        // If unique constraint error on orderNumber, retry!
        if (err.code === 'P2002' && err.meta?.target?.includes('orderNumber')) {
          attempts++;
          // Add a tiny random delay to spread concurrent requests
          await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
        } else {
          throw err;
        }
      }
    }

    if (!order) {
      throw new BadRequestException('Failed to generate a unique order number. Please try again.');
    }

    // Clear user's cart after successful order
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    // Update table status to OCCUPIED if dine-in
    if (tableId) {
      await this.prisma.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    // Emit new order event to staff
    this.ordersGateway.emitNewOrder(order);

    return order;
  }

  /**
   * Get all orders (with filters for staff/customer)
   */
  async findAll(userId: string, userRole: UserRole, status?: OrderStatus) {
    const where: any = {};

    // Customers see only their orders
    if (userRole === UserRole.CUSTOMER) {
      where.customerId = userId;
    }

    // Riders see only assigned orders
    if (userRole === UserRole.RIDER) {
      where.riderId = userId;
    }

    // Apply status filter
    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        address: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single order
   */
  async findOne(id: string, userId: string, userRole: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        address: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Customers can only see their own orders
    if (userRole === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Riders can only see assigned orders
    if (userRole === UserRole.RIDER && order.riderId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  /**
   * Update order status (staff/rider only)
   */
  async updateStatus(
    id: string,
    userId: string,
    userRole: UserRole,
    updateOrderStatusDto: UpdateOrderStatusDto
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { address: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const { status, rejectReason, riderId } = updateOrderStatusDto;

    // Validate status transitions
    this.validateStatusTransition(order.status, status, userRole);

    // Riders can only update their assigned orders
    if (userRole === UserRole.RIDER && order.riderId !== userId) {
      throw new ForbiddenException('You can only update your assigned orders');
    }

    // Verify proximity to destination before allowing delivery completion (38D.3)
    if (status === OrderStatus.DELIVERED && userRole === UserRole.RIDER) {
      if (order.address && order.address.latitude !== null && order.address.longitude !== null) {
        const latestLocation = await this.prisma.riderLocation.findFirst({
          where: {
            orderId: id,
            riderId: userId,
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        if (!latestLocation) {
          throw new BadRequestException('No location updates received from rider yet. Proximity verification failed.');
        }

        const distanceMeters = this.calculateDistance(
          latestLocation.latitude,
          latestLocation.longitude,
          order.address.latitude,
          order.address.longitude
        ) * 1000;

        if (distanceMeters > 5) {
          throw new BadRequestException(
            `You must be within 5 meters of the delivery address to mark it as delivered. Current distance: ${distanceMeters.toFixed(1)} meters.`
          );
        }
      }
    }

    const updateData: any = { status };

    // Resolve name of the acting user
    const actingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const staffName = actingUser?.name || actingUser?.email || 'System';

    if (status === OrderStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
      updateData.acceptedStaffName = staffName;
    } else if (status === OrderStatus.READY) {
      updateData.confirmedAt = new Date();
      updateData.confirmedStaffName = staffName;
    } else if (status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    // Handle reject reason
    if (status === OrderStatus.CANCELLED && rejectReason) {
      updateData.rejectReason = rejectReason;
    }

    // Assign rider when status changes to ASSIGNED
    if (status === OrderStatus.ASSIGNED && riderId) {
      updateData.riderId = riderId;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        address: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Emit status update event
    this.ordersGateway.emitOrderStatusUpdate(id, status, updatedOrder);

    // 34B.5 — emit revenue delta when order is delivered
    if (status === OrderStatus.DELIVERED) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const agg = await this.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
          updatedAt: { gte: todayStart },
        },
        _sum: { grandTotal: true },
      });
      const newTotal = Number(agg._sum.grandTotal ?? 0);
      this.ordersGateway.emitRevenueUpdated(Number(updatedOrder.grandTotal), newTotal);
    }

    return updatedOrder;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus, userRole: UserRole) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
      [OrderStatus.ASSIGNED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Only staff can accept/prepare orders
    if ([OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.ASSIGNED].includes(newStatus as any)) {
      if (userRole !== UserRole.STAFF && userRole !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only staff can perform this action');
      }
    }

    // Only riders can mark as out for delivery or delivered
    if ([OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED].includes(newStatus as any)) {
      if (userRole !== UserRole.RIDER && userRole !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only riders can perform this action');
      }
    }
  }

  /**
   * Cancel order (customer can cancel if not yet accepted)
   */
  async cancel(id: string, userId: string, userRole: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Customers can only cancel their own orders
    if (userRole === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Customers can only cancel if order is still PLACED
    if (userRole === UserRole.CUSTOMER && order.status !== OrderStatus.PLACED) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        address: true,
      },
    });
  }
}

// Made with Bob