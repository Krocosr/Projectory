'use client';
import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { DraggableTodoList, AddTodoBar, TodoItem } from './shared';
import { sortTodos, SORT_OPTIONS, groupTodosByDeadline } from '@/lib/todoAggregator';

export default function TodosTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos, onSortChange, addTodoPosition = 'top', onNotify }) {
  const [section, setSection] = useState('Active');
  const [showGrouped, setShowGrouped] = useState(false);
  const sortBy = project.sortState || 'default';

  const { activeTodos, doneTodos } = useMemo(() => ({
    activeTodos: (project.todos || []).filter((t) => !t.done),
    doneTodos: (project.todos || []).filter((t) => t.done),
  }), [project.todos]);

  const displayedTodos = useMemo(() => {
    const todos = section === 'Active' ? activeTodos : doneTodos;
    const sorted = sortTodos(todos, sortBy);
    if (sortBy === 'default' && section === 'Done') {
      sorted.sort((a, b) => b.id - a.id);
    }
    return sorted;
  }, [section, activeTodos, doneTodos, sortBy]);

  const groupedTodos = useMemo(() => {
    if (section === 'Done') return null;
    return groupTodosByDeadline(activeTodos);
  }, [activeTodos, section]);

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

      {addTodoPosition === 'top' && (
        <div className="mb-4">
          <AddTodoBar onAdd={onAddTodo} onNotify={onNotify} />
        </div>
      )}

      {showGrouped && section === 'Active' && groupedTodos ? (
        <div className="space-y-5">
          {[
            { key: 'overdue', label: 'Overdue', color: 'text-red-500', bg: 'bg-red-500/8' },
            { key: 'today', label: 'Today', color: 'text-amber-500', bg: 'bg-amber-500/8' },
            { key: 'thisWeek', label: 'This Week', color: 'text-blue-500', bg: 'bg-blue-500/8' },
            { key: 'nextMonth', label: 'Next Month', color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
            { key: 'noDeadline', label: 'No Deadline', color: 'text-[var(--text-muted)]', bg: 'bg-[var(--border-subtle)]/30' },
          ].map(({ key, label, color, bg }) => {
            const items = groupedTodos[key];
            if (!items || items.length === 0) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
                    {label}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${bg} ${color}`}>
                    {items.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggleTodo}
                      onRemove={onRemoveTodo}
                      onEdit={onEditTodo}
                      dragHandleProps={{}}
                      timeline={project.timeline}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : displayedTodos.length > 0 ? (
        <DraggableTodoList
          todos={displayedTodos}
          onToggle={onToggleTodo}
          onRemove={onRemoveTodo}
          onEdit={onEditTodo}
          onReorder={section === 'Active' ? handleReorderActive : handleReorderDone}
          timeline={project.timeline}
        />
      ) : (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
          {section === 'Done' ? 'No completed todos' : 'No active todos'}
        </p>
      )}

      {addTodoPosition === 'bottom' && (
        <div className="mt-4">
          <AddTodoBar onAdd={onAddTodo} onNotify={onNotify} />
        </div>
      )}
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
  addTodoPosition: PropTypes.oneOf(['top', 'bottom']),
};
