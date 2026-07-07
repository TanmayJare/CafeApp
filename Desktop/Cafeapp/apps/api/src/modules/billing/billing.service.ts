import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { VoidBillDto } from './dto/void-bill.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { BillChannel, BillStatus, PaymentMethod, TableStatus, OrderStatus } from '@cafeconnect/database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to derive financial year (FY) from a date.
   * India's financial year runs from April 1 to March 31.
   * Format: "YY-YY" (e.g. "25-26")
   */
  private getFinancialYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 11 = Dec
    let startYear = year;
    let endYear = year + 1;

    if (month < 3) { // Jan, Feb, Mar
      startYear = year - 1;
      endYear = year;
    }

    const yyStart = startYear.toString().slice(-2);
    const yyEnd = endYear.toString().slice(-2);
    return `${yyStart}-${yyEnd}`;
  }

  /**
   * Internal verification of a manager PIN code
   */
  async verifyManagerPin(verifyPinDto: VerifyPinDto): Promise<boolean> {
    const { managerId, pin } = verifyPinDto;
    const user = await this.prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!user) {
      throw new NotFoundException('Manager user not found');
    }

    if (user.role !== 'STAFF' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('User is not authorized as a manager');
    }

    if (!user.managerPinHash) {
      throw new ForbiddenException('Manager has no PIN configured');
    }

    const isMatch = await bcrypt.compare(pin, user.managerPinHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid manager PIN');
    }

    return true;
  }

  /**
   * Fetch all tables and their statuses
   */
  async getTables() {
    return this.prisma.table.findMany({
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Add a new table configuration
   */
  async createTable(number: string, section?: string) {
    const existing = await this.prisma.table.findUnique({
      where: { number },
    });
    if (existing) {
      throw new BadRequestException(`Table number ${number} already exists`);
    }
    return this.prisma.table.create({
      data: {
        number,
        section: section || 'General',
        status: TableStatus.FREE,
      },
    });
  }

  /**
   * Delete a table configuration
   */
  async deleteTable(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (table.status !== TableStatus.FREE) {
      throw new BadRequestException('Cannot delete a table that is currently occupied or billing');
    }
    return this.prisma.table.delete({
      where: { id },
    });
  }

  /**
   * Add a menu item to a table's open bill
   */
  async addTableItem(tableId: string, menuItemId: string, quantity: number, cashierId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (table.status === TableStatus.BILLING) {
      throw new BadRequestException('Cannot add items to a finalized bill. Reopen/Unlock it first.');
    }

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    // Find or create open bill for table
    let bill = await this.prisma.bill.findFirst({
      where: { tableId, status: BillStatus.OPEN },
      include: { items: true },
    });

    if (!bill) {
      bill = await this.prisma.bill.create({
        data: {
          tableId,
          channel: BillChannel.DINE_IN,
          status: BillStatus.OPEN,
          createdBy: cashierId,
        },
        include: { items: true },
      });
      await this.prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED },
      });
    }

    // Check if item already exists in bill
    const existingItem = bill.items.find(item => item.menuItemId === menuItemId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await this.prisma.billItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          lineTotal: newQuantity * existingItem.unitPrice,
        },
      });
    } else {
      await this.prisma.billItem.create({
        data: {
          billId: bill.id,
          menuItemId,
          name: menuItem.name,
          unitPrice: menuItem.price,
          quantity,
          lineTotal: menuItem.price * quantity,
        },
      });
    }

    // Recalculate bill running totals
    return this.recalculateBillTotals(bill.id);
  }

  /**
   * Update quantity of a specific item on the open bill
   */
  async updateTableItemQuantity(tableId: string, itemId: string, quantity: number) {
    const bill = await this.prisma.bill.findFirst({
      where: { tableId, status: BillStatus.OPEN },
    });
    if (!bill) {
      throw new NotFoundException('Open bill not found for table');
    }

    const billItem = await this.prisma.billItem.findUnique({
      where: { id: itemId },
    });
    if (!billItem || billItem.billId !== bill.id) {
      throw new NotFoundException('Item not found on this bill');
    }

    if (quantity <= 0) {
      await this.prisma.billItem.delete({
        where: { id: itemId },
      });
    } else {
      await this.prisma.billItem.update({
        where: { id: itemId },
        data: {
          quantity,
          lineTotal: quantity * billItem.unitPrice,
        },
      });
    }

    // Check if any items left
    const remainingItems = await this.prisma.billItem.count({
      where: { billId: bill.id },
    });

    if (remainingItems === 0) {
      // Delete the open bill and free table
      await this.prisma.bill.delete({
        where: { id: bill.id },
      });
      await this.prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.FREE },
      });
      return null;
    }

    return this.recalculateBillTotals(bill.id);
  }

  /**
   * Delete an item from the open bill
   */
  async deleteTableItem(tableId: string, itemId: string) {
    return this.updateTableItemQuantity(tableId, itemId, 0);
  }

  /**
   * Finalize the bill (locks the bill, calculates taxes, generates serial invoice number)
   */
  async finalizeBill(tableId: string, cashierId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { tableId, status: BillStatus.OPEN },
      include: { items: true },
    });

    if (!bill) {
      throw new NotFoundException('Open bill not found for table');
    }

    if (bill.items.length === 0) {
      throw new BadRequestException('Cannot finalize an empty bill');
    }

    // Get BusinessProfile for GST rates
    const profile = await this.prisma.businessProfile.findUnique({
      where: { id: 'default' },
    });
    const cgstRate = profile?.cgstRate ?? 2.5;
    const sgstRate = profile?.sgstRate ?? 2.5;

    const subtotal = bill.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxableAmount = subtotal - bill.discountAmount;
    const cgstAmount = Number((taxableAmount * (cgstRate / 100)).toFixed(2));
    const sgstAmount = Number((taxableAmount * (sgstRate / 100)).toFixed(2));
    const rawTotal = taxableAmount + cgstAmount + sgstAmount;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));

    const fy = this.getFinancialYear();

    return this.prisma.$transaction(async (tx) => {
      // Upsert financial year counter
      const counter = await tx.invoiceCounter.upsert({
        where: { financialYear: fy },
        update: { count: { increment: 1 } },
        create: { financialYear: fy, count: 1 },
      });

      const sequentialNumber = counter.count.toString().padStart(5, '0');
      const billNumber = `${profile?.invoicePrefix ?? 'INV'}/${fy}/${sequentialNumber}`;

      const finalizedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          billNumber,
          financialYear: fy,
          subtotal,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          roundOff,
          grandTotal,
          createdBy: cashierId,
        },
        include: { items: true, table: true },
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: TableStatus.BILLING },
      });

      return finalizedBill;
    });
  }

  /**
   * Unlock finalized billing status back to occupied for editing
   */
  async unlockBill(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    if (table.status !== TableStatus.BILLING) {
      throw new BadRequestException('Table is not in BILLING status');
    }

    const bill = await this.prisma.bill.findFirst({
      where: { tableId, status: BillStatus.OPEN },
    });
    if (!bill) {
      throw new NotFoundException('Open bill not found for table');
    }

    // Revert table status to OCCUPIED and clear the generated bill number so it can be re-finalized
    return this.prisma.$transaction(async (tx) => {
      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          billNumber: null,
          financialYear: null,
        },
        include: { items: true, table: true },
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED },
      });

      return updatedBill;
    });
  }

  /**
   * Helper to recalculate and save running totals for an open bill
   */
  private async recalculateBillTotals(billId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { items: true },
    });

    if (!bill) return null;

    // Get BusinessProfile for GST rates
    const profile = await this.prisma.businessProfile.findUnique({
      where: { id: 'default' },
    });
    const cgstRate = profile?.cgstRate ?? 2.5;
    const sgstRate = profile?.sgstRate ?? 2.5;

    const subtotal = bill.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxableAmount = subtotal - bill.discountAmount;
    const cgstAmount = Number((taxableAmount * (cgstRate / 100)).toFixed(2));
    const sgstAmount = Number((taxableAmount * (sgstRate / 100)).toFixed(2));
    const rawTotal = taxableAmount + cgstAmount + sgstAmount;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));

    return this.prisma.bill.update({
      where: { id: billId },
      data: {
        subtotal,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        roundOff,
        grandTotal,
      },
      include: { items: { include: { menuItem: true } }, table: true },
    });
  }

  /**
   * Legacy createBill endpoint check (falls back to finalizeBill for backward compatibility if tableId is provided)
   */
  async createBill(createBillDto: CreateBillDto, cashierId: string) {
    const { channel, tableId } = createBillDto;

    if (channel !== BillChannel.DINE_IN) {
      throw new BadRequestException('Cashier billing panel only supports Dine-in table billing. Online delivery/pickup is managed separately.');
    }

    if (!tableId) {
      throw new BadRequestException('Table ID is required for dine-in bills');
    }

    return this.finalizeBill(tableId, cashierId);
  }

  /**
   * Fetch active open bill for a table
   */
  async getActiveTableBill(tableId: string) {
    return this.prisma.bill.findFirst({
      where: { tableId, status: BillStatus.OPEN },
      include: {
        items: {
          include: { menuItem: true },
        },
        payments: true,
        table: true,
      },
    });
  }

  /**
   * Fetch single bill details
   */
  async getBill(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: true,
        table: true,
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    return bill;
  }

  /**
   * Apply discount to a bill
   */
  async applyDiscount(id: string, applyDiscountDto: ApplyDiscountDto, cashierId: string) {
    const { discountAmount, discountPercentage, reason, managerId, managerPin } = applyDiscountDto;

    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== BillStatus.OPEN) {
      throw new BadRequestException('Cannot apply discount to a closed or void bill');
    }

    let calculatedDiscount = 0;
    if (discountAmount !== undefined) {
      calculatedDiscount = discountAmount;
    } else if (discountPercentage !== undefined) {
      calculatedDiscount = Number(((bill.subtotal * discountPercentage) / 100).toFixed(2));
    }

    if (calculatedDiscount > bill.subtotal) {
      throw new BadRequestException('Discount cannot exceed bill subtotal');
    }

    // Configurable/hardcoded thresholds: flat ₹100 or 10%
    const isAboveThreshold =
      calculatedDiscount > 100 ||
      (discountPercentage !== undefined && discountPercentage > 10) ||
      (discountAmount !== undefined && (discountAmount / bill.subtotal) * 100 > 10);

    let approvedBy: string | null = null;

    if (isAboveThreshold) {
      if (!managerId || !managerPin) {
        throw new BadRequestException('PIN verification required for discounts above ₹100 or 10%');
      }

      await this.verifyManagerPin({ managerId, pin: managerPin });
      approvedBy = managerId;
    }

    // Get BusinessProfile for GST rates
    const profile = await this.prisma.businessProfile.findUnique({
      where: { id: 'default' },
    });
    const cgstRate = profile?.cgstRate ?? 2.5;
    const sgstRate = profile?.sgstRate ?? 2.5;

    // Recalculate bill
    const taxableAmount = bill.subtotal - calculatedDiscount;
    const cgstAmount = Number((taxableAmount * (cgstRate / 100)).toFixed(2));
    const sgstAmount = Number((taxableAmount * (sgstRate / 100)).toFixed(2));
    const rawTotal = taxableAmount + cgstAmount + sgstAmount;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));

    return this.prisma.bill.update({
      where: { id },
      data: {
        discountAmount: calculatedDiscount,
        discountReason: reason,
        discountApprovedBy: approvedBy,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        roundOff,
        grandTotal,
      },
      include: {
        items: { include: { menuItem: true } },
        payments: true,
        table: true,
      },
    });
  }

  /**
   * Add a payment to a bill (supports splits)
   */
  async addPayment(id: string, addPaymentDto: AddPaymentDto) {
    const { method, amount, reference } = addPaymentDto;

    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { payments: true, table: true },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== BillStatus.OPEN) {
      throw new BadRequestException('Cannot add payment to a closed or void bill');
    }

    // Check sum of payments
    const existingPaymentsTotal = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const newPaymentsTotal = existingPaymentsTotal + amount;

    if (newPaymentsTotal > bill.grandTotal + 0.01) { // 0.01 margin for float rounding
      throw new BadRequestException(`Payment amount ₹${amount} exceeds the remaining balance of ₹${(bill.grandTotal - existingPaymentsTotal).toFixed(2)}`);
    }

    // Add payment
    const payment = await this.prisma.billPayment.create({
      data: {
        billId: id,
        method,
        amount,
        reference,
      },
    });

    // Check if fully paid
    const isFullyPaid = Math.abs(newPaymentsTotal - bill.grandTotal) < 0.05;

    let updatedBill = bill;
    if (isFullyPaid) {
      // Mark bill as paid
      updatedBill = await this.prisma.$transaction(async (tx) => {
        const b = await tx.bill.update({
          where: { id },
          data: {
            status: BillStatus.PAID,
            closedAt: new Date(),
          },
          include: { payments: true, table: true },
        });

        // Free the table
        if (b.tableId) {
          await tx.table.update({
            where: { id: b.tableId },
            data: { status: TableStatus.FREE },
          });
        }

        return b;
      }) as any;
    }

    return {
      payment,
      bill: await this.getBill(id),
    };
  }

  /**
   * Void a bill
   */
  async voidBill(id: string, voidBillDto: VoidBillDto) {
    const { reason, managerId, managerPin } = voidBillDto;

    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === BillStatus.VOID) {
      throw new BadRequestException('Bill is already voided');
    }

    // Verify manager PIN
    await this.verifyManagerPin({ managerId, pin: managerPin });

    return this.prisma.$transaction(async (tx) => {
      // Void the bill
      const updated = await tx.bill.update({
        where: { id },
        data: {
          status: BillStatus.VOID,
          voidReason: reason,
          voidApprovedBy: managerId,
        },
        include: {
          payments: true,
          table: true,
        },
      });

      // Free the table
      if (bill.tableId) {
        await tx.table.update({
          where: { id: bill.tableId },
          data: { status: TableStatus.FREE },
        });
      }

      return updated;
    });
  }

  /**
   * Daily Z-Report
   */
  async getZReport(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    // Define cutover time: 6:00 AM of targetDate to 5:59:59 AM of the next day.
    const startOfBusinessDay = new Date(targetDate);
    startOfBusinessDay.setHours(6, 0, 0, 0);

    const endOfBusinessDay = new Date(startOfBusinessDay);
    endOfBusinessDay.setDate(endOfBusinessDay.getDate() + 1);
    endOfBusinessDay.setMilliseconds(endOfBusinessDay.getMilliseconds() - 1);

    // Fetch PAID bills
    const paidBills = await this.prisma.bill.findMany({
      where: {
        status: BillStatus.PAID,
        closedAt: {
          gte: startOfBusinessDay,
          lte: endOfBusinessDay,
        },
      },
      include: { payments: true },
    });

    // Fetch VOID bills
    const voidedBills = await this.prisma.bill.findMany({
      where: {
        status: BillStatus.VOID,
        createdAt: {
          gte: startOfBusinessDay,
          lte: endOfBusinessDay,
        },
      },
    });

    let totalSales = 0;
    let cgstCollected = 0;
    let sgstCollected = 0;
    let totalDiscounts = 0;

    const paymentModeBreakup = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      COD: 0,
      NET_BANKING: 0,
      WALLET: 0,
    };

    for (const bill of paidBills) {
      totalSales += bill.grandTotal;
      cgstCollected += bill.cgstAmount;
      sgstCollected += bill.sgstAmount;
      totalDiscounts += bill.discountAmount;

      for (const payment of bill.payments) {
        if (paymentModeBreakup[payment.method] !== undefined) {
          paymentModeBreakup[payment.method] += payment.amount;
        }
      }
    }

    const voidedCount = voidedBills.length;
    const voidedValue = voidedBills.reduce((sum, b) => sum + b.grandTotal, 0);

    return {
      businessDate: startOfBusinessDay.toISOString().slice(0, 10),
      periodStart: startOfBusinessDay,
      periodEnd: endOfBusinessDay,
      billsCount: paidBills.length,
      totalSales,
      cgstCollected,
      sgstCollected,
      totalDiscounts,
      paymentModeBreakup,
      voidedCount,
      voidedValue,
    };
  }

  /**
   * GST Summary Turnover Report
   */
  async getGstSummary(startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    const bills = await this.prisma.bill.findMany({
      where: {
        status: BillStatus.PAID,
        closedAt: {
          gte: start,
          lte: end,
        },
      },
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalTurnover = 0;

    for (const bill of bills) {
      totalTaxable += bill.taxableAmount;
      totalCgst += bill.cgstAmount;
      totalSgst += bill.sgstAmount;
      totalTurnover += bill.grandTotal;
    }

    return {
      startDate: start,
      endDate: end,
      billsCount: bills.length,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalTurnover,
    };
  }

  /**
   * Item-wise Sales Report
   */
  async getItemWiseSales(startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    // Find all PAID bills within range
    const bills = await this.prisma.bill.findMany({
      where: {
        status: BillStatus.PAID,
        closedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    });

    const salesMap: Record<string, { menuItemId: string; name: string; quantity: number; revenue: number }> = {};

    for (const bill of bills) {
      for (const item of bill.items) {
        if (!salesMap[item.menuItemId]) {
          salesMap[item.menuItemId] = {
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        salesMap[item.menuItemId].quantity += item.quantity;
        salesMap[item.menuItemId].revenue += item.lineTotal;
      }
    }

    return Object.values(salesMap).sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Webhook dummy to ignore online orders ready notifications
   */
  async handleDeliveryOrderReady(orderId: string) {
    // No-op. Standalone cashier billing is completely separate.
  }
}
