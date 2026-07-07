import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import { BillChannel } from '@cafeconnect/database';

export class CreateBillDto {
  @IsEnum(BillChannel)
  channel: BillChannel;

  @IsString()
  @IsOptional()
  tableId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orderIds?: string[];
}
