import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { DeviceUtils } from 'src/utils/device.utils';

@Injectable()
export class RateLimitingService {
  constructor(private prisma: PrismaService) {}

  async canSubmit(deviceId: string, ip: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ipHash = DeviceUtils.hashIp(ip);

    // Check device submissions today
    const deviceSubmissions = await this.prisma.submission.count({
      where: {
        user: { deviceId },
        submittedAt: { gte: today }
      }
    });

    // Check IP submissions today  
    const ipSubmissions = await this.prisma.submission.count({
      where: {
        ipHash,
        submittedAt: { gte: today }
      }
    });

    const config = await this.prisma.appConfig.findFirst();
    const dailyLimit = config?.dailyLimitRule || 3;
    const ipLimit = config?.maxIpSubmissions || 10;

    return deviceSubmissions < dailyLimit && ipSubmissions < ipLimit;
  }
}