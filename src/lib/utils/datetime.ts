/**
 * Utility functions for handling datetime in Indonesian timezone (WIB/UTC+7)
 */

/**
 * Get current datetime in ISO string format using browser's local time
 * No timezone conversion - uses the exact time shown in browser/sidebar
 */
export function getIndonesianDateTime(): string {
  const now = new Date();
  // Return ISO string directly without timezone manipulation
  // This ensures the time saved matches what user sees in browser/sidebar
  return now.toISOString();
}

/**
 * Get today's date string in YYYYMMDD format using browser's local time
 */
export function getIndonesianDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format using browser's local time
 */
export function getIndonesianDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
