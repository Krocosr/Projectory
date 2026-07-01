'use client';
import { memo } from 'react';

const UrgentTodosPanel = memo(function UrgentTodosPanel({ todos, onToggle, onNavigate }) {
  if (todos.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 flex-1 min-h-0 overflow-y-auto">
        <p className="text-xs text-[var(--text-muted)] text-center">No urgent todos.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">High Priority</span>
        <span className="text-[10px] font-medium text-[var(--accent-clay)]">{todos.length}</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {todos.map((todo) => (
          <div
            key={`${todo.projectId}-${todo.id}`}
            className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--border-subtle)]/30 transition-colors cursor-pointer overflow-hidden"
            onClick={() => onNavigate(todo.projectId)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(todo.projectId, todo.id); }}
              className="shrink-0 w-4 h-4 rounded border-2 border-[var(--text-muted)] hover:border-[var(--accent-clay)] transition-colors flex items-center justify-center"
              aria-label={`Toggle "${todo.text}"`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)]">{todo.text}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{todo.projectTitle}</p>
            </div>
            <svg className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
});

export default UrgentTodosPanel;
