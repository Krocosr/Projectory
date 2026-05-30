'use client';
import { forwardRef } from 'react';

const variants = {
  gradient:
    'px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  icon:
    'p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
};

const Button = forwardRef(function Button({ variant = 'secondary', className = '', style, children, ...props }, ref) {
  const base = variants[variant] || variants.secondary;
  return (
    <button
      ref={ref}
      className={`${base} ${className}`}
      style={variant === 'gradient' ? { background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)', ...style } : style}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
