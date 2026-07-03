import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private signTokens(user: { id: string; email: string; role: string }) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
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
    email: string;
    name: string | null;
    phone: string | null;
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

  async sendOTP(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    // Delete any existing (unused) OTPs for this email to prevent accumulation
    await this.prisma.otpVerification.deleteMany({ where: { email: cleanEmail } });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.prisma.otpVerification.create({
      data: { email: cleanEmail, code, expiresAt },
    });

    await this.mailService.sendOTP(cleanEmail, code);

    return { message: 'OTP sent successfully', email: cleanEmail };
  }

  async verifyOTP(email: string, code: string) {
    // Sanitise: strip all whitespace and non-digit chars the browser may inject
    const cleanCode = code.replace(/\D/g, '').trim();

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        code: cleanCode,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Consume the OTP immediately
    await this.prisma.otpVerification.delete({ where: { id: otpRecord.id } });

    // Use the sanitised email consistently — the OTP was stored against cleanEmail
    const normalizedEmail = email.toLowerCase().trim();

    // Find or create the customer — customers are auto-registered on first login
    let user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email: normalizedEmail, role: 'CUSTOMER' },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Contact support.');
    }

    // Allow users with any role (STAFF, RIDER, SUPER_ADMIN) to log in to their customer profiles/app
    // if (user.role !== 'CUSTOMER') {
    //   throw new UnauthorizedException('This login is for customers only');
    // }

    const { accessToken, refreshToken } = this.signTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.safeUser(user),
      isNewUser: !user.name, // Flag for onboarding flow
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
    password: string,
    role: 'STAFF' | 'SUPER_ADMIN' = 'STAFF',
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: { email, name, passwordHash, role },
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
