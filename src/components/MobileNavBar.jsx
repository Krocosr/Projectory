'use client';
import useProjectStore from '@/store/useProjectStore';

export default function MobileNavBar({ onToggleDrawer, isDrawerOpen }) {
  const isDarkMode = useProjectStore((s) => s.isDarkMode);

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 z-40 lg:hidden">
      <a href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
        <img
          src={isDarkMode ? '/exports/icon-monochrome-transparent.svg' : '/exports/icon-transparent.svg'}
          alt=""
          className="w-7 h-7"
        />
        <img src="/exports/wordmark.svg" alt="Projectory" className="h-4 hidden sm:block" />
      </a>
      <button
        onClick={onToggleDrawer}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
        aria-label={isDrawerOpen ? 'Close navigation' : 'Open navigation'}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isDrawerOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>
    </div>
  );
}
