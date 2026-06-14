import Link from 'next/link';

/**
 * 404 Not Found page for the App Router.
 * Displayed when a route is not matched.
 * 
 * Next.js 14 App Router convention:
 * - Can be a Server Component (no 'use client' needed)
 * - Displayed when notFound() is called or route is unmatched
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--border-subtle)] flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)] mb-2">
          404
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mb-8">
          This page doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-flex px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
