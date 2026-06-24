import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, RejectReason } from '@cafeconnect/database';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsEnum(RejectReason)
  @IsOptional()
  rejectReason?: RejectReason;

  @IsString()
  @IsOptional()
  riderId?: string;
}

// Made with Bob