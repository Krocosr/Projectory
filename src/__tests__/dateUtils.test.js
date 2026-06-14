import { describe, it, expect } from 'vitest';
import { 
  formatDeadlineForDisplay, 
  formatRelativeTime, 
  formatDeadlineRemaining 
} from '@/lib/dateUtils';

describe('dateUtils.js', () => {
  describe('formatDeadlineForDisplay', () => {
    it('should return "Ongoing" as is', () => {
      expect(formatDeadlineForDisplay('Ongoing')).toBe('Ongoing');
    });

    it('should return "Completed" as is', () => {
      expect(formatDeadlineForDisplay('Completed')).toBe('Completed');
    });

    it('should format ISO date to readable format', () => {
      const result = formatDeadlineForDisplay('2026-12-25');
      expect(result).toMatch(/Dec/);
      expect(result).toContain('25');
      // Note: formatDeadlineForDisplay only returns "Mon DD" format, not the year
    });

    it('should handle invalid dates', () => {
      const result = formatDeadlineForDisplay('invalid-date');
      // Returns the original string when invalid
      expect(result).toBe('invalid-date');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('should return days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
    });

    it('should handle invalid timestamps', () => {
      const result = formatRelativeTime('invalid');
      // Returns date string representation on error (not empty string)
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDeadlineRemaining', () => {
    it('should return overdue text for past dates', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = formatDeadlineRemaining(yesterday);
      expect(result).toContain('overdue');
      expect(result).toMatch(/\d+[dhm] overdue/);
    });

    it('should return time remaining for current time', () => {
      const now = new Date().toISOString();
      const result = formatDeadlineRemaining(now);
      // Returns something like "0 secs left" for immediate deadline
      expect(result).toContain('left');
    });

    it('should return days remaining', () => {
      const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatDeadlineRemaining(fiveDaysLater)).toContain('5 days');
    });

    it('should handle "Ongoing"', () => {
      expect(formatDeadlineRemaining('Ongoing')).toBe('');
    });

    it('should handle "Completed"', () => {
      expect(formatDeadlineRemaining('Completed')).toBe('');
    });
  });
});
