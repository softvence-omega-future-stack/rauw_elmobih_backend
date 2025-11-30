import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

  extractDeviceId(
    headers: Record<string, string>,
    ip: string,
    userAgent: string,
  ): string {
    // 1. Use frontend device ID if provided
    const deviceId = headers['x-device-id'];

    if (deviceId && DeviceUtils.isValidDeviceId(deviceId)) {
      return deviceId;
    }

    // 2. Otherwise generate a simple one
    // console.log('No deviceId sent from client, generating new one...');
    const newDeviceId = DeviceUtils.generateDeviceId(ip, userAgent);

    // console.log('Generated device ID:', newDeviceId);
    return newDeviceId;
  }

  async identifyOrCreate(
    deviceId: string,
    headers: Record<string, string> = {},
  ) {
    let user = await this.prisma.user.findUnique({
      where: { deviceId },
    });

    const isNew = !user;
    // console.log('User found in DB:', !!user);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          deviceId,
          // Set default language from headers if available
          language: this.getLanguageFromHeaders(headers) || Language.ENGLISH,
        },
      });
    } else {
      // Update last seen and potentially language from headers
      const updateData: any = { lastSeenAt: new Date() };

      const headerLanguage = this.getLanguageFromHeaders(headers);
      if (headerLanguage && !user.language) {
        updateData.language = headerLanguage;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return { user, isNew };
  }

  private getLanguageFromHeaders(
    headers: Record<string, string>,
  ): Language | null {
    const acceptLanguage = headers['accept-language'];
    if (!acceptLanguage) return null;

    // Simple mapping from browser languages to our supported languages
    const languageMap: Record<string, Language> = {
      nl: Language.NEDERLANDS,
      ar: Language.ARABIC,
      ti: Language.TIGRINYA,
      ru: Language.RUSSIAN,
      en: Language.ENGLISH,
      fa: Language.FARSI,
      prs: Language.DARI,
      so: Language.SOMALI,
      uk: Language.UKRAINIAN,
      fr: Language.FRENCH,
      tr: Language.TURKISH,
    };

    const primaryLang = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase();
    return languageMap[primaryLang] || null;
  }

  async identifyUser(
    ip: string,
    userAgent: string,
    headers: Record<string, string> = {},
  ) {
    const deviceId = this.extractDeviceId(headers, ip, userAgent);

    //! Debug logs for device identification
    // console.log('=== DEVICE IDENTIFICATION DEBUG ===');
    // console.log('IP:', ip);
    // console.log('User-Agent:', userAgent);
    // console.log(
    //   'Headers Device ID:',
    //   headers['x-device-id'] || headers['device-id'] || 'Not provided',
    // );
    // console.log('Generated Device ID:', deviceId);
    // console.log(
    //   'Accept-Language:',
    //   headers['accept-language'] || 'Not provided',
    // );
    // console.log('====================================');

    const { user, isNew } = await this.identifyOrCreate(deviceId, headers);
    const stats = await this.getUserStats(user.id, user.createdAt);

    //! Log user creation/identification
    // console.log(`User ${isNew ? 'CREATED' : 'FOUND'}:`, {
    //   userId: user.id,
    //   deviceId: user.deviceId,
    //   language: user.language,
    //   ageGroup: user.ageGroup,
    //   isNew,
    // });

    return {
      user,
      isNew,
      stats,
      deviceId,
    };
  }

  async getUserStats(userId: string, userCreatedAt: Date) {
    const submissions = await this.prisma.submission.findMany({
      where: { userId },
      select: {
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 1, // We only need the most recent one for "last 24h" check
    });

    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // 1. Days since account created (calendar days)
    const createdDate = new Date(userCreatedAt);
    createdDate.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const daysSinceJoined = Math.floor(
      (todayStart.getTime() - createdDate.getTime()) / oneDayMs,
    );

    // 2. Total unique calendar days with submissions
    const allSubmissions = await this.prisma.submission.findMany({
      where: { userId },
      select: { submittedAt: true },
    });

    const uniqueCalendarDays = new Set(
      allSubmissions.map((s) => s.submittedAt.toISOString().split('T')[0]),
    ).size;

    // 3. Did user submit in the last 24 hours? (rolling window)
    const lastSubmission = submissions[0]?.submittedAt || null;
    const checkedInLast24h = lastSubmission
      ? now.getTime() - lastSubmission.getTime() <= oneDayMs
      : false;

    return {
      daysSinceJoined,
      daysActive: uniqueCalendarDays,
      totalSubmissions: allSubmissions.length,
      lastSubmission,
      checkedInToday: checkedInLast24h, // This is what you want!
    };
  }

  async getCooldownStatus(userId: string) {
    try {
      // Use the rateLimit service that's already injected
      return await this.rateLimit.getCooldownStatus(userId);
    } catch (error) {
      console.error('Error getting cooldown status:', error);
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to get cooldown status',
        error: 'COOLDOWN_CHECK_FAILED',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async submitAssessment(data: {
    deviceId: string;
    ip: string;
    responses: any;
    language: string;
    ageGroup: string;
    userAgent?: string;
    headers?: Record<string, string>;
  }): Promise<SubmissionResult> {
    try {
      // First, identify or create user to get userId
      const { user: foundUser } = await this.identifyOrCreate(
        data.deviceId,
        data.headers,
      );

      // Check 24-hour cooldown using the actual userId
      const rateLimitCheck = await this.rateLimit.canSubmit(
        foundUser.id,
        data.ip,
      );

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

      // Update language/ageGroup if missing or different
      const updateData: any = {};
      if (
        data.language &&
        (!foundUser.language || foundUser.language !== data.language)
      ) {
        updateData.language = data.language as Language;
      }
      if (
        data.ageGroup &&
        (!foundUser.ageGroup || foundUser.ageGroup !== data.ageGroup)
      ) {
        updateData.ageGroup = data.ageGroup as AgeGroup;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.user.update({
          where: { id: foundUser.id },
          data: updateData,
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
          message:
            'User profile incomplete. Please provide language and age group.',
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
          message:
            'Invalid number of responses. WHO-5 requires exactly 5 answers.',
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
        const avg =
          userSubmissions.reduce((sum, s) => sum + s.score, 0) /
          userSubmissions.length;
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
        },
      };
    } catch (error) {
      console.error('Submission error:', error);

      // Re-throw HTTP exceptions as they are
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
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

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        deviceId: true,
        language: true,
        ageGroup: true,
        createdAt: true,
        lastSeenAt: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteUser(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete submissions first (optional: can rely on cascade if set)
    await this.prisma.submission.deleteMany({ where: { userId } });

    // Delete user
    await this.prisma.user.delete({ where: { id: userId } });

    return true;
  }
}
