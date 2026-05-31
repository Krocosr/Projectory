'use client';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { STATUSES, STATUS_STYLES, STATUS_COLORS, Z_INDEX } from '@/lib/constants';
import { formatDeadlineForDisplay, formatLastWorked } from '@/lib/dateUtils';
import { ProgressBar } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmModal';

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase ${style.bg} text-white`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

function ContextMenu({ x, y, project, onEdit, onChangeStatus, onDelete, onUnarchive, onDeletePermanent, onClose }) {
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

  const isArchived = project.status === 'Archived';

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        style={style}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.12 }}
        className="w-52 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-modal)] overflow-hidden py-1"
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

        {!isArchived && (
          <>
            <div className="border-t border-[var(--border-subtle)] my-1" />
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Change Status
            </p>
            {STATUSES.filter(s => s !== 'Archived').map((s) => (
              <button
                key={s}
                onClick={() => { onChangeStatus(s); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left ${project.status === s ? 'text-[var(--accent-clay)] font-semibold bg-[var(--accent-clay)]/5' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                role="menuitem"
                aria-current={project.status === s ? 'true' : undefined}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] || '#7A706A' }} />
                {s}
                {project.status === s && (
                  <svg className="w-3.5 h-3.5 ml-auto text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </>
        )}

        <div className="border-t border-[var(--border-subtle)] my-1" />
        
        {isArchived ? (
          <>
            <button
              onClick={() => { onUnarchive(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors text-left"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
              </svg>
              Unarchive Project
            </button>
            <button
              onClick={() => { onDeletePermanent(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
              role="menuitem"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete Permanently
            </button>
          </>
        ) : (
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors text-left"
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Archive Project
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ProjectCard({ project, onClick, onUpdateProject, onDeleteProject, onDeletePermanent }) {
  const confirm = useConfirm();
  const [contextMenu, setContextMenu] = useState(null);
  const cardRef = useRef(null);
  const status = project.status;

  const openContextMenuAt = useCallback((x, y) => {
    const menuW = 208;
    const menuH = 280;
    let cx = x;
    let cy = y;
    if (cx + menuW > window.innerWidth - 8) {
      cx = window.innerWidth - menuW - 8;
    }
    if (cy + menuH > window.innerHeight - 8) {
      cy = window.innerHeight - menuH - 8;
    }
    if (cx < 4) cx = 4;
    if (cy < 4) cy = 4;
    setContextMenu({ x: cx, y: cy });
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    openContextMenuAt(e.clientX, e.clientY);
  }, [openContextMenuAt]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(project);
    }
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) {
        openContextMenuAt(rect.right - 100, rect.top + 40);
      }
    }
  }, [onClick, project, openContextMenuAt]);

  const handleMoreOptions = useCallback((e) => {
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      openContextMenuAt(rect.right - 100, rect.top + 40);
    }
  }, [openContextMenuAt]);

  const handleChangeStatus = useCallback((newStatus) => {
    onUpdateProject?.({ ...project, status: newStatus });
  }, [onUpdateProject, project]);

  const handleArchive = useCallback(() => {
    onDeleteProject?.(project.id);
  }, [onDeleteProject, project.id]);

  const handleUnarchive = useCallback(() => {
    onUpdateProject?.({ ...project, status: 'Active' });
  }, [onUpdateProject, project]);

  const handleDeletePermanent = useCallback(async () => {
    const ok = await confirm(`Permanently delete "${project.title}"? This cannot be undone.`);
    if (!ok) return;
    onDeletePermanent?.(project.id);
  }, [onDeletePermanent, project.id, project.title, confirm]);

  return (
    <>
      <motion.article
        ref={cardRef}
        layout
        layoutId={String(project.id)}
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
        <div className="relative bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow duration-300 h-full flex flex-col min-h-[280px] max-h-[280px]">
          <div className="flex items-start justify-between mb-3">
            <StatusBadge status={status} />
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <span className="text-xs text-[var(--text-muted)] tabular-nums" title={formatLastWorked(project.lastWorked)}>
                {formatLastWorked(project.lastWorked)}
              </span>
              <button
                onClick={handleMoreOptions}
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-all"
                aria-label="More options"
                aria-haspopup="menu"
                tabIndex={-1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
            </div>
          </div>

          <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] leading-tight mb-2 line-clamp-2" data-streamer>
            {project.title}
          </h3>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-auto line-clamp-2">
            <span className="text-[var(--text-muted)]">Focus:</span>{' '}
            <span data-streamer>{project.currentFocus}</span>
          </p>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] uppercase tracking-wider font-medium">Progress</span>
              <span className="font-semibold text-[var(--text-secondary)] tabular-nums">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} label={`Project progress: ${project.progress}%`} />
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
          onDelete={handleArchive}
          onUnarchive={handleUnarchive}
          onDeletePermanent={handleDeletePermanent}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

ProjectCard.propTypes = {
  project: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onUpdateProject: PropTypes.func,
  onDeleteProject: PropTypes.func,
  onDeletePermanent: PropTypes.func,
};

export default memo(ProjectCard, (prevProps, nextProps) => {
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.progress === nextProps.project.progress &&
    prevProps.project.status === nextProps.project.status &&
    prevProps.project.lastWorked === nextProps.project.lastWorked &&
    prevProps.project.title === nextProps.project.title &&
    prevProps.project.currentFocus === nextProps.project.currentFocus &&
    prevProps.project.todoCount === nextProps.project.todoCount &&
    prevProps.project.deadline === nextProps.project.deadline
  );
});
