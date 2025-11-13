import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import * as requestIp from 'request-ip';
import { UsersService } from './users.service';
import { DeviceUtils } from '../utils/device.utils';
import { SubmitAssessmentDto } from 'src/submissions/dto/submit-assessment.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private getDeviceId(req: Request, userAgent: string): string {
    const ip = requestIp.getClientIp(req) || 'unknown';
    return DeviceUtils.generateDeviceId(ip, userAgent);
  }

  @Get('identify')
  async identifyUser(
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    const deviceId = this.getDeviceId(req, userAgent);
    const user = await this.usersService.findOrCreate(deviceId);

    // Get user stats for journey
    const stats = await this.usersService.getUserStats(user.id);

    return {
      user: { id: user.id, language: user.language, ageGroup: user.ageGroup },
      journey: {
        daysActive: stats.daysActive,
        totalSubmissions: stats.totalSubmissions,
        lastSubmission: stats.lastSubmission,
      },
    };
  }

  @Post('submit')
  async submit(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    body: SubmitAssessmentDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    const deviceId = this.getDeviceId(req, userAgent);
    const ip = requestIp.getClientIp(req) ?? 'unknown';

    const result = await this.usersService.submitAssessment({
      deviceId,
      ip,
      responses: body.responses,
      language: body.language,
      ageGroup: body.ageGroup,
      userAgent,
    });

    return {
      score: result.submission.score,
      colorLevel: result.submission.colorLevel,
      groupAverage: result.groupAverage,
    };
  }

  @Get('languages')
  getLanguages() {
    return [
      { code: 'ENGLISH', name: 'English' },
      { code: 'NEDERLANDS', name: 'Nederlands' },
      { code: 'ARABIC', name: 'Arabic' },
      { code: 'TIGRINYA', name: 'Tigrinya' },
      { code: 'RUSSIAN', name: 'Russian' },
    ];
  }

  @Get('age-groups')
  getAgeGroups() {
    return [
      { code: 'AGE_12_17', name: '12-17 years' },
      { code: 'AGE_18_25', name: '18-25 years' },
      { code: 'AGE_26_40', name: '26-40 years' },
      { code: 'AGE_41_60', name: '41-60 years' },
      { code: 'AGE_60_PLUS', name: '60+ years' },
    ];
  }
}
