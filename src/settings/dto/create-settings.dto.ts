import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganizationType } from '@prisma/client';

export class CreateSettingsDto {
  @IsEnum(OrganizationType)
  @IsOptional()
  organizationType?: OrganizationType = OrganizationType.COA;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  additionalNotes?: string;
}

