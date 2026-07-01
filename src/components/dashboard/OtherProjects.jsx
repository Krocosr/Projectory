'use client';
import { memo, useMemo } from 'react';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
}

const OtherProjects = memo(function OtherProjects({ projects, focusedProjectId, onNavigate }) {
  const others = useMemo(
    () => projects.filter((p) => p.id !== focusedProjectId),
    [projects, focusedProjectId]
  );

  if (others.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wider">All Projects</h3>
      <div className="space-y-1.5">
        {others.slice(0, 4).map((p) => {
          const total = (p.todos || []).length;
          const done = (p.todos || []).filter((t) => t.done).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isOverdue = p.deadline && p.deadline < getToday();
          return (
            <button
              key={p.id}
              onClick={() => onNavigate(p.id)}
              className="w-full flex items-center gap-4 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]/50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isOverdue ? 'bg-[var(--accent-clay)]' : 'bg-[var(--accent-clay)]'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-medium shrink-0 ${pct >= 80 ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>{pct}%</span>
                </div>
              </div>
              {p.deadline && (
                <span className={`text-xs font-medium shrink-0 whitespace-nowrap ${
                  isOverdue ? 'text-[var(--accent-clay)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {formatRelativeDate(p.deadline)}
                </span>
              )}
            </button>
          );
        })}
        {others.length > 4 && (
          <p className="text-xs text-[var(--text-muted)] text-center pt-1">+{others.length - 4} more</p>
        )}
      </div>
    </div>
  );
});

export default OtherProjects;
