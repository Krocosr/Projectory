'use client';
import { memo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useRateLimit } from '@/hooks/useRateLimit';

const UtilityBar = memo(function UtilityBar({
  searchQuery,
  onSearchChange,
  onExport,
  onImport,
  isDarkMode,
  onToggleDarkMode,
  onToggleSidebar,
  activeTodosCount,
  isStreamerMode,
  onToggleStreamerMode,
}) {
  const fileInputRef = useRef(null);
  const isToggleAllowed = useRateLimit(300);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImport?.(file);
    e.target.value = '';
  };

  const handleToggleDarkMode = () => {
    if (!isToggleAllowed()) return;
    onToggleDarkMode();
  };

  return (
    <div className="hidden lg:flex items-center justify-end gap-2">
      <button
        onClick={onExport}
        title="Export projects as JSON backup"
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>
      <button
        onClick={handleImportClick}
        title="Import projects from JSON backup"
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </button>
      <button
        onClick={onToggleSidebar}
        title="Active todos"
        className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        {activeTodosCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent-clay)] text-white text-[9px] font-bold flex items-center justify-center">
            {activeTodosCount > 9 ? '9+' : activeTodosCount}
          </span>
        )}
      </button>
      <button
        onClick={onToggleStreamerMode}
        title={isStreamerMode ? 'Disable streamer mode' : 'Enable streamer mode'}
        className={`p-2 rounded-lg transition-colors ${
          isStreamerMode
            ? 'text-red-400 hover:text-red-300 bg-red-500/10'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50'
        }`}
      >
        {isStreamerMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
      <button
        onClick={handleToggleDarkMode}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
      >
        {isDarkMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)]/40 border border-[var(--border-subtle)]">
        <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] w-20 sm:w-32"
          aria-label="Search projects"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
});

UtilityBar.displayName = 'UtilityBar';

UtilityBar.propTypes = {
  searchQuery: PropTypes.string,
  onSearchChange: PropTypes.func,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  isDarkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func,
  onToggleSidebar: PropTypes.func,
  activeTodosCount: PropTypes.number,
  isStreamerMode: PropTypes.bool,
  onToggleStreamerMode: PropTypes.func,
};

export default UtilityBar;
