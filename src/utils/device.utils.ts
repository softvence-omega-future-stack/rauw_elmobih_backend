import * as crypto from 'crypto';

export class DeviceUtils {
  /**
   * Extract meaningful device components from User-Agent
   * More specific than your current approach but still privacy-conscious
   */
  private static extractDeviceComponents(ua: string): string {
    if (!ua) return 'unknown';

    const components: string[] = [];

    // Platform/OS detection (more specific)
    if (ua.includes('Windows NT 10.0')) components.push('windows10');
    else if (ua.includes('Windows NT 6.3')) components.push('windows8.1');
    else if (ua.includes('Windows NT 6.2')) components.push('windows8');
    else if (ua.includes('Windows NT 6.1')) components.push('windows7');
    else if (ua.includes('Windows')) components.push('windows');
    else if (ua.includes('Mac OS X 10_15')) components.push('macos_catalina');
    else if (ua.includes('Mac OS X 10_14')) components.push('macos_mojave');
    else if (ua.includes('Mac OS X')) components.push('macos');
    else if (ua.includes('Linux')) components.push('linux');
    else if (ua.includes('Android 10')) components.push('android10');
    else if (ua.includes('Android 9')) components.push('android9');
    else if (ua.includes('Android')) components.push('android');
    else if (ua.includes('iOS 14')) components.push('ios14');
    else if (ua.includes('iOS 13')) components.push('ios13');
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) components.push('ios');

    // Architecture
    if (ua.includes('x64') || ua.includes('Win64') || ua.includes('WOW64')) components.push('64bit');
    else if (ua.includes('x86') || ua.includes('Win32')) components.push('32bit');
    else if (ua.includes('ARM64')) components.push('arm64');
    else if (ua.includes('ARM')) components.push('arm');

    // Device type
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) components.push('mobile');
    else if (ua.includes('Tablet') || ua.includes('iPad')) components.push('tablet');
    else components.push('desktop');

    return components.join('|');
  }

  /**
   * Get IP range for better stability (same network = same range)
   */
  private static getIpRange(ip: string): string {
    // For IPv4: take first 2 octets (e.g., 192.168.x.x)
    const ipv4Match = ip.match(/^(\d+\.\d+)\./);
    if (ipv4Match) {
      return ipv4Match[1];
    }

    // For IPv6: take first 4 groups
    const ipv6Match = ip.match(/^([a-f0-9:]+:[a-f0-9:]+:[a-f0-9:]+):/i);
    if (ipv6Match) {
      return ipv6Match[1];
    }

    return 'unknown';
  }

  /**
   * Generate stable device ID that persists across browsers on same device
   */
  static generateDeviceId(ip: string, userAgent: string): string {
    const cleanIp = ip || 'unknown';
    const deviceComponents = this.extractDeviceComponents(userAgent);
    
    // Combine IP range + device components for stability
    const ipRange = this.getIpRange(cleanIp);
    const data = `${ipRange}|${deviceComponents}`;
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash IP for storage (privacy)
   */
  static hashIp(ip: string): string {
    const salt = process.env.IP_HASH_SALT || 'your-app-salt-change-in-production';
    return crypto.createHash('sha256').update(ip + salt).digest('hex');
  }

  /**
   * Validate device ID format
   */
  static isValidDeviceId(deviceId: string): boolean {
    return /^[a-f0-9]{64}$/.test(deviceId); // SHA256 hash format
  }
}