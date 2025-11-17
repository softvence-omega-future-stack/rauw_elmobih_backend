import {
  Body,
  Controller,
  Post,
  Headers,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from 'src/guard/auth.guard';
import { Roles } from 'src/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Request } from 'express';
import { RolesGuard } from 'src/guard/role.guard';
import { CurrentUser } from 'src/decorator/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-admin')
  async registerAdmin(@Body() dto: RegisterAdminDto) {
    const result = await this.authService.registerAdmin(dto);
    return result;
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async changePassword(
    @CurrentUser('id') adminId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(adminId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  async getCurrentUser(@CurrentUser('id') adminId: string) {
    return this.authService.getCurrentUser(adminId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async logout(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
