/**
 * Date utility functions for formatting dates from the API
 */

/**
 * Format a date string from the API to Japanese locale format
 * @param dateString - Date string from API (may be in various formats)
 * @returns Formatted date string in Japanese locale or original string if invalid
 */
export function formatDate(dateString: string | any[]): string {
  if (!dateString) return "-";
  
  try {
    // Handle various date formats from the API
    let date: Date;
    
    // Handle array format from Jackson serialization: [year, month, day, hour, minute, second, nanosecond]
    if (Array.isArray(dateString) && dateString.length >= 6) {
      const [year, month, day, hour, minute, second, nanosecond = 0] = dateString;
      date = new Date(year, month - 1, day, hour, minute, second, Math.floor(nanosecond / 1000000));
    }
    // Handle string formats
    else if (typeof dateString === 'string') {
      // If the date string looks like ISO format without 'T', add 'T'
      // Common formats: "2024-01-01 12:34:56" -> "2024-01-01T12:34:56"
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(dateString)) {
        date = new Date(dateString.replace(' ', 'T'));
      } else {
        date = new Date(dateString);
      }
    } else {
      console.warn('Invalid date format:', dateString);
      return String(dateString);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return String(dateString); // Return original string if parsing fails
    }
    
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    // More readable format: show year only if different from current year
    if (isThisYear) {
      return date.toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString; // Return original string if any error occurs
  }
}

/**
 * Format a date string for API usage (ISO format)
 * @param date - Date object to format
 * @returns ISO string suitable for API
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}

/**
 * Format a date string to show only the date part (no time)
 * @param dateString - Date string from API (may be in various formats)
 * @returns Formatted date string in Japanese locale showing only date
 */
export function formatDateOnly(dateString: string | any[]): string {
  if (!dateString) return "-";
  
  try {
    let date: Date;
    
    // Handle array format from Jackson serialization: [year, month, day, hour, minute, second, nanosecond]
    if (Array.isArray(dateString) && dateString.length >= 6) {
      const [year, month, day, hour, minute, second, nanosecond = 0] = dateString;
      date = new Date(year, month - 1, day, hour, minute, second, Math.floor(nanosecond / 1000000));
    }
    // Handle string formats
    else if (typeof dateString === 'string') {
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(dateString)) {
        date = new Date(dateString.replace(' ', 'T'));
      } else {
        date = new Date(dateString);
      }
    } else {
      console.warn('Invalid date format:', dateString);
      return String(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return String(dateString);
    }
    
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString;
  }
}

/**
 * Check if a date string is valid
 * @param dateString - Date string to validate
 * @returns True if the date string is valid
 */
export function isValidDate(dateString: string | any[]): boolean {
  if (!dateString) return false;
  
  try {
    let date: Date;
    
    // Handle array format from Jackson serialization: [year, month, day, hour, minute, second, nanosecond]
    if (Array.isArray(dateString) && dateString.length >= 6) {
      const [year, month, day, hour, minute, second, nanosecond = 0] = dateString;
      date = new Date(year, month - 1, day, hour, minute, second, Math.floor(nanosecond / 1000000));
    }
    // Handle string formats
    else if (typeof dateString === 'string') {
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(dateString)) {
        date = new Date(dateString.replace(' ', 'T'));
      } else {
        date = new Date(dateString);
      }
    } else {
      return false;
    }
    
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}