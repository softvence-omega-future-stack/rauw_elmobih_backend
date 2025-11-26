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
  Delete,
  Param,
} from '@nestjs/common';
import type { Request } from 'express';
import * as requestIp from 'request-ip';
import { UsersService } from './users.service';
import { SubmitAssessmentDto } from 'src/submissions/dto/submit-assessment.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private getDeviceId(
    req: Request,
    userAgent: string,
    headers: Record<string, string>,
  ): string {
    const ip = requestIp.getClientIp(req) ?? 'unknown';
    return this.usersService.extractDeviceId(headers, ip, userAgent);
  }

  @Get('identify')
  async identifyUser(
    @Headers('user-agent') userAgent: string = 'unknown',
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    try {
      const ip = requestIp.getClientIp(req) ?? 'unknown';

      const { user, isNew, stats, deviceId } =
        await this.usersService.identifyUser(ip, userAgent, headers);

      const message = isNew
        ? 'Welcome! You can submit your first assessment.'
        : 'Welcome back!';

      return {
        success: true,
        message,
        data: {
          user: {
            id: user.id,
            deviceId: user.deviceId, // Include deviceId for client storage
            language: user.language,
            ageGroup: user.ageGroup,
          },
          journey: {
            daysSinceJoined: stats.daysSinceJoined,
            daysActive: stats.daysActive,
            totalSubmissions: stats.totalSubmissions,
            lastSubmission: stats.lastSubmission,
            checkedInToday: stats.checkedInToday,
          },
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to identify user',
        error: 'IDENTIFICATION_FAILED',
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
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    try {
      const ip = requestIp.getClientIp(req) ?? 'unknown';

      // Extract device ID using the enhanced method
      const deviceId = this.usersService.extractDeviceId(
        headers,
        ip,
        userAgent,
      );

      const result = await this.usersService.submitAssessment({
        deviceId,
        ip,
        responses: body.responses,
        language: body.language,
        ageGroup: body.ageGroup,
        userAgent,
        headers,
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
          deviceId, // Return deviceId for client storage
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

  // delete user and all their submissions
  @Delete('remove/:id')
  async deleteUser(@Param('id') userId: string) {
    try {
      await this.usersService.deleteUser(userId);
      return {
        success: true,
        message: 'User and all their submissions deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete user',
          error: error.name || 'DELETE_USER_FAILED',
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
    @Headers('user-agent') userAgent: string = 'unknown',
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ) {
    try {
      const deviceId = this.getDeviceId(req, userAgent, headers);
      const { user } = await this.usersService.identifyOrCreate(
        deviceId,
        headers,
      );

      const status = await this.usersService.getCooldownStatus(user.id);

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
