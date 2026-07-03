import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('MAIL_PORT', 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      // Short timeouts so dev failures surface fast instead of hanging for 60s
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });

    this.logger.log(`📧 Mail transporter initialised → ${host}:${port} as ${user}`);
  }

  async sendOTP(email: string, code: string) {
    const from = this.configService.get<string>('MAIL_FROM', 'noreply@cafeconnect.com');
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    // In development mode: always log the OTP to the console first so developers/testers can find it instantly
    if (isDev) {
      this.logger.warn(`\n\n  ╔══════════════════════════════════╗`);
      this.logger.warn(`  ║  📧  OTP requested for: ${email.padEnd(10)}`);
      this.logger.warn(`  ║  🔑  OTP Code: ${code.padEnd(20)}`);
      this.logger.warn(`  ╚══════════════════════════════════╝\n`);
    }

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: `${code} is your CafeConnect verification code`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; font-size: 22px; margin-bottom: 8px;">CafeConnect</h2>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">Verify your email to continue</p>

            <p style="color: #111827; font-size: 15px; margin-bottom: 12px;">Your one-time password is:</p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #111827; margin-bottom: 20px;">
              ${code}
            </div>

            <p style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">⏱ This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`📧 OTP sent to ${email}`);
    } catch (err: any) {
      if (isDev) {
        this.logger.warn(`⚠️  SMTP delivery failed (${err?.message ?? err}), but code is valid in dev mode.`);
      } else {
        // In production always throw so the error is surfaced properly
        throw err;
      }
    }
  }
}

// Made with Bob
