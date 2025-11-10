import { IsNotEmpty, IsString } from "class-validator";

export class TokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}