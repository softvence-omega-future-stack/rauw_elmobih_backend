import { Injectable } from '@nestjs/common';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';
import { DeviceUtils } from '../utils/device.utils';
import { PrismaService } from 'prisma/prisma.service';
import { AgeGroup, Language } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private rateLimit: RateLimitingService,
  ) {}

  async getUserStats(userId: string) {
  const submissions = await this.prisma.submission.findMany({
    where: { userId },
    orderBy: { submittedAt: 'desc' }
  });

  // Calculate days active
  const uniqueDays = new Set(
    submissions.map(s => s.submittedAt.toISOString().split('T')[0])
  ).size;

  return {
    daysActive: uniqueDays,
    totalSubmissions: submissions.length,
    lastSubmission: submissions[0]?.submittedAt || null
  };
}

  async findOrCreate(deviceId: string, language?: string, ageGroup?: string) {
    let user = await this.prisma.user.findUnique({
      where: { deviceId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          deviceId,
          language: (language || 'ENGLISH') as Language,
          ageGroup: (ageGroup || null) as AgeGroup | null,
        },
      });
    }

    return user;
  }

  async submitAssessment(data: {
    deviceId: string;
    ip: string;
    responses: any;
    language: string;
    ageGroup: string;
    userAgent?: string;
  }) {
    // Check rate limit
    const canSubmit = await this.rateLimit.canSubmit(data.deviceId, data.ip);
    if (!canSubmit) {
      throw new Error('Daily submission limit reached');
    }

    // Find or create user
    const user = await this.findOrCreate(
      data.deviceId,
      data.language,
      data.ageGroup,
    );

    // Calculate score (0-100)
    const scores = Object.values(data.responses) as number[];
    const total = scores.reduce((sum, score) => sum + score, 0);
    const percentage = Math.round((total / 25) * 100);

    // Determine color level
    let colorLevel = 'GREEN';
    if (percentage < 50) colorLevel = 'RED';
    else if (percentage < 70) colorLevel = 'ORANGE';

    // Create submission
    const submission = await this.prisma.submission.create({
      data: {
        userId: user.id,
        ipHash: DeviceUtils.hashIp(data.ip),
        responses: data.responses,
        score: percentage,
        colorLevel: colorLevel as any,
        language: data.language as any,
        ageGroup: data.ageGroup as any,
        userAgent: data.userAgent,
      },
    });

    // Get group average (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentSubmissions = await this.prisma.submission.findMany({
      where: { submittedAt: { gte: weekAgo } },
    });

    const groupAverage =
      recentSubmissions.length > 0
        ? Math.round(
            recentSubmissions.reduce((sum, s) => sum + s.score, 0) /
              recentSubmissions.length,
          )
        : 68;

    return { submission, groupAverage };
  }
}
