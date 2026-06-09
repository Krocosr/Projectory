'use client';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createTodo } from '@/lib/storage';
import { EMPTY_ERROR_TIMEOUT_MS } from '@/lib/constants';
import { PRIORITY_STYLES, Z_INDEX } from '@/lib/constants';
import { formatRelativeTime, formatDeadlineForDisplay } from '@/lib/dateUtils';
import { Input, Textarea, Select, Button } from '@/components/ui';

function findTodoCompletedAt(todoText, timeline) {
  if (!timeline || !todoText) return null;
  const escaped = todoText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^Marked "${escaped}" as done$`);
  const entry = [...timeline].reverse().find((e) => re.test(e.action));
  return entry?.date || null;
}

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

export const TodoItem = memo(function TodoItem({ todo, onToggle, onRemove, onEdit, dragHandleProps, onExpandChange, timeline }) {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  const firstMenuItemRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(null);

  useLayoutEffect(() => {
    onExpandChange?.();
  }, [expanded, onExpandChange]);

  useEffect(() => {
    // Measure menu and adjust position to stay in viewport
    if (contextMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let adjustedX = contextMenu.x;
      let adjustedY = contextMenu.y;

      // Check right edge
      if (adjustedX + rect.width > window.innerWidth - 8) {
        adjustedX = window.innerWidth - rect.width - 8;
      }
      // Check bottom edge
      if (adjustedY + rect.height > window.innerHeight - 8) {
        adjustedY = window.innerHeight - rect.height - 8;
      }
      // Check left edge
      if (adjustedX < 8) adjustedX = 8;
      // Check top edge
      if (adjustedY < 8) adjustedY = 8;

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [contextMenu]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setAdjustedPosition(null);
  };

  useEffect(() => {
    if (contextMenu) {
      if (firstMenuItemRef.current) firstMenuItemRef.current.focus();
      const handleClick = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) closeContextMenu();
      };
      const handleKey = (e) => { if (e.key === 'Escape') closeContextMenu(); };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleKey);
      };
    }
  }, [contextMenu]);

  const handleEdit = () => {
    closeContextMenu();
    onEdit?.(todo);
  };

  const handleDelete = () => {
    closeContextMenu();
    onRemove(todo.id);
  };

  const handleCheck = () => {
    closeContextMenu();
    onToggle(todo.id);
  };

  return (
    <>
      <div
        className="rounded-lg hover:bg-[var(--border-subtle)]/40 transition-colors group bg-transparent"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing p-0.5 text-[var(--text-muted)] shrink-0"
              aria-label="Drag to reorder"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => onToggle(todo.id)}
            className="w-4 h-4 rounded border-[var(--border-checkbox)] accent-[var(--checkbox-accent)] shrink-0"
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span data-streamer className={`text-sm transition-colors truncate ${todo.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
              {todo.text}
            </span>
            {todo.details && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5 shrink-0"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          {todo.deadline && !todo.done && (
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">
              {formatDeadlineForDisplay(todo.deadline)}
            </span>
          )}
          {todo.done && (() => {
            const timestamp = todo.completedAt || findTodoCompletedAt(todo.text, timeline);
            if (!timestamp) return null;
            return (
              <span className="text-[10px] text-[var(--text-muted)] shrink-0" title={new Date(timestamp).toLocaleString()}>
                {formatRelativeTime(timestamp)}
              </span>
            );
          })()}
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium}`}>
            {todo.priority}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); onRemove(todo.id); }}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-clay)] transition-all p-1 shrink-0"
            aria-label="Remove todo"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <AnimatePresence initial={false}>
          {expanded && todo.details && (
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2.5 pl-12">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {todo.details}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {contextMenu && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="fixed bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-modal)] border border-[var(--border-subtle)] py-1 min-w-[140px] overflow-hidden"
            style={{ left: adjustedPosition?.x || contextMenu.x, top: adjustedPosition?.y || contextMenu.y, zIndex: Z_INDEX.CONTEXT_MENU }}
            role="menu"
            aria-label="Todo options"
          >
            <button
              ref={firstMenuItemRef}
              onClick={handleEdit}
              className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors flex items-center gap-2"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleCheck}
              className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors flex items-center gap-2"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {todo.done ? 'Uncheck' : 'Check'}
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.text === nextProps.todo.text &&
    prevProps.todo.done === nextProps.todo.done &&
    prevProps.todo.priority === nextProps.todo.priority &&
    prevProps.todo.details === nextProps.todo.details &&
    prevProps.todo.deadline === nextProps.todo.deadline
  );
});

export function AddTodoBar({ onAdd, onNotify }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [details, setDetails] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [emptyError, setEmptyError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setEmptyError(true);
      setTimeout(() => setEmptyError(false), EMPTY_ERROR_TIMEOUT_MS);
      return;
    }
    if (text.trim().length > 200) {
      if (onNotify) onNotify('Todo text must be 200 characters or fewer');
      return;
    }
    onAdd(text.trim(), priority, details.trim(), deadline);
    setText('');
    setDetails('');
    setDeadline('');
    setShowDetails(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-2 py-2 text-xs font-medium text-[var(--text-secondary)] shrink-0 w-auto"
        >
          <option value="High">High</option>
          <option value="Medium">Med</option>
          <option value="Low">Low</option>
        </Select>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a todo..."
          className={`flex-1 px-3 py-2 rounded-lg border bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 focus:border-[var(--accent-clay)] transition-all ${emptyError ? 'border-red-400 animate-shake' : 'border-[var(--border-subtle)]'}`}
        />
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={`px-2 py-2 rounded-lg border transition-all shrink-0 ${showDetails ? 'border-[var(--accent-clay)] text-[var(--accent-clay)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          aria-label="Toggle details"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Button type="submit" variant="gradient" className="px-3 shrink-0">
          Add
        </Button>
      </div>
      {showDetails && (
        <div className="space-y-2">
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add optional details..."
            rows={2}
          />
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="text-xs text-[var(--text-secondary)]"
            aria-label="Todo deadline"
          />
        </div>
      )}
    </form>
  );
}

export function DraggableTodoList({ todos, onToggle, onRemove, onEdit, onReorder, maxHeight, timeline }) {
  const parentRef = useRef(null);

  const handleItemSizeChange = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.style.overflowY = 'hidden';
      requestAnimationFrame(() => {
        if (parentRef.current) parentRef.current.style.overflowY = 'auto';
      });
    }
  }, []);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = Array.from(todos);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="todos">
        {(provided, snapshot) => (
          <div
            ref={(node) => {
              provided.innerRef(node);
              parentRef.current = node;
            }}
            {...provided.droppableProps}
            className={`transition-colors ${snapshot.isDraggingOver ? 'bg-[var(--accent-clay)]/5 rounded-lg' : ''}`}
            style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: maxHeight || 'none' }}
          >
            <div className="space-y-0.5">
              {todos.map((todo, index) => (
                <Draggable key={String(todo.id)} draggableId={String(todo.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-[var(--accent-clay)]/30 bg-[var(--bg-card)] rounded-lg' : ''}`}
                      style={{ ...provided.draggableProps.style, willChange: 'transform' }}
                    >
                      <TodoItem
                        todo={todo}
                        onToggle={onToggle}
                        onRemove={onRemove}
                        onEdit={onEdit}
                        dragHandleProps={provided.dragHandleProps}
                        onExpandChange={handleItemSizeChange}
                        timeline={timeline}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export function EditTodoModal({ todo, isOpen, onClose, onSave, onNotify }) {
  const [text, setText] = useState(todo?.text || '');
  const [priority, setPriority] = useState(todo?.priority || 'Medium');
  const [details, setDetails] = useState(todo?.details || '');
  const [deadline, setDeadline] = useState(todo?.deadline || '');
  const modalRef = useRef(null);

  useEffect(() => {
    if (todo) {
      setText(todo.text || '');
      setPriority(todo.priority || 'Medium');
      setDetails(todo.details || '');
      setDeadline(todo.deadline || '');
    }
  }, [todo]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (text.trim().length > 200) {
      if (onNotify) onNotify('Todo text must be 200 characters or fewer');
      return;
    }
    onSave({ ...todo, text: text.trim(), priority, details: details.trim(), deadline });
    onClose();
  };

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose} onKeyDown={handleKeyDown}>
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-md w-full p-6"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Todo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Todo</label>
            <Input type="text" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Priority</label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Details (optional)</label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Deadline (optional)</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
