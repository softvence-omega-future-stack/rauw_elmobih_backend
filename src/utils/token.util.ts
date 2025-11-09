import { v4 as uuidv4 } from 'uuid';

/**
 * Generate device ID (UUID v4)
 */
export function generateDeviceId(): string {
  return uuidv4();
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}