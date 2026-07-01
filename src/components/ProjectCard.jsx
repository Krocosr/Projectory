'use client';
import { forwardRef, useState, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { formatLastWorked, formatDeadlineRemaining } from '@/lib/dateUtils';
import { ProgressBar } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';
import ContextMenu from '@/components/ContextMenu';

const ProjectCard = forwardRef(({ project, onClick, onUpdateProject, onDeleteProject, onDeletePermanent, onNotify, dragHandleProps, isDragging }, ref) => {
  const confirm = useConfirm();
  const [contextMenu, setContextMenu] = useState(null);
  const fallbackRef = useRef(null);
  const cardRef = ref || fallbackRef;
  const status = project.status;

  const openContextMenuAt = useCallback((x, y) => {
    setContextMenu({ x, y });
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
    const prevProject = project;
    onUpdateProject?.({ ...project, status: newStatus });
    onNotify?.(`Status changed to ${newStatus}`, 'success', {
      onUndo: () => {
        onUpdateProject?.(prevProject);
        onNotify?.('Status change undone', 'success');
      }
    });
  }, [onUpdateProject, project, onNotify]);

  const handleArchive = useCallback(() => {
    onDeleteProject?.(project.id);
  }, [onDeleteProject, project.id]);

  const handleUnarchive = useCallback(() => {
    onUpdateProject?.({ ...project, status: 'Active' });
  }, [onUpdateProject, project]);

  const handleDeletePermanent = useCallback(async () => {
    const ok = await confirm(`Permanently delete "${project.title}"? Undo available for 8 seconds.`);
    if (!ok) return;
    onDeletePermanent?.(project.id);
  }, [onDeletePermanent, project.id, project.title, confirm]);

  return (
    <>
      <motion.article
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        {...(isDragging ? {} : { whileHover: { y: -6, transition: { duration: 0.2, ease: 'easeOut' } } })}
        onClick={() => onClick?.(project)}
        onContextMenu={handleContextMenu}
        className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-clay)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-2xl"
        tabIndex={0}
        role="button"
        aria-label={`${project.title}, ${project.progress}% complete, ${project.todoCount} todos`}
        onKeyDown={handleKeyDown}
        data-project-id={project.id}
      >
        <div {...dragHandleProps} className="relative bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow duration-300 h-full flex flex-col min-h-[280px] max-h-[280px]">
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
              <span className="font-medium text-[var(--text-secondary)]">{project.progress === 100 ? 'done' : (formatDeadlineRemaining(project.deadline) || project.deadline)}</span>
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
});

ProjectCard.displayName = 'ProjectCard';

ProjectCard.propTypes = {
  project: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onUpdateProject: PropTypes.func,
  onDeleteProject: PropTypes.func,
  onDeletePermanent: PropTypes.func,
  onNotify: PropTypes.func,
  dragHandleProps: PropTypes.object,
  isDragging: PropTypes.bool,
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
    prevProps.project.deadline === nextProps.project.deadline &&
    prevProps.project.description === nextProps.project.description &&
    prevProps.isDragging === nextProps.isDragging
  );
});
