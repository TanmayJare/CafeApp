import { IsEmail } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;
}

// Made with Bob
