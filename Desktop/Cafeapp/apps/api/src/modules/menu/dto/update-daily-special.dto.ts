import { PartialType } from '@nestjs/mapped-types';
import { CreateDailySpecialDto } from './create-daily-special.dto';

export class UpdateDailySpecialDto extends PartialType(CreateDailySpecialDto) {}
