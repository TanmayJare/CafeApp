import { IsString } from 'class-validator';

export class VoidBillDto {
  @IsString()
  reason: string;

  @IsString()
  managerId: string;

  @IsString()
  managerPin: string;
}
