import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { DeviceUtils } from '../utils/device.utils';

@Injectable()
export class RateLimitingService {
  private readonly SUBMISSION_COOLDOWN_HOURS = 24;

  constructor(private prisma: PrismaService) {}

  /**
   * Check if user can submit based on 24-hour cooldown
   */
  async canSubmit(deviceId: string, ip: string): Promise<{ 
    canSubmit: boolean; 
    nextSubmissionTime?: Date;
    lastSubmission?: Date;
    message?: string;
  }> {
    try {
      const ipHash = DeviceUtils.hashIp(ip);
      
      // Find the most recent submission for this device
      const lastSubmission = await this.prisma.submission.findFirst({
        where: { userId: deviceId }, // Note: deviceId is used as userId in this context
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true }
      });

      if (!lastSubmission) {
        return { canSubmit: true };
      }

      const now = new Date();
      const lastSubmissionTime = new Date(lastSubmission.submittedAt);
      const nextAllowedTime = new Date(lastSubmissionTime);
      nextAllowedTime.setHours(nextAllowedTime.getHours() + this.SUBMISSION_COOLDOWN_HOURS);

      if (now < nextAllowedTime) {
        const timeRemaining = Math.ceil((nextAllowedTime.getTime() - now.getTime()) / (1000 * 60)); // in minutes
        
        let timeMessage: string;
        if (timeRemaining > 60) {
          const hours = Math.floor(timeRemaining / 60);
          const minutes = timeRemaining % 60;
          timeMessage = `${hours}h ${minutes}m`;
        } else {
          timeMessage = `${timeRemaining}m`;
        }

        return {
          canSubmit: false,
          nextSubmissionTime: nextAllowedTime,
          lastSubmission: lastSubmissionTime,
          message: `You can submit again in ${timeMessage}. Please wait 24 hours between submissions.`
        };
      }

      return { canSubmit: true };
    } catch (error) {
      console.error('Rate limiting check failed:', error);
      // Fail open to not block submissions in case of errors
      return { canSubmit: true };
    }
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

  /**
   * Get submission cooldown status for a user
   */
  async getCooldownStatus(deviceId: string): Promise<{
    canSubmit: boolean;
    nextSubmissionTime?: Date;
    lastSubmission?: Date;
    timeRemaining?: string;
  }> {
    try {
      const lastSubmission = await this.prisma.submission.findFirst({
        where: { userId: deviceId },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true }
      });

      if (!lastSubmission) {
        return { canSubmit: true };
      }

      const now = new Date();
      const lastSubmissionTime = new Date(lastSubmission.submittedAt);
      const nextAllowedTime = new Date(lastSubmissionTime);
      nextAllowedTime.setHours(nextAllowedTime.getHours() + this.SUBMISSION_COOLDOWN_HOURS);

      if (now < nextAllowedTime) {
        const timeRemainingMs = nextAllowedTime.getTime() - now.getTime();
        const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const timeRemaining = `${hours}h ${minutes}m`;

        return {
          canSubmit: false,
          nextSubmissionTime: nextAllowedTime,
          lastSubmission: lastSubmissionTime,
          timeRemaining
        };
      }

      return { canSubmit: true };
    } catch (error) {
      console.error('Failed to get cooldown status:', error);
      return { canSubmit: true };
    }
  }
}