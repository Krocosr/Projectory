'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { DetailRow, DraggableTodoList, AddTodoBar, computeProgress, computeNextStepText, getFirstActiveTodo } from './shared';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';

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
        <div
          className="h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Project progress: ${progress}%`}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--accent-clay), var(--accent-clay-light))',
            }}
          />
        </div>
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
