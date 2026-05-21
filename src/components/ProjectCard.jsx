'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { STATUSES, STATUS_STYLES, Z_INDEX } from '@/lib/constants';
import { formatDeadlineForDisplay } from '@/lib/dateUtils';

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase ${style.bg} text-white`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

function ContextMenu({ x, y, project, onEdit, onChangeStatus, onDelete, onClose }) {
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);

  useEffect(() => {
    // Focus first menu item when opened
    if (firstItemRef.current) {
      firstItemRef.current.focus();
    }

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust if near right/bottom edge
  const style = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: Z_INDEX.CONTEXT_MENU,
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        style={style}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.12 }}
        className="w-52 bg-white rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] overflow-hidden py-1"
        role="menu"
        aria-label="Project options"
      >
        <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{project.title}</p>
        </div>

        <button
          ref={firstItemRef}
          onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors text-left"
          role="menuitem"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Open & Edit
        </button>

        <div className="border-t border-[var(--border-subtle)] my-1" />
        <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Change Status
        </p>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { onChangeStatus(s); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left ${project.status === s ? 'text-[var(--accent-clay)] font-semibold bg-[var(--accent-clay)]/5' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
            role="menuitem"
            aria-current={project.status === s ? 'true' : undefined}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_STYLES[s]?.bg.replace('bg-[', '').replace(']', '') || '#aaa' }} />
            {s}
            {project.status === s && (
              <svg className="w-3.5 h-3.5 ml-auto text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}

        <div className="border-t border-[var(--border-subtle)] my-1" />
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
          role="menuitem"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Project
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ProjectCard({ project, onClick, onUpdateProject, onDeleteProject }) {
  const [contextMenu, setContextMenu] = useState(null);
  const status = project.status;

  const handleContextMenu = (e) => {
    e.preventDefault();
    // Clamp to viewport
    const menuW = 208;
    const menuH = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setContextMenu({ x, y });
  };

  const handleChangeStatus = (newStatus) => {
    onUpdateProject?.({ ...project, status: newStatus });
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${project.title}"? This cannot be undone.`)) {
      onDeleteProject?.(project.id);
    }
  };

  return (
    <>
      <motion.article
        ref={cardRef}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
        onClick={() => onClick?.(project)}
        onContextMenu={handleContextMenu}
        className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-clay)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-2xl"
        tabIndex={0}
        role="button"
        aria-label={`${project.title}, ${project.progress}% complete, ${project.todoCount} todos`}
        onKeyDown={handleKeyDown}
        data-project-id={project.id}
      >
        <div className="relative bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow duration-300 h-full flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <StatusBadge status={status} />
            <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0 ml-3" title={project.lastWorked}>
              {project.lastWorked}
            </span>
          </div>

          <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] leading-tight mb-2">
            {project.title}
          </h3>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-auto">
            <span className="text-[var(--text-muted)]">Next:</span>{' '}
            {project.nextStep}
          </p>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] uppercase tracking-wider font-medium">Progress</span>
              <span className="font-semibold text-[var(--text-secondary)] tabular-nums">{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${project.progress}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--accent-clay), var(--accent-clay-light))',
                }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">{project.todoCount}</span> todos
            </span>
            <span className="text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">{project.progress === 100 ? 'done' : project.deadline}</span>
            </span>
          </div>
        </div>
      </motion.article>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          project={project}
          onEdit={() => onClick?.(project)}
          onChangeStatus={handleChangeStatus}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
