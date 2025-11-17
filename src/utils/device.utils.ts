// src/utils/device.utils.ts
import * as crypto from 'crypto';

export class DeviceUtils {
  /**
   * Normalize User-Agent to keep only OS + Device core info
   * This way Chrome vs Firefox on same device → same ID
   */
  private static normalizeUserAgent(ua: string): string {
    if (!ua) return 'unknown';

    // Keep only meaningful parts: OS, version, device model
    return ua
      .toLowerCase()
      .replace(/chrome|firefox|safari|edge|opera\/[\d.]+/g, '') // remove browser name+version
      .replace(/version\/[\d.]+/g, '')
      .replace(/[^\w\s()-]/g, '') // remove special chars
      .trim();
  }

  /**
   * Generate stable device ID
   * Same device + same OS → same ID across browsers
   */
  static generateDeviceId(ip: string, userAgent: string): string {
    const cleanIp = ip || 'unknown';
    const normalizedUa = this.normalizeUserAgent(userAgent);
    const data = `${cleanIp}|${normalizedUa}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash IP for storage (privacy)
   */
  static hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }
}