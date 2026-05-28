'use client';
import { memo, useRef } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const FILTERS = ['All', 'Active', 'Paused', 'Ideas', 'Finished', 'Archived'];

const DashboardHeader = memo(function DashboardHeader({ activeFilter, onFilterChange, projectCounts, searchQuery, onSearchChange, onExport, onImport, isDarkMode, onToggleDarkMode, onToggleSidebar, activeTodosCount }) {
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImport?.(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <header className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {projectCounts?.total || 0} projects across {projectCounts?.statusCount || 0} states
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={onToggleDarkMode}
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)]/40 border border-[var(--border-subtle)]">
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] w-32"
              aria-label="Search projects"
            />
          </div>
        </div>
      </div>

      <nav className="flex gap-1" role="tablist">
        {FILTERS.map((filter, i) => {
          const isActive = activeFilter === filter;
          const count = filter === 'All'
            ? projectCounts?.total
            : filter === 'Ideas'
              ? (projectCounts?.Incubating || 0) + (projectCounts?.Waiting || 0)
              : ['Archived', 'Finished'].includes(filter)
                ? (projectCounts?.[filter] || 0)
                : projectCounts?.[filter] || 0;

          return (
            <motion.button
              key={filter}
              onClick={() => onFilterChange(filter)}
              role="tab"
              aria-selected={isActive}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              initial={false}
              whileTap={{ scale: 0.96 }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {filter}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-[var(--border-subtle)]' : 'bg-[var(--bg-primary)]'
                }`}>
                  {count}
                </span>
              </span>
            </motion.button>
          );
        })}
      </nav>
    </header>
  );
});

DashboardHeader.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  projectCounts: PropTypes.shape({
    total: PropTypes.number,
    statusCount: PropTypes.number,
    Active: PropTypes.number,
    Paused: PropTypes.number,
    Incubating: PropTypes.number,
    Waiting: PropTypes.number,
    Finished: PropTypes.number,
    Archived: PropTypes.number,
  }),
  searchQuery: PropTypes.string,
  onSearchChange: PropTypes.func,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  isDarkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func,
  onToggleSidebar: PropTypes.func,
  activeTodosCount: PropTypes.number,
};

export default DashboardHeader;
