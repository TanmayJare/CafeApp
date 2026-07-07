import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class ApplyDiscountDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsString()
  @IsOptional()
  managerPin?: string;
}
