'use client';
import { useState, useEffect, useLayoutEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_STYLES, Z_INDEX } from '@/lib/constants';
import { formatRelativeTime, formatDeadlineForDisplay } from '@/lib/dateUtils';

function findTodoCompletedAt(todoText, timeline) {
  if (!timeline || !todoText) return null;
  const escaped = todoText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^Marked "${escaped}" as done$`);
  const entry = [...timeline].reverse().find((e) => re.test(e.action));
  return entry?.date || null;
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
    if (contextMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let adjustedX = contextMenu.x;
      let adjustedY = contextMenu.y;

      if (adjustedX + rect.width > window.innerWidth - 8) {
        adjustedX = window.innerWidth - rect.width - 8;
      }
      if (adjustedY + rect.height > window.innerHeight - 8) {
        adjustedY = window.innerHeight - rect.height - 8;
      }
      if (adjustedX < 8) adjustedX = 8;
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
