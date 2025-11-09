/**
 * Add minutes to date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

/**
 * Add hours to date
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

/**
 * Check if date is within last N hours
 */
export function isWithinLastHours(date: Date, hours: number): boolean {
  const hoursAgo = new Date(Date.now() - hours * 3600000);
  return date > hoursAgo;
}

/**
 * Check if date is within last N days
 */
export function isWithinLastDays(date: Date, days: number): boolean {
  const daysAgo = new Date(Date.now() - days * 86400000);
  return date > daysAgo;
}

/**
 * Get start of day
 */
export function startOfDay(date: Date = new Date()): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date = new Date()): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

/**
 * Format date to ISO string without time
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range for analytics
 */
export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = addDays(end, -days);
  return { start: startOfDay(start), end: endOfDay(end) };
}