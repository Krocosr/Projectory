'use client';
import { memo } from 'react';
import PropTypes from 'prop-types';
import { PROJECT_SORT_OPTIONS } from '@/lib/constants';
import UtilityBar from '@/components/UtilityBar';

const FILTERS = ['All', 'Active', 'Paused', 'Ideas', 'Finished', 'Archived'];

const DashboardHeader = memo(function DashboardHeader({
  activeFilter,
  onFilterChange,
  projectCounts,
  searchQuery,
  onSearchChange,
  onExport,
  onImport,
  isDarkMode,
  onToggleDarkMode,
  onToggleSidebar,
  activeTodosCount,
  projectSortBy,
  onProjectSortChange,
  isStreamerMode,
  onToggleStreamerMode,
}) {
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
        <UtilityBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onExport={onExport}
          onImport={onImport}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onToggleSidebar={onToggleSidebar}
          activeTodosCount={activeTodosCount}
          isStreamerMode={isStreamerMode}
          onToggleStreamerMode={onToggleStreamerMode}
        />
      </div>

      <nav className="flex flex-wrap items-center gap-1" role="tablist">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const count = filter === 'All'
            ? projectCounts?.total
            : filter === 'Ideas'
              ? (projectCounts?.Incubating || 0) + (projectCounts?.Waiting || 0)
              : ['Archived', 'Finished'].includes(filter)
                ? (projectCounts?.[filter] || 0)
                : projectCounts?.[filter] || 0;

          return (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              role="tab"
              aria-selected={isActive}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {filter}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-[var(--border-subtle)]' : 'bg-[var(--bg-primary)]'
                }`}>
                  {count}
                </span>
              </span>
            </button>
          );
        })}
        <div className="nav-sort-wrap">
          <svg className="nav-sort-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6l-4 5h4l-5 7h6m3-16l4 5h-4l5 7h-6" />
          </svg>
          <select
            value={projectSortBy || 'changed'}
            onChange={(e) => onProjectSortChange?.(e.target.value)}
            className="nav-sort-select"
            aria-label="Sort projects"
          >
            {PROJECT_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </nav>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

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
  projectSortBy: PropTypes.string,
  onProjectSortChange: PropTypes.func,
  isStreamerMode: PropTypes.bool,
  onToggleStreamerMode: PropTypes.func,
};

export default DashboardHeader;
