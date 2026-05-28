'use client';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export default function ScratchpadWidget({ content, onClick, onUnpin }) {
  const truncated = content && content.length > 120
    ? content.slice(0, 120) + '...'
    : content || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-subtle)] shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Scratchpad
          </span>
        </div>
        <button
          onClick={onUnpin}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
          aria-label="Remove scratchpad from dashboard"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        onClick={onClick}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-clay)] rounded-lg"
      >
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap line-clamp-4">
          {truncated || (
            <span className="italic text-[var(--text-muted)]">
              Empty scratchpad &mdash; click to write
            </span>
          )}
        </p>
      </button>
    </motion.div>
  );
}

ScratchpadWidget.propTypes = {
  content: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  onUnpin: PropTypes.func.isRequired,
};
