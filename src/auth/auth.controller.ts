import { Body, Controller, Post, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from 'src/guard/auth.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-admin')
  async registerAdmin(@Body() dto: RegisterAdminDto) {
    return this.authService.registerAdmin(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async logout(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
