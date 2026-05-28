'use client';
import { useState } from 'react';
import PropTypes from 'prop-types';

const MAX_ENTRIES = 15;

export default function ScratchpadTab({ project, onUpdateProject }) {
  const [entryText, setEntryText] = useState('');
  const log = project.scratchpadLog || [];

  const handleAdd = (e) => {
    e.preventDefault();
    const text = entryText.trim();
    if (!text) return;
    const next = [...log, text];
    if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES);
    onUpdateProject({ ...project, scratchpadLog: next });
    setEntryText('');
  };

  const handleDelete = (index) => {
    const next = log.filter((_, i) => i !== index);
    onUpdateProject({ ...project, scratchpadLog: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e8f0fe' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#4A6B8A" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Log</h3>
        </div>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">{log.length}/{MAX_ENTRIES}</span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          placeholder="Add a log entry..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all"
          aria-label="New log entry"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        {log.length > 0 ? [...log].reverse().map((entry, i) => {
          const realIndex = log.length - 1 - i;
          return (
            <div
              key={realIndex}
              className="flex items-start justify-between px-3.5 py-2.5 rounded-xl gap-2 group"
              style={{ background: '#e8f0fe' }}
            >
              <p className="text-sm text-[var(--text-primary)] leading-relaxed flex-1 min-w-0">
                {entry}
              </p>
              <button
                onClick={() => handleDelete(realIndex)}
                className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 transition-all p-0.5 shrink-0"
                aria-label="Delete entry"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        }) : (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">
            No log entries yet
          </p>
        )}
      </div>
    </div>
  );
}

ScratchpadTab.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
};
