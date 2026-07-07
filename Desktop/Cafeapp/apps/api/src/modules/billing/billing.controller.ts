import { Controller, Get, Post, Patch, Delete, Put, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { VoidBillDto } from './dto/void-bill.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@cafeconnect/database';
import { Response } from 'express';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.SUPER_ADMIN)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('tables')
  getTables() {
    return this.billingService.getTables();
  }

  @Post('tables')
  createTable(@Body() body: { number: string; section?: string }) {
    return this.billingService.createTable(body.number, body.section);
  }

  @Delete('tables/:id')
  deleteTable(@Param('id') id: string) {
    return this.billingService.deleteTable(id);
  }

  @Post('tables/:tableId/items')
  addTableItem(
    @Request() req,
    @Param('tableId') tableId: string,
    @Body() body: { menuItemId: string; quantity: number },
  ) {
    return this.billingService.addTableItem(tableId, body.menuItemId, body.quantity, req.user.id);
  }

  @Patch('tables/:tableId/items/:itemId')
  updateTableItemQuantity(
    @Param('tableId') tableId: string,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ) {
    return this.billingService.updateTableItemQuantity(tableId, itemId, body.quantity);
  }

  @Delete('tables/:tableId/items/:itemId')
  deleteTableItem(
    @Param('tableId') tableId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.billingService.deleteTableItem(tableId, itemId);
  }

  @Post('tables/:tableId/finalize')
  finalizeBill(@Request() req, @Param('tableId') tableId: string) {
    return this.billingService.finalizeBill(tableId, req.user.id);
  }

  @Post('tables/:tableId/unlock')
  unlockBill(@Param('tableId') tableId: string) {
    return this.billingService.unlockBill(tableId);
  }

  @Get('managers')
  getManagers() {
    return this.billingService['prisma'].user.findMany({
      where: {
        role: { in: [UserRole.STAFF, UserRole.SUPER_ADMIN] },
        managerPinHash: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  @Post('bills')
  createBill(@Request() req, @Body() createBillDto: CreateBillDto) {
    return this.billingService.createBill(createBillDto, req.user.id);
  }

  @Get('bills/:id')
  getBill(@Param('id') id: string) {
    return this.billingService.getBill(id);
  }

  @Post('bills/:id/discount')
  applyDiscount(
    @Request() req,
    @Param('id') id: string,
    @Body() applyDiscountDto: ApplyDiscountDto,
  ) {
    return this.billingService.applyDiscount(id, applyDiscountDto, req.user.id);
  }

  @Post('bills/:id/payments')
  addPayment(@Param('id') id: string, @Body() addPaymentDto: AddPaymentDto) {
    return this.billingService.addPayment(id, addPaymentDto);
  }

  @Get('tables/:tableId/bill')
  getActiveTableBill(@Param('tableId') tableId: string) {
    return this.billingService.getActiveTableBill(tableId);
  }

  @Post('bills/:id/void')
  voidBill(@Param('id') id: string, @Body() voidBillDto: VoidBillDto) {
    return this.billingService.voidBill(id, voidBillDto);
  }

  @Post('pin/verify')
  verifyPin(@Body() verifyPinDto: VerifyPinDto) {
    return this.billingService.verifyManagerPin(verifyPinDto);
  }

  @Get('reports/z-report')
  getZReport(@Query('date') date?: string) {
    return this.billingService.getZReport(date);
  }

  @Get('reports/gst-summary')
  getGstSummary(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.billingService.getGstSummary(startDate, endDate);
  }

  @Get('reports/item-sales')
  getItemWiseSales(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.billingService.getItemWiseSales(startDate, endDate);
  }

  @Get('bills/:id/invoice')
  async getInvoiceHtml(@Param('id') id: string, @Res() res: any) {
    const bill = await this.billingService.getBill(id);
    const profile = await this.billingService.getTables().then(() =>
      this.billingService['prisma'].businessProfile.findUnique({
        where: { id: 'default' },
      })
    ) || {
      legalName: 'Sunshine Cafe',
      gstin: '27GSTIN1234A1Z1',
      address: 'Mumbai, India',
      hsnCode: '996331',
    };

    // Calculate items html from bill.items
    let itemsHtml = '';
    bill.items.forEach(item => {
      itemsHtml += `
        <tr>
          <td style="padding: 6px 0; vertical-align: top;">
            ${item.name}
          </td>
          <td style="padding: 6px 0; text-align: center; vertical-align: top;">${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; vertical-align: top;">₹${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 6px 0; text-align: right; vertical-align: top;">₹${item.lineTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    const paymentRows = bill.payments.length > 0
      ? bill.payments.map(p => `
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 3px;">
            <span>Payment [${p.method}] ${p.reference ? `(${p.reference})` : ''}</span>
            <span>₹${p.amount.toFixed(2)}</span>
          </div>
        `).join('')
      : '<div style="font-size: 11px; color: red; margin-top: 5px;">UNPAID</div>';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${bill.billNumber || 'DRAFT'}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 10px 0;
            font-size: 12px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .hr { border-bottom: 1px dashed #000; margin: 8px 0; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; }
          .noprint-btn {
            background: #1C0F0A;
            color: #FAF8F5;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 15px;
            width: 100%;
            font-family: sans-serif;
            font-weight: bold;
          }
          @media print {
            .noprint { display: none; }
            body { width: 100%; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="noprint">
          <button class="noprint-btn" onclick="window.print()">Print Invoice</button>
        </div>

        <div class="text-center">
          <div class="title">${profile.legalName}</div>
          <div>${profile.address}</div>
          <div>GSTIN: ${profile.gstin}</div>
          <div>HSN Code: ${profile.hsnCode}</div>
          <div class="hr"></div>
          <div class="bold">TAX INVOICE</div>
          <div class="hr"></div>
        </div>

        <div style="line-height: 1.4;">
          <div>Bill No : <span class="bold">${bill.billNumber || 'DRAFT'}</span></div>
          <div>Date    : ${new Date(bill.createdAt).toLocaleString('en-IN')}</div>
          <div>Channel : ${bill.channel}</div>
          ${bill.table ? `<div>Table   : ${bill.table.number} (${bill.table.section || 'General'})</div>` : ''}
          <div>Cashier : ${bill.createdBy || 'system'}</div>
        </div>

        <div class="hr"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px; width: 10%;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px; width: 25%;">Rate</th>
              <th style="text-align: right; padding-bottom: 4px; width: 25%;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="hr"></div>

        <div style="line-height: 1.5;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>₹${bill.subtotal.toFixed(2)}</span>
          </div>
          ${bill.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #333;">
              <span>Discount (${bill.discountReason || 'Promo'}):</span>
              <span>-₹${bill.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span>Taxable Value:</span>
            <span>₹${bill.taxableAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>CGST (2.5%):</span>
            <span>₹${bill.cgstAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>SGST (2.5%):</span>
            <span>₹${bill.sgstAmount.toFixed(2)}</span>
          </div>
          ${bill.roundOff !== 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Round Off:</span>
              <span>₹${bill.roundOff.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 14px;" class="bold">
            <span>GRAND TOTAL:</span>
            <span>₹${bill.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="hr"></div>

        <div>
          <div class="bold" style="font-size: 11px; margin-bottom: 3px;">Payment Status: ${bill.status}</div>
          ${paymentRows}
        </div>

        ${bill.status === 'VOID' ? `
          <div class="hr"></div>
          <div style="color: red; border: 1px solid red; padding: 4px; font-size: 10px; text-align: center;">
            VOIDED: ${bill.voidReason}<br>
            By Mgr ID: ${bill.voidApprovedBy}
          </div>
        ` : ''}

        <div class="hr"></div>

        <div class="text-center" style="font-size: 11px; margin-top: 10px;">
          Thank You!<br>
          We hope you had a great experience.<br>
          Visit Again!
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
