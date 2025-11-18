import { IsOptional, IsString, IsIn, Matches } from 'class-validator';

export class CreateBrandDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @IsOptional()
  @IsString()
  logo?: string; // assigned by controller on upload
}
