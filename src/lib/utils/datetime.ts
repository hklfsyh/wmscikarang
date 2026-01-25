/**
 * Utility functions for handling datetime in Indonesian timezone (WIB/UTC+7)
 */

/**
 * Get current datetime in ISO string format in WIB timezone (UTC+7)
 * Converts to Indonesia timezone to match sidebar display
 */
export function getIndonesianDateTime(): string {
  const now = new Date();
  // Convert to WIB (UTC+7) by adding 7 hours to UTC time
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  // Return ISO string with WIB time
  return wibTime.toISOString();
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
