import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash IP address for privacy (with salt)
 */
export function hashIpAddress(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-this';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex');
}

/**
 * Generate random token
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash any string with SHA256
 */
export function hashString(input: string, salt?: string): string {
  const data = salt ? input + salt : input;
  return crypto.createHash('sha256').update(data).digest('hex');
}