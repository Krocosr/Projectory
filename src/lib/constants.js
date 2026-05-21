// App-wide constants

// Timing
export const AUTO_SAVE_DEBOUNCE_MS = 600;

// Z-index scale
export const Z_INDEX = {
  FAB: 40,
  MODAL: 50,
  CONTEXT_MENU: 9999,
};

// Project statuses
export const STATUSES = ['Active', 'Paused', 'Incubating', 'Waiting', 'Finished'];

// Status colors
export const STATUS_COLORS = {
  Active: '#5A8F6C',
  Paused: '#C9953E',
  Incubating: '#4A6B8A',
  Waiting: '#C9953E',
  Finished: '#7A706A',
  Archived: '#A39A94',
};

// Status styles for badges
export const STATUS_STYLES = {
  Active: { bg: 'bg-[#5A8F6C]', dot: 'bg-white/70' },
  Paused: { bg: 'bg-[#C9953E]', dot: 'bg-white/70' },
  Incubating: { bg: 'bg-[#4A6B8A]', dot: 'bg-white/70' },
  Waiting: { bg: 'bg-[#C9953E]', dot: 'bg-white/70' },
  Finished: { bg: 'bg-[#7A706A]', dot: 'bg-white/70' },
  Archived: { bg: 'bg-[#A39A94]', dot: 'bg-white/70' },
};

// Status background styles for badges with borders
export const STATUS_BG = {
  Active: 'bg-[#5A8F6C]/10 text-[#5A8F6C] border-[#5A8F6C]/20',
  Paused: 'bg-[#C9953E]/10 text-[#C9953E] border-[#C9953E]/20',
  Incubating: 'bg-[#4A6B8A]/10 text-[#4A6B8A] border-[#4A6B8A]/20',
  Waiting: 'bg-[#C9953E]/10 text-[#C9953E] border-[#C9953E]/20',
  Finished: 'bg-[#7A706A]/10 text-[#7A706A] border-[#7A706A]/20',
  Archived: 'bg-[#A39A94]/10 text-[#A39A94] border-[#A39A94]/20',
};

// Priority styles
export const PRIORITY_STYLES = {
  High: 'text-[var(--accent-clay)] bg-[var(--accent-clay)]/8',
  Medium: 'text-[#C9953E] bg-[#C9953E]/8',
  Low: 'text-[var(--text-muted)] bg-[var(--border-subtle)]/50',
};
