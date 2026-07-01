'use client';
import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { STATUS_BG } from '@/lib/constants';

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
}

const THRESHOLD = 100;

const SwipeDeck = memo(function SwipeDeck({ projects, onFocus, onNavigate }) {
  const [index, setIndex] = useState(0);
  const [key, setKey] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const current = projects[index];

  const advance = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex >= projects.length) {
      setIndex(-1);
    } else {
      setIndex(nextIndex);
    }
    setExiting(false);
    setDirection(null);
    setFocusTarget(null);
    setKey((k) => k + 1);
  }, [index, projects.length]);

  const handleAnimationComplete = useCallback(() => {
    if (exiting) {
      if (focusTarget) onFocus(focusTarget);
      advance();
    }
  }, [exiting, advance, focusTarget, onFocus]);

  const commit = useCallback((dir, focusProject) => {
    setFocusTarget(focusProject || null);
    setDirection(dir);
    setExiting(true);
  }, []);

  const handleFocus = useCallback(() => {
    if (!current || exiting) return;
    commit('right', current);
  }, [current, exiting, commit]);

  const handleSkip = useCallback(() => {
    if (!current || exiting) return;
    commit('left');
  }, [current, exiting, commit]);

  const handleReset = useCallback(() => {
    setIndex(0);
    setKey((k) => k + 1);
    setDirection(null);
    setExiting(false);
  }, []);

  const handleSurprise = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * projects.length);
    setIndex(randomIndex);
    setKey((k) => k + 1);
    setDirection(null);
    setExiting(false);
  }, [projects]);

  const handleDragEnd = useCallback((_, { offset, velocity }) => {
    if (!current || exiting) return;
    if (offset.x > THRESHOLD || (offset.x > 60 && velocity.x > 500)) {
      commit('right', current);
    } else if (offset.x < -THRESHOLD || (offset.x < -60 && velocity.x < -500)) {
      commit('left');
    }
  }, [current, exiting, commit]);

  const flyTarget = exiting
    ? direction === 'right'
      ? { x: 450, y: 180, rotate: 15, opacity: 0 }
      : { x: -450, y: 180, rotate: -15, opacity: 0 }
    : null;

  const animateTarget = flyTarget || { x: 0, opacity: 1, scale: 1 };

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-[var(--text-muted)]">No active projects to show.</p>
      </div>
    );
  }

  if (index === -1) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-sm text-[var(--text-muted)] mb-3">You&apos;ve seen all the projects!</p>
        <button
          onClick={handleReset}
          className="text-sm font-medium text-[var(--accent-clay)] hover:text-[var(--text-primary)] transition-colors px-4 py-2 rounded-lg hover:bg-[var(--border-subtle)]"
        >
          Reset deck
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={`${current.id}-${key}`}
        drag={!exiting ? 'x' : false}
        dragElastic={0.4}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onAnimationComplete={handleAnimationComplete}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={animateTarget}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        whileDrag={{
          scale: 0.97,
          transition: { duration: 0.05 },
        }}
        onTap={() => onNavigate?.(current.id)}
        className="w-full max-w-md cursor-grab active:cursor-grabbing"
      >
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BG[current.status] || ''}`}>
              {current.status}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{index + 1}/{projects.length}</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{current.title}</h3>
          {current.goal && (
            <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{current.goal}</p>
          )}
          {current.deadline && (
            <p className="text-xs text-[var(--text-muted)] mb-3">{formatRelativeDate(current.deadline)}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
            <span>{(current.todos || []).filter((t) => !t.done).length} todos remaining</span>
            <span>·</span>
            <span>{(current.todos || []).length} total</span>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handleSkip}
          className="w-12 h-12 flex items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
          aria-label="Skip"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={handleFocus}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-[var(--accent-clay)] text-white hover:bg-[var(--accent-clay)]/90 transition-colors shadow-lg"
          aria-label="Focus on this project"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <button
        onClick={handleSurprise}
        className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        Surprise me
      </button>
    </div>
  );
});

export default SwipeDeck;
