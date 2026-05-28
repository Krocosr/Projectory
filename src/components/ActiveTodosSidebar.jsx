'use client';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { PRIORITY_STYLES } from '@/lib/constants';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';

function TodoItem({ todo, onToggle, onNavigate }) {
  return (
    <div className="group flex items-start gap-3 px-5 py-3 hover:bg-[var(--border-subtle)]/30 transition-colors">
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
        <p className="text-sm text-[var(--text-primary)] leading-snug truncate">
          {todo.text}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium}`}>
            {todo.priority}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            {todo.projectTitle}
          </span>
          {todo.projectDeadline && (
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
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
};

export default function ActiveTodosSidebar({ isOpen, onClose, todos, onToggleTodo, onNavigateToProject }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-[45] sm:bg-transparent sm:pointer-events-auto"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[380px] bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] z-[46] shadow-2xl flex flex-col"
            role="complementary"
            aria-label="Active todos sidebar"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
              <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                Active Todos
                <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                  {todos.length}
                </span>
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {todos.length === 0 ? (
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
                todos.map((todo) => (
                  <TodoItem
                    key={`${todo.projectId}-${todo.id}`}
                    todo={todo}
                    onToggle={onToggleTodo}
                    onNavigate={onNavigateToProject}
                  />
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

ActiveTodosSidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  todos: PropTypes.arrayOf(PropTypes.object).isRequired,
  onToggleTodo: PropTypes.func.isRequired,
  onNavigateToProject: PropTypes.func.isRequired,
};
