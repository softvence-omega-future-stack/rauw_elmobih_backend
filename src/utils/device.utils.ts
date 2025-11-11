import * as crypto from 'crypto';

export class DeviceUtils {
  static generateDeviceId(ip: string, userAgent: string): string {
    const data = `${ip}-${userAgent}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }
}