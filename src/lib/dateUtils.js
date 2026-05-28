/**
 * Format an ISO date string for display
 * @param {string} isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @returns {string} Formatted date string (e.g., "Jun 15")
 */
export function formatDeadlineForDisplay(isoDate) {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return isoDate;
    
    // Format as "Mon DD" (e.g., "Jun 15")
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    console.error('Failed to format date:', e);
    return isoDate;
  }
}

/**
 * Format a timestamp for relative display
 * @param {string} iso - ISO 8601 timestamp
 * @returns {string} Relative time string (e.g., "2h ago")
 */
export function formatRelativeTime(iso) {
  if (!iso) return '';
  
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return d.toLocaleDateString();
  } catch (e) {
    console.error('Failed to format relative time:', e);
    return '';
  }
}

/**
 * Format a project's lastWorked field safely.
 * Handles both ISO timestamps and pre-formatted strings (seed data).
 * @param {string} lastWorked - ISO timestamp or pre-formatted string
 * @returns {string} Display-ready relative time
 */
export function formatLastWorked(lastWorked) {
  if (!lastWorked) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(lastWorked)) {
    return formatRelativeTime(lastWorked);
  }
  return lastWorked;
}

/**
 * Convert ISO date to input[type="date"] value format
 * @param {string} isoDate - ISO 8601 date string
 * @returns {string} Date in YYYY-MM-DD format
 */
export function toDateInputValue(isoDate) {
  if (!isoDate) return '';
  
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
    
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Failed to convert to date input value:', e);
    return '';
  }
}
