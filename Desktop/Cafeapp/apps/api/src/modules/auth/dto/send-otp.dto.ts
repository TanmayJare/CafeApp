import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone number must be in valid E.164 format (e.g. +919876543210)',
  })
  phone: string;
}
