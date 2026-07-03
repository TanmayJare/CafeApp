import { IsBoolean } from 'class-validator';

export class UpdateOnlineDto {
  @IsBoolean()
  isOnline: boolean;
}

// Made with Bob
