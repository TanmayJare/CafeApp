import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly templateName: string;
  private readonly templateLang: string;

  constructor(private configService: ConfigService) {
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION', 'v20.0');
    this.templateName = this.configService.get<string>('WHATSAPP_TEMPLATE_NAME', 'otp_login');
    this.templateLang = this.configService.get<string>('WHATSAPP_TEMPLATE_LANG', 'en_US');
  }

  private maskPhone(phone: string): string {
    if (!phone) return '';
    return phone.length > 7
      ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
      : '****';
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: this.templateName,
        language: {
          code: this.templateLang,
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
        ],
      },
    };

    const maskedPhone = this.maskPhone(phone);
    this.logger.log(`Sending WhatsApp OTP to ${maskedPhone}...`);
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`Graph API Error: ${JSON.stringify(data)}`);
        throw new Error(data?.error?.message || 'Failed to send WhatsApp message');
      }

      this.logger.log(`WhatsApp OTP successfully sent to ${maskedPhone}`);
    } catch (err: any) {
      if (isDev) {
        this.logger.warn(`⚠️  WhatsApp delivery failed (${err.message}), but code is valid in dev mode.`);
      } else {
        this.logger.error(`Failed to send WhatsApp message: ${err.message}`);
        throw new InternalServerErrorException(
          `WhatsApp delivery failed: ${err.message}`,
        );
      }
    }
  }
}
