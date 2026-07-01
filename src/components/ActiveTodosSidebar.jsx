'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PropTypes from 'prop-types';
import { PRIORITY_STYLES } from '@/lib/constants';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';
import { Input } from '@/components/ui';
import { SORT_OPTIONS, sortTodos } from '@/lib/todoAggregator';

function TodoItem({ todo, onToggle, onNavigate, dragHandleProps }) {
  const truncateProjectName = (name) => {
    if (name.length > 18) {
      return name.slice(0, 18) + '...';
    }
    return name;
  };

  return (
    <div className="group flex items-start gap-3 px-5 py-3 hover:bg-[var(--border-subtle)]/30 transition-colors border-b border-[var(--border-subtle)]">
      <div {...dragHandleProps} className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      </div>
      
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
  dragHandleProps: PropTypes.object,
};

export default function ActiveTodosSidebar({ isOpen, todos, onToggleTodo, onNavigateToProject, onReorderTodos }) {
  const [sortBy, setSortBy] = useState('priority');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter todos based on search
  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return todos;
    const query = searchQuery.toLowerCase();
    return todos.filter(todo => 
      todo.text.toLowerCase().includes(query) || 
      todo.projectTitle.toLowerCase().includes(query)
    );
  }, [todos, searchQuery]);

  // Sort filtered todos using shared sort function
  const sortedTodos = useMemo(() => sortTodos(filteredTodos, sortBy), [filteredTodos, sortBy]);

  // Display todos (can be reordered via DND)
  const [displayTodos, setDisplayTodos] = useState([]);

  // Update display todos when sorted todos change
  useEffect(() => {
    setDisplayTodos([...sortedTodos]);
  }, [sortedTodos]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const reordered = [...displayTodos];
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setDisplayTodos(reordered);
    if (onReorderTodos) {
      onReorderTodos(reordered);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={false}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="shrink-0 bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] flex-col overflow-hidden h-screen fixed right-0 top-0 hidden lg:flex"
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
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6l-4 5h4l-5 7h6m3-16l4 5h-4l5 7h-6" />
              </svg>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-[11px] px-1.5 py-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none cursor-pointer hover:border-[var(--text-muted)] transition-colors"
                aria-label="Sort todos"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-5 py-3 border-b border-[var(--border-subtle)] shrink-0">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos..."
              aria-label="Search todos"
            />
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
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
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sidebar-todos">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`transition-colors ${snapshot.isDraggingOver ? 'bg-[var(--accent-clay)]/5' : ''}`}
                    >
                      {displayTodos.map((todo, index) => (
                        <Draggable 
                          key={`${todo.projectId}-${todo.id}`} 
                          draggableId={`${todo.projectId}-${todo.id}`} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={provided.draggableProps.style}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[var(--accent-clay)]/30 bg-[var(--bg-card)] rounded-lg' : ''}`}
                            >
                              <TodoItem
                                todo={todo}
                                onToggle={onToggleTodo}
                                onNavigate={onNavigateToProject}
                                dragHandleProps={provided.dragHandleProps}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
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
  onReorderTodos: PropTypes.func,
};
