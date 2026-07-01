'use client';
import { useMemo, useCallback, useState, memo } from 'react';
import { STATUS_BG } from '@/lib/constants';
import PomodoroTimer from '@/components/detail/PomodoroTimer';
import { launchItems as desktopLaunchItems } from '@/lib/desktop';

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

const FocusedProject = memo(function FocusedProject({ project, onCancel, onToggleTodo, onUpdateProject, onNavigate }) {
  const [launching, setLaunching] = useState(false);

  const undoneTodos = useMemo(
    () => (project.todos || []).filter((t) => !t.done),
    [project.todos]
  );

  const progress = useMemo(() => {
    const total = (project.todos || []).length;
    if (total === 0) return 0;
    const done = (project.todos || []).filter((t) => t.done).length;
    return Math.round((done / total) * 100);
  }, [project.todos]);

  const hasLaunchItems = (project.launchItems || []).length > 0;

  const handleLaunch = useCallback(async () => {
    if (!hasLaunchItems) return;
    setLaunching(true);
    await desktopLaunchItems(project.launchItems);
    setLaunching(false);
  }, [project.launchItems, hasLaunchItems]);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BG[project.status] || ''}`}>
              {project.status}
            </span>
          </div>
          <button
            onClick={() => onNavigate?.(project.id)}
            className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent-clay)] transition-colors text-left"
          >
            {project.title}
          </button>
          {project.deadline && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{formatRelativeDate(project.deadline)}</p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-medium text-[var(--accent-clay)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--border-subtle)] shrink-0 ml-2"
        >
          Cancel focus
        </button>
      </div>

      {onUpdateProject && (
        <PomodoroTimer project={project} onUpdateProject={onUpdateProject} />
      )}

      {hasLaunchItems && (
        <div className="mb-3 space-y-2">
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-clay)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {launching ? 'Launching...' : `Launch${project.launchItems.length > 1 ? ` (${project.launchItems.length})` : ''}`}
          </button>
          <div className="flex flex-wrap gap-1.5">
            {project.launchItems.map((item) => (
              <span key={item.id} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--border-subtle)] text-[var(--text-muted)]">
                {item.name || item.id}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full mb-1 overflow-hidden">
        <div
          className="h-full bg-[var(--accent-clay)] rounded-full transition-all duration-300"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3">{progress}% done</p>

      <div className="space-y-1">
        {undoneTodos.slice(0, 5).map((todo) => (
          <label
            key={todo.id}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[var(--border-subtle)]/50 transition-colors cursor-pointer group min-w-0 overflow-hidden"
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => onToggleTodo(project.id, todo.id)}
              className="w-4 h-4 rounded border-2 border-[var(--text-muted)] accent-[var(--accent-clay)] shrink-0"
            />
            <span className="text-sm text-[var(--text-primary)] flex-1 min-w-0">{todo.text}</span>
            {todo.priority && todo.priority !== 'Medium' && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                todo.priority === 'High' ? 'text-[var(--accent-clay)] bg-[var(--accent-clay)]/8' : 'text-[var(--text-muted)]'
              }`}>
                {todo.priority}
              </span>
            )}
          </label>
        ))}
        {undoneTodos.length > 5 && (
          <p className="text-xs text-[var(--text-muted)] text-center pt-1">
            +{undoneTodos.length - 5} more todos
          </p>
        )}
        {undoneTodos.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-3">All done! Great work.</p>
        )}
      </div>
      </div>
  );
});

export default FocusedProject;
