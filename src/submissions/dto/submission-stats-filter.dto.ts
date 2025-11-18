import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class SubmissionStatsQueryDto {
  @IsOptional()
  @IsString()
  dateRange?: string; // last_30_days, last_7_days, last_1_year etc.

  @IsOptional()
  @IsString()
  language?: string; // ALL, TIGRINYA, ENGLISH...

  @IsOptional()
  @IsString()
  ageGroup?: string; // ALL, AGE_18_29, AGE_60_PLUS

  @IsOptional()
  @IsString()
  colorLevel?: string; // ALL, RED, ORANGE, GREEN

  @IsOptional()
  @IsNumberString()
  minScore?: string;

  @IsOptional()
  @IsNumberString()
  maxScore?: string;
}
