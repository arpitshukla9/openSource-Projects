/**
 * Time utilities for CodePulse
 */

/**
 * Get today's date as "YYYY-MM-DD" in local timezone
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date as "YYYY-MM-DD"
 */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date N days ago as "YYYY-MM-DD"
 */
export function getDateNDaysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get last 7 days as array of "YYYY-MM-DD" (most recent first)
 */
export function getLastSevenDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(getDateNDaysAgo(i));
  }
  return days;
}

/**
 * Get last 30 days as array of "YYYY-MM-DD"
 */
export function getLastThirtyDays(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(getDateNDaysAgo(i));
  }
  return days;
}

/**
 * Parse "YYYY-MM-DD" string to Date object (at midnight local time)
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Check if date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDate();
}

/**
 * Get day of week string (Mon, Tue, Wed, etc)
 */
export function getDayOfWeek(dateStr: string): string {
  const date = parseDate(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Format seconds to "HhMm" or "Mm" format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format seconds to "H:MM:SS" format
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get days between two date strings
 */
export function daysBetween(date1Str: string, date2Str: string): number {
  const date1 = parseDate(date1Str);
  const date2 = parseDate(date2Str);
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is older than N days
 */
export function isOlderThanDays(dateStr: string, days: number): boolean {
  const target = parseDate(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return target < cutoff;
}

/**
 * Get friendly date string (e.g., "Monday, March 1")
 */
export function getFriendlyDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  return `${dayName}, ${monthName} ${dayNum}`;
}

/**
 * Get midnight timestamp (in ms) for a given date string
 */
export function getMidnightTimestamp(dateStr: string): number {
  return parseDate(dateStr).getTime();
}
