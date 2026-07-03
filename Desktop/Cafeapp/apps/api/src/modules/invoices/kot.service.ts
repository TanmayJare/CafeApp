import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// ─── Pure-Node QR code generator ─────────────────────────────────────────────
// Implements QR code generation without any external dependencies.
// Produces a base64-encoded PNG containing the QR matrix.

// Minimal Reed-Solomon GF(256) with polynomial 0x11d
class GF {
  static EXP = new Uint8Array(512);
  static LOG = new Uint8Array(256);
  static {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF.EXP[i] = x;
      GF.LOG[x] = i;
      x = x << 1;
      if (x > 255) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF.EXP[i] = GF.EXP[i - 255];
  }
  static mul(a: number, b: number) {
    if (a === 0 || b === 0) return 0;
    return GF.EXP[GF.LOG[a] + GF.LOG[b]];
  }
  static poly_mul(p: number[], q: number[]): number[] {
    const r = new Array(p.length + q.length - 1).fill(0);
    for (let i = 0; i < p.length; i++)
      for (let j = 0; j < q.length; j++)
        r[i + j] ^= GF.mul(p[i], q[j]);
    return r;
  }
  static poly_rem(msg: number[], gen: number[]): number[] {
    let res = [...msg];
    for (let i = 0; i < msg.length; i++) {
      const coeff = res[i];
      if (coeff !== 0)
        for (let j = 1; j < gen.length; j++)
          res[i + j] ^= GF.mul(gen[j], coeff);
    }
    return res.slice(msg.length);
  }
}

function rsGenerator(n: number): number[] {
  let g: number[] = [1];
  for (let i = 0; i < n; i++) g = GF.poly_mul(g, [1, GF.EXP[i]]);
  return g;
}

// Encode a byte-mode QR code at version chosen to fit the data, error correction M
function encodeQR(text: string): boolean[][] {
  const bytes = Buffer.from(text, 'utf-8');
  const n = bytes.length;

  // Pick version (1–10 max for simplicity, byte mode, ECC M)
  const VERSION_CAP = [0,14,26,42,62,84,106,122,154,180,206]; // ECC M byte cap
  let version = 1;
  while (version < VERSION_CAP.length && VERSION_CAP[version] < n + 3) version++;
  if (version >= VERSION_CAP.length) version = 10; // fallback cap

  const SIZE = 17 + 4 * version;
  const grid: (number | null)[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
  const reserved: boolean[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));

  const set = (r: number, c: number, v: number, res = false) => {
    grid[r][c] = v;
    if (res) reserved[r][c] = true;
  };

  // Finder patterns
  const finder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
        const v = (r >= 0 && r <= 6 && c >= 0 && c <= 6)
          ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 1 : 0
          : 0;
        set(rr, cc, v, true);
      }
  };
  finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0);

  // Timing patterns
  for (let i = 8; i < SIZE - 8; i++) {
    set(6, i, i % 2 === 0 ? 1 : 0, true);
    set(i, 6, i % 2 === 0 ? 1 : 0, true);
  }

  // Dark module
  set(SIZE - 8, 8, 1, true);

  // Format info placeholder (reserved)
  const formatPos = [
    [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    [8,SIZE-1],[8,SIZE-2],[8,SIZE-3],[8,SIZE-4],[8,SIZE-5],[8,SIZE-6],[8,SIZE-7],
    [SIZE-7,8],[SIZE-6,8],[SIZE-5,8],[SIZE-4,8],[SIZE-3,8],[SIZE-2,8],[SIZE-1,8],
  ];
  for (const [r,c] of formatPos) { grid[r][c] = 0; reserved[r][c] = true; }

  // Data encoding (byte mode, ECC M)
  // Simplified codeword tables for versions 1-10, ECC M
  const DATA_CODEWORDS: number[] = [0,10,16,26,36,46,60,66,86,100,122];
  const ECC_CODEWORDS:  number[] = [0,10,16,18,24,24,28,28,32,38, 46];
  const dataWords = DATA_CODEWORDS[version] ?? 122;
  const eccWords  = ECC_CODEWORDS[version] ?? 46;

  // Build data bitstream
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);           // byte mode
  pushBits(n, 8);                // char count
  for (const b of bytes) pushBits(b, 8);
  pushBits(0, 4);                // terminator
  while (bits.length % 8 !== 0) bits.push(0);
  const pad = [0xEC, 0x11];
  let pi = 0;
  while (bits.length < dataWords * 8) { pushBits(pad[pi++ % 2], 8); }

  const dataBytes: number[] = [];
  for (let i = 0; i < dataWords; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i * 8 + j] ?? 0);
    dataBytes.push(b);
  }

  const gen = rsGenerator(eccWords);
  const eccBytes = GF.poly_rem([...dataBytes, ...new Array(eccWords).fill(0)], gen);
  const codewords = [...dataBytes, ...eccBytes];

  // Place codewords in the matrix
  let bitIdx = 0;
  const getBit = () => {
    if (bitIdx >= codewords.length * 8) return 0;
    const byteIdx = Math.floor(bitIdx / 8);
    const bitPos  = 7 - (bitIdx % 8);
    bitIdx++;
    return (codewords[byteIdx] >> bitPos) & 1;
  };

  let up = true;
  for (let col = SIZE - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5;
    for (let r = 0; r < SIZE; r++) {
      const row = up ? SIZE - 1 - r : r;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!reserved[row][c]) {
          const bit = getBit();
          // Apply mask pattern 0: (row + col) % 2 === 0
          grid[row][c] = bit ^ ((row + c) % 2 === 0 ? 1 : 0);
        }
      }
    }
    up = !up;
  }

  // Write format info (ECC M, mask 0 = 101010000010010)
  const formatStr = '101010000010010';
  const fp1 = [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
  const fp2 = [[SIZE-1,8],[SIZE-2,8],[SIZE-3,8],[SIZE-4,8],[SIZE-5,8],[SIZE-6,8],[SIZE-7,8],[8,SIZE-8],[8,SIZE-7],[8,SIZE-6],[8,SIZE-5],[8,SIZE-4],[8,SIZE-3],[8,SIZE-2],[8,SIZE-1]];
  for (let i = 0; i < 15; i++) {
    const v = parseInt(formatStr[i]);
    set(fp1[i][0], fp1[i][1], v, false);
    set(fp2[i][0], fp2[i][1], v, false);
  }

  return grid.map(row => row.map(cell => cell === 1));
}

function qrToPng(matrix: boolean[][]): string {
  const S = matrix.length;
  const SCALE = 6;
  const QUIET = 4;
  const PX = (S + QUIET * 2) * SCALE;

  // Build raw RGBA pixels
  const pixels = new Uint8Array(PX * PX * 4).fill(255);
  const setPixel = (x: number, y: number, dark: boolean) => {
    const base = (y * PX + x) * 4;
    const v = dark ? 0 : 255;
    pixels[base] = v; pixels[base+1] = v; pixels[base+2] = v; pixels[base+3] = 255;
  };
  for (let r = 0; r < S; r++)
    for (let c = 0; c < S; c++)
      if (matrix[r][c])
        for (let dy = 0; dy < SCALE; dy++)
          for (let dx = 0; dx < SCALE; dx++)
            setPixel((QUIET + c) * SCALE + dx, (QUIET + r) * SCALE + dy, true);

  // Minimal PNG encoder
  const crc32 = (buf: Uint8Array): number => {
    let crc = -1;
    const table = (n: number) => {
      let c = n;
      for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      return c;
    };
    for (const b of buf) crc = table((crc ^ b) & 0xFF) ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  };
  const u32 = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b; };

  const chunks: Uint8Array[] = [];
  const chunk = (type: string, data: Uint8Array) => {
    const t = new TextEncoder().encode(type);
    const buf = new Uint8Array(t.length + data.length);
    buf.set(t); buf.set(data, 4);
    chunks.push(u32(data.length), buf, u32(crc32(buf)));
  };

  // IHDR
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, PX); dv.setUint32(4, PX); ihdr[8]=8; ihdr[9]=2; // 8-bit RGB truecolour
  chunk('IHDR', ihdr);

  // IDAT — deflate with no compression (type 0 blocks)
  const raw: number[] = [];
  for (let y = 0; y < PX; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < PX; x++) {
      const base = (y * PX + x) * 4;
      raw.push(pixels[base], pixels[base+1], pixels[base+2]);
    }
  }
  const rawBuf = new Uint8Array(raw);
  const BLOCK = 65535;
  const deflateParts: Uint8Array[] = [new Uint8Array([0x78, 0x01])]; // zlib header
  let adler_a = 1, adler_b = 0;
  for (const b of rawBuf) { adler_a = (adler_a + b) % 65521; adler_b = (adler_b + adler_a) % 65521; }
  const adler = (adler_b << 16) | adler_a;
  for (let i = 0; i < rawBuf.length; i += BLOCK) {
    const slice = rawBuf.subarray(i, i + BLOCK);
    const last = i + BLOCK >= rawBuf.length;
    const header = new Uint8Array([last ? 1 : 0, slice.length & 0xFF, (slice.length >> 8) & 0xFF, (~slice.length) & 0xFF, ((~slice.length) >> 8) & 0xFF]);
    deflateParts.push(header, slice);
  }
  const adlerBuf = new Uint8Array(4);
  new DataView(adlerBuf.buffer).setUint32(0, adler);
  deflateParts.push(adlerBuf);
  const deflated = new Uint8Array(deflateParts.reduce((s, b) => s + b.length, 0));
  let offset = 0;
  for (const p of deflateParts) { deflated.set(p, offset); offset += p.length; }
  chunk('IDAT', deflated);
  chunk('IEND', new Uint8Array(0));

  const sig = new Uint8Array([137,80,78,71,13,10,26,10]);
  const total = sig.length + chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  out.set(sig);
  let pos = sig.length;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return Buffer.from(out).toString('base64');
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class KotService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private get secret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'cafeconnect-kot-secret';
  }

  buildKotToken(orderId: string): string {
    const iat = Math.floor(Date.now() / 1000);
    const payload = `${orderId}:${iat}`;
    const sig = crypto.createHmac('sha256', this.secret).update(payload).digest('hex').slice(0, 16);
    return `${payload}:${sig}`;
  }

  verifyKotToken(token: string): { orderId: string } {
    const parts = token.split(':');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const [orderId, iatStr, sig] = parts;
    const iat = parseInt(iatStr, 10);
    if (isNaN(iat)) throw new Error('Invalid token');
    const now = Math.floor(Date.now() / 1000);
    if (now - iat > 3600) throw new Error('Token expired');
    const payload = `${orderId}:${iatStr}`;
    const expected = crypto.createHmac('sha256', this.secret).update(payload).digest('hex').slice(0, 16);
    if (expected !== sig) throw new Error('Invalid token signature');
    return { orderId };
  }

  async generateKOTQRCode(orderId: string): Promise<string> {
    const token = this.buildKotToken(orderId);
    const matrix = encodeQR(token);
    return qrToPng(matrix);
  }

  async getKOTData(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) throw new Error('Order not found');

    const qrCodeBase64 = await this.generateKOTQRCode(orderId);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 3600 * 1000);

    return {
      qrCodeBase64,
      kotToken: this.buildKotToken(orderId),
      orderNumber: order.orderNumber,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        options: Array.isArray(i.options) ? i.options : [],
      })),
      customer: order.customer,
      address: order.address,
      total: order.grandTotal,
    };
  }
}

// Made with Bob
