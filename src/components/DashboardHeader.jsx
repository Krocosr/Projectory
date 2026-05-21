'use client';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const FILTERS = ['All', 'Active', 'Paused', 'Ideas', 'Finished', 'Archived'];

export default function DashboardHeader({ activeFilter, onFilterChange, projectCounts, searchQuery, onSearchChange }) {
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/40 border border-[var(--border-subtle)]">
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
                  className="absolute inset-0 bg-white border border-[var(--border-subtle)] rounded-lg shadow-sm"
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
}

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
};
