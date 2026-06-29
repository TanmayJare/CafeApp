import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async sendOTP(email: string) {
    // Generate 6-digit OTP
    const code =
      process.env.NODE_ENV === 'development'
        ? '123456' // Fixed OTP for development
        : Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 10-minute expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.prisma.otpVerification.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    // Send OTP via email
    await this.mailService.sendOTP(email, code);

    return {
      message: 'OTP sent successfully',
      email,
      // In dev, return the OTP for testing
      ...(process.env.NODE_ENV === 'development' && { otp: code }),
    };
  }

  async verifyOTP(email: string, code: string) {
    // Find valid OTP
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        code,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Delete used OTP
    await this.prisma.otpVerification.delete({
      where: { id: otpRecord.id },
    });

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new customer user
      user = await this.prisma.user.create({
        data: {
          email,
          role: 'CUSTOMER',
        },
      });
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}

// Made with Bob
