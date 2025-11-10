import { PrismaService } from 'prisma/prisma.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { errorResponse, successResponse } from 'src/utils';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async registerAdmin(dto: RegisterAdminDto) {
    try {
      // Check if admin already exists
      const existing = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (existing) {
        return errorResponse('Admin already exists', 'Duplicate email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // Create new admin
      const admin = await this.prisma.admin.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      return successResponse(
        {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
        'Admin registered successfully',
      );
    } catch (error) {
      console.error('Error in registerAdmin:', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to register admin',
      );
    }
  }

  async login(dto: LoginDto) {
    try {
      // Find admin by email
      const admin = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (!admin) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if admin is active
      if (!admin.isActive) {
        throw new ForbiddenException('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        dto.password,
        admin.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(
        admin.id,
        admin.email,
        admin.role,
      );

      // Create session
      const session = await this.prisma.session.create({
        data: {
          adminId: admin.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          lastActivity: new Date(),
        },
      });

      // Update admin last login
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      return successResponse(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        'Login successful',
      );
    } catch (error) {
      console.error('Error in login:', error);
      throw error;
    }
  }

  private async generateTokens(adminId: string, email: string, role: string) {
    const accessTokenPayload = {
      sub: adminId,
      email,
      role,
      type: 'access',
    };

    const refreshTokenPayload = {
      sub: adminId,
      email,
      type: 'refresh',
    };

    const accessToken = this.jwt.sign(accessTokenPayload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(refreshTokenPayload, {
      expiresIn: '7d',
    });

    // Calculate expiration time in seconds (simple conversion for now)
    const expiresIn = 900; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }
}
