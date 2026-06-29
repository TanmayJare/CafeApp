import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const host = this.configService.get('MAIL_HOST');
    const port = this.configService.get('MAIL_PORT');
    let user = this.configService.get('MAIL_USER');
    let pass = this.configService.get('MAIL_PASS');

    // For development: create Ethereal test account if credentials not provided
    if (!user || !pass) {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      console.log('📧 Using Ethereal test account:', user);
      console.log('📧 Preview emails at: https://ethereal.email');
    }

    this.transporter = nodemailer.createTransport({
      host: host || 'smtp.ethereal.email',
      port: port || 587,
      secure: false,
      auth: { user, pass },
    });
  }

  async sendOTP(email: string, code: string) {
    const from =
      this.configService.get('MAIL_FROM') || 'noreply@cafeconnect.com';

    const info = await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Your CafeConnect OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">CafeConnect Login</h2>
          <p>Your OTP code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    // Log preview URL for Ethereal
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  }
}

// Made with Bob
