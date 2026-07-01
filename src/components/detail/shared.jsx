'use client';

export { TodoItem } from './TodoItem';
export { default as AddTodoBar } from './AddTodoBar';
export { default as DraggableTodoList } from './DraggableTodoList';
export { default as EditTodoModal } from './EditTodoModal';

export function groupTimelineByDate(entries) {
  const groups = {};
  (entries || []).forEach((e) => {
    const key = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

export function computeProgress(todos) {
  if (!todos || todos.length === 0) return 0;
  const done = todos.filter((t) => t.done).length;
  return Math.round((done / todos.length) * 100);
}

export function computeNextStepText(todos) {
  const active = (todos || []).filter((t) => !t.done);
  if (active.length <= 1) return '-';
  return active[1].text;
}

export function getFirstActiveTodo(todos) {
  if (!todos || todos.length === 0) return null;
  return todos.find((t) => !t.done) || null;
}

export function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-4 first:pt-0 last:pb-0 border-b border-[var(--border-subtle)] last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
        {label}
      </dt>
      <dd className="text-sm text-[var(--text-primary)] leading-relaxed" data-streamer>{value}</dd>
    </div>
  );
}
