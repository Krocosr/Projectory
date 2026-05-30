'use client';
import { motion } from 'framer-motion';

export function ProgressBar({ value, label, height = 'h-1.5', animated = true, className = '' }) {
  return (
    <div
      className={`${height} bg-[var(--border-subtle)] rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Progress: ${value}%`}
    >
      <motion.div
        animate={animated ? { width: `${value}%` } : undefined}
        initial={animated ? false : undefined}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg, var(--accent-clay), var(--accent-clay-light))' }}
      />
    </div>
  );
}
