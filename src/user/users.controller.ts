import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  ValidationPipe,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
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
    @Headers('user-agent') userAgent: string = 'unknown',
    @Req() req: Request,
  ) {
    try {
      const ip = requestIp.getClientIp(req) ?? 'unknown';
      const deviceId = DeviceUtils.generateDeviceId(ip, userAgent);

      const { user, isNew } = await this.usersService.identifyOrCreate(deviceId);
      const stats = await this.usersService.getUserStats(user.id);

      const message = isNew ? 'Welcome! You can submit your first assessment.' : 'Welcome back!';

      return {
        message,
        data: {
          user: {
            id: user.id,
            language: user.language,
            ageGroup: user.ageGroup,
          },
          journey: {
            daysActive: stats.daysActive,
            totalSubmissions: stats.totalSubmissions,
            lastSubmission: stats.lastSubmission,
          },
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to identify user',
        error: 'IDENTIFICATION_FAILED',
        timestamp: new Date().toISOString(),
      });
    }
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
    try {
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

      // Success response
      return {
        success: true,
        message: 'Assessment submitted successfully',
        data: {
          score: result.submission.score,
          colorLevel: result.submission.colorLevel,
          groupAverage: result.groupAverage,
          submissionId: result.submission.id,
          submittedAt: result.submission.submittedAt,
          interpretation: this.getInterpretation(result.submission.score),
          cooldown: result.cooldown,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Let the specific HTTP exceptions pass through
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle other errors
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to submit assessment',
          error: error.name || 'SUBMISSION_ERROR',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private getInterpretation(score: number): string {
    if (score < 50) return 'Needs Support - Consider seeking professional help';
    if (score < 70) return 'Good - Maintain your current habits';
    return 'Excellent - Keep up the great work on your mental wellbeing';
  }

  @Get('cooldown-status')
  async getCooldownStatus(
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    try {
      const deviceId = this.getDeviceId(req, userAgent);
      const { user } = await this.usersService.identifyOrCreate(deviceId);
      
      const rateLimitingService = this.usersService['rateLimit']; // Access via reflection or make public
      const status = await rateLimitingService.getCooldownStatus(user.id);

      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to get cooldown status',
        error: 'COOLDOWN_CHECK_FAILED',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('languages')
  getLanguages() {
    return {
      success: true,
      data: [
        { code: 'ENGLISH', name: 'English' },
        { code: 'NEDERLANDS', name: 'Nederlands' },
        { code: 'ARABIC', name: 'Arabic' },
        { code: 'TIGRINYA', name: 'Tigrinya' },
        { code: 'RUSSIAN', name: 'Russian' },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  @Get('age-groups')
  getAgeGroups() {
    return {
      success: true,
      data: [
        { code: 'AGE_12_17', name: '12-17 years' },
        { code: 'AGE_18_25', name: '18-25 years' },
        { code: 'AGE_26_40', name: '26-40 years' },
        { code: 'AGE_41_60', name: '41-60 years' },
        { code: 'AGE_60_PLUS', name: '60+ years' },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}
