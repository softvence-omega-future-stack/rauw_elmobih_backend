import { PrismaService } from 'prisma/prisma.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { JwtService } from '@nestjs/jwt';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { errorResponse, successResponse } from 'src/utils/response.util';
import { excludeFields } from 'src/utils/exclude.util';

@Injectable()
export class AuthService {
  private refreshJwtService: JwtService;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.refreshJwtService = new JwtService({
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async findById(id: string) {
    return this.prisma.admin.findUnique({
      where: { id },
    });
  }

  async registerAdmin(dto: RegisterAdminDto) {
    try {
      // Check if admin already exists
      const existing = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });

      if (existing) {
        return errorResponse('Duplicate email', 'Admin already exists');
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
        'Failed to register admin',
        error.message || 'Something went wrong',
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

      await this.prisma.session.deleteMany({
        where: {
          refreshTokenExpiresAt: { lt: new Date() },
        },
      });

      // Now create new session
      const session = await this.prisma.session.create({
        data: {
          adminId: admin.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          lastActivity: new Date(),
          refreshTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
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

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.refreshJwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find the valid session
      const session = await this.prisma.session.findFirst({
        where: {
          refreshToken,
          isActive: true,
          isRevoked: false,
          admin: { isActive: true },
        },
        include: { admin: true },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Only generate a new ACCESS TOKEN
      const accessToken = this.jwt.sign(
        {
          id: session.admin.id,
          email: session.admin.email,
          role: session.admin.role,
          type: 'access',
        },
        { expiresIn: '15m' }, // or your configured duration
      );

      // Update session (ONLY access token, DO NOT regenerate refresh token)
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          accessToken,
          lastActivity: new Date(),
        },
      });

      return successResponse(
        {
          accessToken,
        },
        'Access token refreshed successfully',
      );
    } catch (error) {
      return errorResponse(
        error.message || 'Something went wrong',
        'Invalid signature for refresh token',
      );
    }
  }

  async changePassword(
    adminId: string,
    dto: { oldPassword: string; newPassword: string },
  ) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(
        dto.oldPassword,
        admin.password,
      );
      if (!isPasswordValid) {
        throw new ForbiddenException('Old password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

      // Update password
      await this.prisma.admin.update({
        where: { id: adminId },
        data: { password: hashedNewPassword, passwordChangedAt: new Date() },
      });

      await this.prisma.session.updateMany({
        where: { adminId },
        data: { isActive: false, isRevoked: true },
      });

      return successResponse(null, 'Password changed successfully');
    } catch (error) {
      console.error('Error in changePassword:', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to change password',
      );
    }
  }

  async getCurrentUser(adminId: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      const safeAdmin = excludeFields(admin, ['password']);

      return successResponse(
        safeAdmin,
        'Fetched current user info successfully',
      );
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return errorResponse(
        error.message || 'Something went wrong',
        'Failed to get current user',
      );
    }
  }

async verifyToken(token: string) {
  try {
    const decoded = this.jwt.verify(token);

    return successResponse(decoded, 'Token is valid');
  } catch (error) {
    return errorResponse(
      'Invalid or expired token',
      'Token verification failed',
    );
  }
}


  async logout(accessToken: string) {
    try {
      await this.prisma.session.updateMany({
        where: { accessToken },
        data: { isActive: false, isRevoked: true, revokedAt: new Date() },
      });

      return successResponse(null, 'Logged out successfully');
    } catch (error) {
      console.error('Error in logout:', error);
      throw error;
    }
  }

  private async generateTokens(adminId: string, email: string, role: string) {
    const accessTokenExpiration =
      this.config.get<string>('ACCESS_TOKEN_EXPIRATION') || '15m';
    const refreshTokenExpiration =
      this.config.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d';

    const accessTokenPayload = {
      id: adminId,
      email,
      role,
      type: 'access',
    };

    const refreshTokenPayload = {
      id: adminId,
      email,
      type: 'refresh',
    };

    const accessToken = this.jwt.sign(accessTokenPayload, {
      expiresIn: this.parseExpirationToSeconds(accessTokenExpiration),
    });

    const refreshToken = this.refreshJwtService.sign(refreshTokenPayload, {
      expiresIn: this.parseExpirationToSeconds(refreshTokenExpiration),
    });

    const expiresIn = this.parseExpirationToSeconds(accessTokenExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 900;
    }
  }
}
