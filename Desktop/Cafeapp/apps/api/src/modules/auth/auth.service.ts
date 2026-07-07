import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private whatsappService: WhatsappService,
    private configService: ConfigService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private signTokens(user: { id: string; phone: string; role: string; name: string | null }) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, phone: user.phone, role: user.role, name: user.name },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' },
    );
    return { accessToken, refreshToken };
  }

  private safeUser(user: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    };
  }

  // ─── Customer OTP Auth ───────────────────────────────────────────────────

  async sendOTP(phone: string) {
    const cleanPhone = phone.trim();

    // Enforce rate limit
    const limitWindowMin = this.configService.get<number>('OTP_RATE_LIMIT_WINDOW_MINUTES', 10);
    const limitWindow = new Date(Date.now() - limitWindowMin * 60 * 1000);
    const sendCount = await this.prisma.otpVerification.count({
      where: {
        phone: cleanPhone,
        createdAt: { gte: limitWindow },
      },
    });

    const maxSends = this.configService.get<number>('OTP_RATE_LIMIT_MAX', 3);
    if (sendCount >= maxSends) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save to DB
    await this.prisma.otpVerification.create({
      data: { phone: cleanPhone, codeHash, expiresAt },
    });

    // Development fallback log
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    if (isDev) {
      this.logger.warn(`\n\n  ╔══════════════════════════════════╗`);
      this.logger.warn(`  ║  🟢  WhatsApp OTP requested for: ${cleanPhone}`);
      this.logger.warn(`  ║  🔑  OTP Code: ${code}`);
      this.logger.warn(`  ╚══════════════════════════════════╝\n`);
    }

    // Send via WhatsApp service
    await this.whatsappService.sendOtp(cleanPhone, code);

    return {
      message: 'OTP sent successfully',
      phone: cleanPhone,
      ...(isDev ? { code } : {}),
    };
  }

  async verifyOTP(phone: string, code: string) {
    const cleanCode = code.replace(/\D/g, '').trim();
    const cleanPhone = phone.trim();

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (otpRecord.attempts >= 5) {
      throw new UnauthorizedException('Too many failed attempts. Please request a new OTP.');
    }

    // Compare code hash
    const isValid = await bcrypt.compare(cleanCode, otpRecord.codeHash);
    if (!isValid) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Consume OTP
    await this.prisma.otpVerification.deleteMany({ where: { phone: cleanPhone } });

    // Find or create customer
    let user = await this.prisma.user.findUnique({ where: { phone: cleanPhone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: cleanPhone,
          role: 'CUSTOMER',
          isVerified: true,
        },
      });
    } else if (!user.isVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Contact support.');
    }

    const { accessToken, refreshToken } = this.signTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.safeUser(user),
      isNewUser: !user.name,
    };
  }

  // ─── Staff / Admin Password Auth ─────────────────────────────────────────

  async staffLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account deactivated. Contact admin.');
    }

    if (user.role === 'CUSTOMER') {
      throw new UnauthorizedException('Staff portal only. Use customer login instead.');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = this.signTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.safeUser(user),
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = this.signTokens(user);

    return { ...tokens, user: this.safeUser(user) };
  }

  // ─── Admin: Create Staff Account ─────────────────────────────────────────

  async createStaffAccount(
    email: string,
    name: string,
    phone: string,
    password: string,
    role: 'STAFF' | 'SUPER_ADMIN' = 'STAFF',
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: { email, name, phone, passwordHash, role },
    });

    return { message: 'Staff account created', user: this.safeUser(user) };
  }

  // ─── Shared ──────────────────────────────────────────────────────────────

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  // ─── 36A.5 — GET /auth/me with addresses + defaultAddress ─────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const defaultAddress = user.addresses.find((a) => a.isDefault) ?? null;

    return { ...user, defaultAddress };
  }

  // ─── PATCH /users/me (update name/phone) ──────────────────────────────────

  async updateMe(userId: string, name?: string, phone?: string) {
    const data: Record<string, string | undefined> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    return this.prisma.user.update({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true },
      data,
    });
  }
}
