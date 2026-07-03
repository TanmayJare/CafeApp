import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { InvoiceService } from './invoice.service';
import { KotService } from './kot.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    OrdersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get('JWT_SECRET'),
        signOptions: { expiresIn: cs.get('JWT_EXPIRES_IN') || '7d' },
      }),
    }),
  ],
  controllers: [InvoicesController],
  providers: [InvoiceService, KotService],
  exports: [InvoiceService, KotService],
})
export class InvoicesModule {}

// Made with Bob
