import { IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentOrderDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

// Made with Bob
