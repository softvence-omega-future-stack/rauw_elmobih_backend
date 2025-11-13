import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';
import { DeviceUtils } from '../utils/device.utils';
import { PrismaService } from 'prisma/prisma.service';
import { AgeGroup, Language } from '@prisma/client';
import { SubmissionResult } from 'src/common/interface/submission-result';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private rateLimit: RateLimitingService,
  ) {}

  async getUserStats(userId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    // Calculate days active
    const uniqueDays = new Set(
      submissions.map((s) => s.submittedAt.toISOString().split('T')[0]),
    ).size;

    return {
      daysActive: uniqueDays,
      totalSubmissions: submissions.length,
      lastSubmission: submissions[0]?.submittedAt || null,
    };
  }

  async identifyOrCreate(deviceId: string) {
    let user = await this.prisma.user.findUnique({
      where: { deviceId },
    });

    const isNew = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: { deviceId },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return { user, isNew };
  }

  async submitAssessment(data: {
    deviceId: string;
    ip: string;
    responses: any;
    language: string;
    ageGroup: string;
    userAgent?: string;
  }): Promise<SubmissionResult> {
    try {
      // First, identify or create user to get userId
      const { user: foundUser } = await this.identifyOrCreate(data.deviceId);

      // Check 24-hour cooldown using the actual userId
      const rateLimitCheck = await this.rateLimit.canSubmit(foundUser.id, data.ip);
      
      if (!rateLimitCheck.canSubmit) {
        throw new ConflictException({
          success: false,
          message: rateLimitCheck.message,
          error: 'SUBMISSION_COOLDOWN',
          nextSubmissionTime: rateLimitCheck.nextSubmissionTime,
          lastSubmission: rateLimitCheck.lastSubmission,
          timestamp: new Date().toISOString(),
        });
      }

      // Update language/ageGroup if missing
      if (!foundUser.language || !foundUser.ageGroup) {
        await this.prisma.user.update({
          where: { id: foundUser.id },
          data: {
            language: data.language as Language,
            ageGroup: data.ageGroup as AgeGroup,
          },
        });
      }

      // Get final user with updated info
      const user = await this.prisma.user.findUnique({
        where: { id: foundUser.id },
        select: { id: true, language: true, ageGroup: true },
      });

      if (!user?.language || !user?.ageGroup) {
        throw new BadRequestException({
          success: false,
          message: 'User profile incomplete. Please provide language and age group.',
          error: 'INCOMPLETE_PROFILE',
          timestamp: new Date().toISOString(),
        });
      }

      // Calculate score
      const scores = Object.values(data.responses) as number[];
      
      // Validate responses
      if (scores.length !== 5) {
        throw new BadRequestException({
          success: false,
          message: 'Invalid number of responses. WHO-5 requires exactly 5 answers.',
          error: 'INVALID_RESPONSES',
          timestamp: new Date().toISOString(),
        });
      }

      const total = scores.reduce((sum, s) => sum + s, 0);
      const score = Math.round((total / 25) * 100);

      if (score < 0 || score > 100) {
        throw new BadRequestException({
          success: false,
          message: 'Invalid score calculated. Please check your responses.',
          error: 'INVALID_SCORE',
          timestamp: new Date().toISOString(),
        });
      }

      // Determine color level
      let colorLevel: 'RED' | 'ORANGE' | 'GREEN' = 'GREEN';
      if (score < 50) colorLevel = 'RED';
      else if (score < 70) colorLevel = 'ORANGE';

      // Create submission
      const submission = await this.prisma.submission.create({
        data: {
          userId: user.id,
          ipHash: DeviceUtils.hashIp(data.ip),
          responses: data.responses,
          score,
          colorLevel,
          language: user.language,
          ageGroup: user.ageGroup,
          userAgent: data.userAgent,
        },
      });

      // Calculate group average (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const userSubmissions = await this.prisma.submission.findMany({
        where: {
          userId: user.id,
          submittedAt: { gte: weekAgo },
        },
        select: { score: true },
      });

      let groupAverage: number | null = null;
      if (userSubmissions.length > 0) {
        const avg = userSubmissions.reduce((sum, s) => sum + s.score, 0) / userSubmissions.length;
        groupAverage = Math.round(avg);
      }

      // Get cooldown status for response
      const cooldownStatus = await this.rateLimit.getCooldownStatus(user.id);

      return {
        submission: {
          id: submission.id,
          score,
          colorLevel,
          submittedAt: submission.submittedAt,
        },
        groupAverage,
        user: {
          id: user.id,
          language: user.language,
          ageGroup: user.ageGroup,
        },
        cooldown: {
          canSubmitAgain: cooldownStatus.canSubmit,
          nextSubmissionTime: cooldownStatus.nextSubmissionTime,
          timeRemaining: cooldownStatus.timeRemaining,
        },
      };
    } catch (error) {
      console.error('Submission error:', error);
      
      // Re-throw HTTP exceptions as they are
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      // Wrap other errors
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to submit assessment. Please try again.',
        error: 'SUBMISSION_FAILED',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
