import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AddressType, AddressLabel } from '@cafeconnect/database';

export class CreateAddressDto {
  @IsEnum(AddressType)
  type!: AddressType;

  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @IsOptional()
  @IsString()
  customLabel?: string; // required when label = CUSTOM

  @IsOptional()
  @IsString()
  nickname?: string; // e.g. "Mom's place"

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  // Society fields
  @IsOptional()
  @IsString()
  societyName?: string;

  @IsOptional()
  @IsString()
  tower?: string;

  @IsOptional()
  @IsString()
  wing?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  flatNumber?: string;

  // External / map-picked fields
  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

// Made with Bob
