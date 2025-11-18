import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const admin = await this.authService.findById(payload.id);

    if (!admin) {
      throw new UnauthorizedException('Admin no longer exists');
    }

    if (
      admin.passwordChangedAt &&
      payload.iat * 1000 < admin.passwordChangedAt.getTime()
    ) {
      throw new UnauthorizedException('Token invalid after password change');
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  }
}
