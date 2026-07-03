import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PostLocationDto {
  @IsString()
  orderId: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  speed?: number;
}

// Made with Bob
