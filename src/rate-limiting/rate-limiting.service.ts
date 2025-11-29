import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { DeviceUtils } from '../utils/device.utils';

@Injectable()
export class RateLimitingService {
  private readonly SUBMISSION_COOLDOWN_HOURS = 24;

  constructor(private prisma: PrismaService) {}

async canSubmit(userId: string, ip: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const lastSubmission = await this.prisma.submission.findFirst({
    where: {
      userId,
      submittedAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  if (lastSubmission) {
    const nextSubmissionTime = new Date();
    nextSubmissionTime.setHours(24, 0, 0, 0); // Tomorrow at 12:00 AM

    return {
      canSubmit: false,
      message: 'You can only submit once per day.',
      lastSubmission: lastSubmission.submittedAt,
      nextSubmissionTime,
    };
  }

  return {
    canSubmit: true,
    message: 'Allowed to submit.',
    lastSubmission: null,
    nextSubmissionTime: null,
  };
}

  /**
   * Record submission timestamp for rate limiting
   */
  async recordSubmission(deviceId: string, ip: string): Promise<void> {
    try {
      const ipHash = DeviceUtils.hashIp(ip);
      const now = new Date();

      // We don't need to store anything in rate_limits table since we check submissions directly
      // This method is kept for consistency but doesn't need to do anything
      console.log(`Submission recorded for device: ${deviceId} at ${now}`);
    } catch (error) {
      console.error('Failed to record submission:', error);
      // Don't throw to avoid blocking the submission flow
    }
  }

async getCooldownStatus(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const submission = await this.prisma.submission.findFirst({
    where: {
      userId,
      submittedAt: { gte: todayStart },
    },
  });

  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);

  if (submission) {
    const timeRemaining = tomorrow.getTime() - Date.now();

    return {
      canSubmit: false,
      nextSubmissionTime: tomorrow,
      timeRemaining,
    };
  }

  return {
    canSubmit: true,
    nextSubmissionTime: null,
    timeRemaining: null,
  };
}

}