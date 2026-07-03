import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Minimal PDF-1.4 generator (no external deps) ────────────────────────────
// Produces a valid, readable A5 invoice PDF using only Node built-ins.

class PDFBuilder {
  private objects: string[] = [];
  private offsets: number[] = [];
  private buf = '';

  private addObject(content: string): number {
    const n = this.objects.length + 1;
    this.objects.push(content);
    return n;
  }

  build(title: string, lines: string[][]): Buffer {
    // lines: array of rows, each row is [text, x, y, size?, bold?]
    // We emit one page of A5 (420 x 595 pt)
    const W = 420, H = 595;

    // Font objects
    const fontRegN = this.addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    );
    const fontBoldN = this.addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );

    // Page stream content
    const streamLines: string[] = [
      'BT',
    ];

    for (const row of lines) {
      const [text, xStr, yStr, sizeStr, isBold, colorStr] = row;
      const x = parseFloat(xStr ?? '30');
      const y = parseFloat(yStr ?? '500');
      const size = parseFloat(sizeStr ?? '9');
      const bold = isBold === '1';
      const color = colorStr ?? '0 0 0';
      const safeText = (text ?? '').replace(/[()\\]/g, (c) => '\\' + c);
      streamLines.push(
        `${color} rg`,
        `/${bold ? 'F2' : 'F1'} ${size} Tf`,
        `${x} ${y} Td`,
        `(${safeText}) Tj`,
        `-${x} -${y} Td`, // reset position
      );
    }
    streamLines.push('ET');

    // Draw horizontal lines (stored as extra stream commands)
    const hLines: string[] = [];
    for (const row of lines) {
      if (row[0] === '__HR__') {
        const y = parseFloat(row[2] ?? '300');
        hLines.push(`0.7 0.7 0.7 RG 0.3 w 30 ${y} m ${W - 30} ${y} l S`);
      }
    }

    const stream = [...hLines, ...streamLines].join('\n');
    const streamN = this.addObject(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );

    const resourcesN = this.addObject(
      `<< /Font << /F1 ${fontRegN} 0 R /F2 ${fontBoldN} 0 R >> >>`,
    );
    const pageN = this.addObject(
      `<< /Type /Page /Parent 6 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${streamN} 0 R /Resources ${resourcesN} 0 R >>`,
    );
    const pagesN = this.addObject(
      `<< /Type /Pages /Kids [${pageN} 0 R] /Count 1 >>`,
    );
    const catalogN = this.addObject(
      `<< /Type /Catalog /Pages ${pagesN} 0 R >>`,
    );

    // Rebuild with correct object numbers
    let body = '%PDF-1.4\n';
    const offsets: number[] = [];

    // Reorder: we need sequential objects
    const finalObjs = [
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
      `<< /Font << /F1 1 0 R /F2 2 0 R >> >>`,
      `<< /Type /Page /Parent 6 0 R /MediaBox [0 0 ${W} ${H}] /Contents 3 0 R /Resources 4 0 R >>`,
      `<< /Type /Pages /Kids [5 0 R] /Count 1 >>`,
      `<< /Type /Catalog /Pages 6 0 R >>`,
    ];

    for (let i = 0; i < finalObjs.length; i++) {
      offsets.push(Buffer.byteLength(body));
      body += `${i + 1} 0 obj\n${finalObjs[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(body);
    body += `xref\n0 ${finalObjs.length + 1}\n`;
    body += `0000000000 65535 f \n`;
    for (const off of offsets) {
      body += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer\n<< /Size ${finalObjs.length + 1} /Root ${finalObjs.length} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(body, 'latin1');
  }
}

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async generateCustomerInvoice(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) throw new Error('Order not found');

    const cafe = await this.prisma.cafeConfig.findUnique({ where: { id: 'default' } }).catch(() => null);
    const cafeAddress = cafe?.address ?? 'Mumbai, India';

    const cgst = order.taxAmount / 2;
    const sgst = order.taxAmount / 2;

    const formatAddr = (a: typeof order.address): string => {
      if (!a) return '';
      if (a.type === 'SOCIETY') {
        return [a.flatNumber, a.floor ? `Floor ${a.floor}` : null, a.wing ? `${a.wing}-Wing` : null, a.tower, a.societyName].filter(Boolean).join(', ');
      }
      return [a.addressLine, a.landmark, a.pincode].filter(Boolean).join(', ');
    };

    const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const H = 595;

    // Build layout rows: [text, x, y, fontSize, bold(0/1), rgb]
    const rows: string[][] = [];
    const add = (text: string, x: number, y: number, size = 9, bold = false, color = '0 0 0') =>
      rows.push([text, String(x), String(y), String(size), bold ? '1' : '0', color]);
    const hr = (y: number) => rows.push(['__HR__', '0', String(y)]);

    let y = H - 40;
    add('CafeConnect', 30, y, 15, true);
    add('TAX INVOICE', 290, y, 10, true, '0.71 0.48 0.24');
    y -= 16;
    add(`Invoice: INV-${order.orderNumber}`, 30, y, 8, false, '0.4 0.4 0.4');
    add(`Date: ${dateStr}`, 290, y, 8, false, '0.4 0.4 0.4');
    y -= 12;
    add(`Customer: ${order.customer.name ?? order.customer.email}`, 30, y, 8, false, '0.4 0.4 0.4');
    if (order.customer.phone) { y -= 11; add(order.customer.phone, 30, y, 8, false, '0.4 0.4 0.4'); }
    const addrStr = formatAddr(order.address);
    if (addrStr) { y -= 11; add(addrStr.slice(0, 55), 30, y, 7.5, false, '0.4 0.4 0.4'); }
    y -= 10; hr(y);
    y -= 14;

    // Items header
    add('Item', 30, y, 8, true);
    add('Qty', 270, y, 8, true);
    add('Unit', 310, y, 8, true);
    add('Total', 360, y, 8, true);
    y -= 4; hr(y);

    for (const item of order.items) {
      y -= 13;
      const name = item.name.slice(0, 32);
      add(name, 30, y, 8.5);
      add(String(item.quantity), 270, y, 8.5);
      add(`Rs${item.unitPrice.toFixed(0)}`, 305, y, 8.5);
      add(`Rs${item.lineTotal.toFixed(0)}`, 360, y, 8.5);
    }

    y -= 6; hr(y);

    // Summary
    const sumRows: [string, number][] = [
      ['Subtotal', order.subtotal],
      ...(order.deliveryFee > 0 ? [['Delivery', order.deliveryFee] as [string, number]] : []),
      ...(order.discountAmount > 0 ? [['Discount', -order.discountAmount] as [string, number]] : []),
      ['CGST 2.5%', cgst],
      ['SGST 2.5%', sgst],
    ];
    for (const [label, val] of sumRows) {
      y -= 12;
      add(label, 280, y, 8, false, '0.4 0.4 0.4');
      add(`Rs${val.toFixed(2)}`, 360, y, 8, false, '0.4 0.4 0.4');
    }
    y -= 4; hr(y); y -= 13;
    add('GRAND TOTAL', 270, y, 10, true);
    add(`Rs${order.grandTotal.toFixed(2)}`, 355, y, 10, true, '0.71 0.48 0.24');

    y -= 20; hr(y); y -= 12;
    add(`Thank you for your order  *  CafeConnect  *  ${cafeAddress}`, 30, y, 7.5, false, '0.5 0.5 0.5');

    const pdf = new PDFBuilder();
    return pdf.build(`INV-${order.orderNumber}`, rows);
  }
}

// Made with Bob
