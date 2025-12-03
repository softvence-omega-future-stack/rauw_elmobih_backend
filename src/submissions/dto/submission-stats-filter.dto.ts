import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class SubmissionStatsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  dateRange?: string; 

  @IsOptional()
  @IsString()
  language?: string; 

  @IsOptional()
  @IsString()
  ageGroup?: string;

  @IsOptional()
  @IsString()
  colorLevel?: string; 

  @IsOptional()
  @IsNumberString()
  minScore?: string;

  @IsOptional()
  @IsNumberString()
  maxScore?: string;
}
