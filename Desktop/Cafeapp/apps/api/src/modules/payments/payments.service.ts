import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay;

  constructor(private configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  async createOrder(amount: number, orderId: string) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: orderId,
        notes: {
          orderId,
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(options);
      this.logger.log(`Razorpay order created: ${razorpayOrder.id}`);

      return {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      throw error;
    }
  }

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    try {
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
      
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex');

      const isValid = generatedSignature === razorpaySignature;
      
      if (isValid) {
        this.logger.log(`Payment signature verified for order: ${razorpayOrderId}`);
      } else {
        this.logger.warn(`Invalid payment signature for order: ${razorpayOrderId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify payment signature', error);
      return false;
    }
  }

  async getPaymentDetails(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to fetch payment details: ${paymentId}`, error);
      throw error;
    }
  }
}

// Made with Bob
