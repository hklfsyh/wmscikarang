/**
 * Utility functions for handling datetime in Indonesian timezone (WIB/UTC+7)
 */

/**
 * Get current datetime in Indonesian timezone (WIB/UTC+7)
 * Returns ISO string format adjusted to Indonesian time
 */
export function getIndonesianDateTime(): string {
  const now = new Date();
  // Convert to Indonesian timezone (UTC+7)
  const indonesianTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return indonesianTime.toISOString();
}

/**
 * Get today's date string in YYYYMMDD format (Indonesian timezone)
 */
export function getIndonesianDateString(): string {
  const now = new Date();
  const indonesianTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return indonesianTime.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Get today's date in YYYY-MM-DD format (Indonesian timezone)
 */
export function getIndonesianDate(): string {
  const now = new Date();
  const indonesianTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return indonesianTime.toISOString().slice(0, 10);
}
