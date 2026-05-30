'use client';
import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { DraggableTodoList, AddTodoBar } from './shared';

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'priority-high', label: 'Priority \u2193' },
  { value: 'priority-low', label: 'Priority \u2191' },
  { value: 'deadline-asc', label: 'Deadline \u2191' },
  { value: 'deadline-desc', label: 'Deadline \u2193' },
  { value: 'alpha-asc', label: 'A \u2192 Z' },
  { value: 'alpha-desc', label: 'Z \u2192 A' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

export default function TodosTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos, onSortChange }) {
  const [section, setSection] = useState('Active');
  const sortBy = project.sortState || 'default';

  const { activeTodos, doneTodos } = useMemo(() => ({
    activeTodos: (project.todos || []).filter((t) => !t.done),
    doneTodos: (project.todos || []).filter((t) => t.done),
  }), [project.todos]);

  const sortTodos = useCallback((todos, isDone) => {
    if (sortBy === 'default') {
      if (isDone) {
        const sorted = [...todos];
        sorted.sort((a, b) => b.id - a.id);
        return sorted;
      }
      return todos;
    }
    const sorted = [...todos];
    switch (sortBy) {
      case 'priority-high':
        sorted.sort((a, b) => {
          const rank = { High: 0, Medium: 1, Low: 2 };
          return rank[a.priority] - rank[b.priority];
        });
        break;
      case 'priority-low':
        sorted.sort((a, b) => {
          const rank = { High: 2, Medium: 1, Low: 0 };
          return rank[a.priority] - rank[b.priority];
        });
        break;
      case 'alpha-asc':
        sorted.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'alpha-desc':
        sorted.sort((a, b) => b.text.localeCompare(a.text));
        break;
      case 'newest':
        sorted.sort((a, b) => b.id - a.id);
        break;
      case 'oldest':
        sorted.sort((a, b) => a.id - b.id);
        break;
      case 'deadline-asc':
        sorted.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        });
        break;
      case 'deadline-desc':
        sorted.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return b.deadline.localeCompare(a.deadline);
        });
        break;
    }
    return sorted;
  }, [sortBy]);

  const displayedTodos = useMemo(() => {
    const todos = section === 'Active' ? activeTodos : doneTodos;
    return sortTodos(todos, section === 'Done');
  }, [section, activeTodos, doneTodos, sortTodos]);

  const handleReorderActive = useCallback((reordered) => {
    const done = (project.todos || []).filter((t) => t.done);
    onReorderTodos([...reordered, ...done]);
  }, [project.todos, onReorderTodos]);

  const handleReorderDone = useCallback((reordered) => {
    const active = (project.todos || []).filter((t) => !t.done);
    onReorderTodos([...active, ...reordered]);
  }, [project.todos, onReorderTodos]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-6">
          {['Active', 'Done'].map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`text-xs font-medium uppercase tracking-wider pb-3 -mb-3 transition-colors ${
                section === s
                  ? 'text-[var(--accent-clay)] border-b-2 border-[var(--accent-clay)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s}
              <span className="ml-1.5 text-[10px] opacity-60">
                {s === 'Done' ? doneTodos.length : activeTodos.length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6l-4 5h4l-5 7h6m3-16l4 5h-4l5 7h-6" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="text-[11px] px-1.5 py-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none cursor-pointer hover:border-[var(--text-muted)] transition-colors"
            aria-label="Sort todos"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {displayedTodos.length > 0 ? (
        <DraggableTodoList
          todos={displayedTodos}
          onToggle={onToggleTodo}
          onRemove={onRemoveTodo}
          onEdit={onEditTodo}
          onReorder={section === 'Active' ? handleReorderActive : handleReorderDone}
        />
      ) : (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
          {section === 'Done' ? 'No completed todos' : 'No active todos'}
        </p>
      )}

      <div className="mt-4">
        <AddTodoBar onAdd={onAddTodo} />
      </div>
    </div>
  );
}

TodosTab.propTypes = {
  project: PropTypes.object.isRequired,
  onAddTodo: PropTypes.func.isRequired,
  onToggleTodo: PropTypes.func.isRequired,
  onRemoveTodo: PropTypes.func.isRequired,
  onEditTodo: PropTypes.func.isRequired,
  onReorderTodos: PropTypes.func.isRequired,
  onSortChange: PropTypes.func,
};
