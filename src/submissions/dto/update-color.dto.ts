import { IsEnum, IsNotEmpty } from 'class-validator';
import { ColorLevel } from '@prisma/client';

export class UpdateColorDto {
  @IsEnum(ColorLevel)
  @IsNotEmpty()
  colorLevel: ColorLevel;
}
