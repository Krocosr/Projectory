'use client';
import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all resize-none ${className}`}
      {...props}
    />
  );
});

export default Textarea;
