import * as crypto from 'crypto';

export class DeviceUtils {
  static generateDeviceId(ip: string, userAgent: string): string {
    const raw = ip + userAgent + Date.now() + Math.random();

    return crypto.createHash('sha256').update(raw).digest('hex');
  }


  static hashIp(ip: string): string {
    const salt =
      process.env.IP_HASH_SALT || 'your-app-salt-change-in-production';
    return crypto
      .createHash('sha256')
      .update(ip + salt)
      .digest('hex');
  }

  static isValidDeviceId(deviceId: string): boolean {
    return /^[a-f0-9]{64}$/.test(deviceId); // SHA256 hash format
  }
}
