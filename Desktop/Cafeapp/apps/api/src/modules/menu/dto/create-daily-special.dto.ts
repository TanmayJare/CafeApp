import {
  IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsInt, Min, MaxLength,
} from 'class-validator';

export class CreateDailySpecialDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  badgeText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsNumber()
  @Min(0)
  discountedPrice: number;

  @IsOptional()
  @IsString()
  linkedMenuItemId?: string;

  @IsDateString()
  availableFrom: string; // ISO datetime e.g. "2024-06-30T10:00:00.000Z"

  @IsDateString()
  availableUntil: string; // ISO datetime e.g. "2024-06-30T23:59:00.000Z"

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
