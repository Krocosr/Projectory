'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { PRIORITY_STYLES } from '@/lib/constants';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';

function TodoItem({ todo, onToggle, onNavigate, onDragStart, onDragOver, onDrop, isDragging }) {
  const truncateProjectName = (name) => {
    if (name.length > 18) {
      return name.slice(0, 18) + '...';
    }
    return name;
  };

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, todo)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, todo)}
      className={`group flex items-start gap-3 px-5 py-3 hover:bg-[var(--border-subtle)]/30 transition-colors border-b border-[var(--border-subtle)] cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(todo.projectId, todo.id, !todo.done);
        }}
        className="mt-0.5 shrink-0 w-4 h-4 rounded border-2 border-[var(--text-muted)] hover:border-[var(--accent-clay)] transition-colors flex items-center justify-center"
        aria-label={`Mark "${todo.text}" as done`}
      >
        {todo.done && (
          <svg className="w-3 h-3 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <button
        onClick={() => onNavigate(todo.projectId)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-sm text-[var(--text-primary)] leading-snug truncate mb-1.5">
          {todo.text}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            title={todo.projectTitle}
          >
            {truncateProjectName(todo.projectTitle)}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium}`}>
            {todo.priority}
          </span>
          {todo.projectDeadline && (
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
              {formatDeadlineForDisplay(todo.projectDeadline)}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

TodoItem.propTypes = {
  todo: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  isDragging: PropTypes.bool,
};

export default function ActiveTodosSidebar({ isOpen, todos, onToggleTodo, onNavigateToProject }) {
  const [sortBy, setSortBy] = useState('priority');
  const [displayTodos, setDisplayTodos] = useState([]);
  const [draggedTodo, setDraggedTodo] = useState(null);

  // Update display todos when todos or sortBy changes
  useEffect(() => {
    setDisplayTodos([...todos]);
  }, [todos, sortBy]);

  const handleDragStart = (e, todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTodo) => {
    e.preventDefault();
    if (!draggedTodo || draggedTodo.id === targetTodo.id) {
      setDraggedTodo(null);
      return;
    }

    const draggedIndex = displayTodos.findIndex(
      (t) => t.id === draggedTodo.id && t.projectId === draggedTodo.projectId
    );
    const targetIndex = displayTodos.findIndex(
      (t) => t.id === targetTodo.id && t.projectId === targetTodo.projectId
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTodo(null);
      return;
    }

    const newTodos = [...displayTodos];
    const [removed] = newTodos.splice(draggedIndex, 1);
    newTodos.splice(targetIndex, 0, removed);

    setDisplayTodos(newTodos);
    setDraggedTodo(null);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    // Reset to sorted order from parent
    setDisplayTodos([...todos]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="shrink-0 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden"
          role="complementary"
          aria-label="Active todos sidebar"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Active Todos
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                {displayTodos.length}
              </span>
            </h2>
          </div>

          <div className="px-5 py-3 border-b border-[var(--border-subtle)] shrink-0">
            <label htmlFor="sort-select" className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-clay)] focus:border-transparent"
            >
              <option value="priority">Priority</option>
              <option value="deadline">Deadline</option>
              <option value="project">Project</option>
              <option value="created">Created</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                <div className="w-12 h-12 rounded-xl bg-[var(--border-subtle)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">All clear!</p>
                <p className="text-xs text-[var(--text-muted)]">No active todos across your projects.</p>
              </div>
            ) : (
              displayTodos.map((todo) => (
                <TodoItem
                  key={`${todo.projectId}-${todo.id}`}
                  todo={todo}
                  onToggle={onToggleTodo}
                  onNavigate={onNavigateToProject}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={draggedTodo?.id === todo.id && draggedTodo?.projectId === todo.projectId}
                />
              ))
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

ActiveTodosSidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  todos: PropTypes.arrayOf(PropTypes.object).isRequired,
  onToggleTodo: PropTypes.func.isRequired,
  onNavigateToProject: PropTypes.func.isRequired,
};
