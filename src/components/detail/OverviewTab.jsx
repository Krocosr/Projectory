'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DetailRow, DraggableTodoList, AddTodoBar, TodoItem, computeProgress, computeNextStepText, getFirstActiveTodo } from './shared';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';
import { ProgressBar } from '@/components/ui';

export default function OverviewTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos, onShowAllTodos }) {
  const [showAll, setShowAll] = useState(false);
  const todosSectionRef = useRef(null);

  useEffect(() => {
    if (showAll && todosSectionRef.current) {
      todosSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showAll]);

  const { activeTodos, progress, currentFocusText, nextStepText, recentTodos } = useMemo(() => {
    const active = (project.todos || []).filter((t) => !t.done);
    const prog = computeProgress(project.todos);
    const firstActive = getFirstActiveTodo(project.todos);
    const currentFocus = firstActive ? firstActive.text : 'No active todos';
    const nextStep = computeNextStepText(project.todos);

    return {
      activeTodos: active,
      progress: prog,
      currentFocusText: currentFocus,
      nextStepText: nextStep,
      recentTodos: active.slice(0, 3)
    };
  }, [project.todos]);

  return (
    <div className="space-y-1">
      <DetailRow label="Goal" value={project.goal} />
      <DetailRow label="Current Focus" value={project.currentFocus || currentFocusText} />
      <DetailRow label="Next Step" value={project.nextStep || nextStepText} />
      <DetailRow label="Deadline" value={formatDeadlineForDisplay(project.deadline)} />
      <DetailRow label="Description" value={project.description} />

      <div className="py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Progress
          </span>
          <span className="text-sm font-semibold text-[var(--text-secondary)] tabular-nums">
            {progress}%
          </span>
        </div>
        <ProgressBar value={progress} label={`Project progress: ${progress}%`} height="h-2" />
      </div>

      <div className="pt-4" ref={todosSectionRef}>
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Active Todos
        </h3>
        {activeTodos.length > 0 ? (
          showAll ? (
            <div>
              <DraggableTodoList
                todos={activeTodos}
                onToggle={onToggleTodo}
                onRemove={onRemoveTodo}
                onEdit={onEditTodo}
                onReorder={(reordered) => {
                  const done = (project.todos || []).filter((t) => t.done);
                  onReorderTodos([...reordered, ...done]);
                }}
              />
              <button
                onClick={() => setShowAll(false)}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-[var(--accent-clay)] hover:text-[var(--text-primary)] bg-[var(--accent-clay)]/[0.04] hover:bg-[var(--accent-clay)]/[0.08] rounded-lg transition-colors"
              >
                &larr; Show less
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggleTodo}
                  onRemove={onRemoveTodo}
                  onEdit={onEditTodo}
                />
              ))}
              {activeTodos.length > 3 && (
                <button
                  onClick={() => {
                    onShowAllTodos?.();
                    // Scroll to top when navigating to Todos tab
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        window.scrollTo(0, 0);
                      });
                    });
                  }}
                  className="w-full mt-2 px-3 py-2 text-xs font-medium text-[var(--accent-clay)] hover:text-[var(--text-primary)] bg-[var(--accent-clay)]/[0.04] hover:bg-[var(--accent-clay)]/[0.08] rounded-lg transition-colors"
                >
                  Show all {activeTodos.length} active todos &rarr;
                </button>
              )}
            </div>
          )
        ) : (
          <p className="text-xs text-[var(--text-muted)]">No active todos</p>
        )}
        <div className="mt-3">
          <AddTodoBar onAdd={onAddTodo} />
        </div>
      </div>
    </div>
  );
}

OverviewTab.propTypes = {
  project: PropTypes.object.isRequired,
  onAddTodo: PropTypes.func.isRequired,
  onToggleTodo: PropTypes.func.isRequired,
  onRemoveTodo: PropTypes.func.isRequired,
  onEditTodo: PropTypes.func.isRequired,
  onReorderTodos: PropTypes.func.isRequired,
  onShowAllTodos: PropTypes.func,
};
