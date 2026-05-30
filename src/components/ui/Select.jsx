'use client';
import { forwardRef } from 'react';

const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
