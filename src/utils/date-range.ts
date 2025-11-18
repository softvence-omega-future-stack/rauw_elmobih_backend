import { subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';

export function getDateRange(range: string) {
  const now = new Date();

  switch (range) {
    case 'last_30_days':
      return { start: subDays(now, 30), end: now };
    case 'last_15_days':
      return { start: subDays(now, 15), end: now };
    case 'last_10_days':
      return { start: subDays(now, 10), end: now };
    case 'last_7_days':
      return { start: subDays(now, 7), end: now };
    case 'yesterday':
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    case '1_month':
      return { start: subMonths(now, 1), end: now };
    case '2_months':
      return { start: subMonths(now, 2), end: now };
    case '3_months':
      return { start: subMonths(now, 3), end: now };
    case '6_months':
      return { start: subMonths(now, 6), end: now };
    case '1_year':
      return { start: subYears(now, 1), end: now };
    default:
      return null;
  }
}
