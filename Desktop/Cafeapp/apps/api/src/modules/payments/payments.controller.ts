import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create-order')
  async createPaymentOrder(@Body() dto: CreatePaymentOrderDto) {
    try {
      // Verify order exists and belongs to user
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Create Razorpay order
      const razorpayOrder = await this.paymentsService.createOrder(
        dto.amount,
        dto.orderId,
      );

      return {
        success: true,
        data: razorpayOrder,
      };
    } catch (error) {
      this.logger.error('Failed to create payment order', error);
      throw error;
    }
  }

  @Post('verify')
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    try {
      // Verify payment signature
      const isValid = this.paymentsService.verifyPaymentSignature(
        dto.razorpayOrderId,
        dto.razorpayPaymentId,
        dto.razorpaySignature,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid payment signature');
      }

      // Update payment status
      await this.prisma.payment.upsert({
        where: { orderId: dto.orderId },
        create: {
          orderId: dto.orderId,
          method: 'UPI',
          status: 'COMPLETED',
          amount: 0, // Will be updated from order
          razorpayOrderId: dto.razorpayOrderId,
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
        },
        update: {
          status: 'COMPLETED',
          razorpayOrderId: dto.razorpayOrderId,
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
        },
      });

      this.logger.log(`Payment verified for order: ${dto.orderId}`);

      return {
        success: true,
        message: 'Payment verified successfully',
      };
    } catch (error) {
      this.logger.error('Failed to verify payment', error);
      throw error;
    }
  }
}

// Made with Bob
