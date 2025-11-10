import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterAdminDto {
  @IsOptional()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
