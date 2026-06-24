import { IsString, IsInt, Min, IsArray, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptions?: { optionId: string }[];
}

// Made with Bob