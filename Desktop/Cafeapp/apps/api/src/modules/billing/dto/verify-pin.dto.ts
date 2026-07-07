import { IsString } from 'class-validator';

export class VerifyPinDto {
  @IsString()
  managerId: string;

  @IsString()
  pin: string;
}
