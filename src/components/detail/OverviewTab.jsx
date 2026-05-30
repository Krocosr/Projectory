'use client';
import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { DetailRow, DraggableTodoList, AddTodoBar, computeProgress, computeNextStepText, getFirstActiveTodo } from './shared';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';
import { ProgressBar } from '@/components/ui';

export default function OverviewTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos }) {
  const { activeTodos, recentTodos, progress, currentFocusText, nextStepText } = useMemo(() => {
    const active = (project.todos || []).filter((t) => !t.done);
    const recent = active.slice(0, 3);
    const prog = computeProgress(project.todos);
    const firstActive = getFirstActiveTodo(project.todos);
    const currentFocus = firstActive ? firstActive.text : 'No active todos';
    const nextStep = computeNextStepText(project.todos);

    return {
      activeTodos: active,
      recentTodos: recent,
      progress: prog,
      currentFocusText: currentFocus,
      nextStepText: nextStep
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

      <div className="pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Active Todos
        </h3>
        <div className="space-y-1">
          {recentTodos.length > 0 ? (
            <DraggableTodoList
              todos={recentTodos}
              onToggle={onToggleTodo}
              onRemove={onRemoveTodo}
              onEdit={onEditTodo}
              onReorder={(reordered) => {
                const fullActive = (project.todos || []).filter((t) => !t.done);
                const rest = fullActive.slice(3);
                const done = (project.todos || []).filter((t) => t.done);
                onReorderTodos([...reordered, ...rest, ...done]);
              }}
            />
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No active todos</p>
          )}
        </div>
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
};
