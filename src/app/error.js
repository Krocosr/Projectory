'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for the App Router.
 * Catches unhandled errors in the client-side component tree.
 * 
 * Next.js 14 App Router convention:
 * - Must be a Client Component ('use client')
 * - Receives error + reset props
 * - Replaces the nearest parent layout or page on error
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Something went wrong
        </h1>
        
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          An unexpected error occurred. This might be temporary.
        </p>
        
        {error.message && (
          <p className="text-xs text-[var(--text-muted)] mb-6 font-mono bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border-subtle)] truncate">
            {error.message}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
          >
            Try again
          </button>
          
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] transition-colors duration-200"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
