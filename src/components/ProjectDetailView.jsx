'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '@/components/ConfirmModal';
import { createTodo, recalculateProject } from '@/lib/storage';
import { computeProgress, computeNextStepText, getFirstActiveTodo } from '@/components/detail/shared';
import PropTypes from 'prop-types';
import { STATUS_COLORS } from '@/lib/constants';
import { formatLastWorked } from '@/lib/dateUtils';
import { useRateLimit } from '@/hooks/useRateLimit';
import { ProgressBar } from '@/components/ui';
import { OverviewTab, TodosTab, WorkspaceTab, TimelineTab, SettingsTab, EditTodoModal, ScratchpadTab } from '@/components/detail';


const TABS = ['Overview', 'Todos', 'Workspace', 'Scratchpad', 'Timeline', 'Settings'];

export default function ProjectDetailView({ project, onBack, onUpdateProject, onDeleteProject, onNotify, isDarkMode, onToggleDarkMode, onToggleSidebar, activeTodosCount, isStreamerMode, onToggleStreamerMode }) {
  const confirm = useConfirm();
  const isToggleAllowed = useRateLimit(300);
  const [activeTab, setActiveTab] = useState('Overview');
  const [editingTodo, setEditingTodo] = useState(null);
  const [settingsHasUnsavedChanges, setSettingsHasUnsavedChanges] = useState(false);

  const projectRef = useRef(project);
  const onUpdateProjectRef = useRef(onUpdateProject);
  const onNotifyRef = useRef(onNotify);
  projectRef.current = project;
  onUpdateProjectRef.current = onUpdateProject;
  onNotifyRef.current = onNotify;

  const handleTabChange = useCallback(async (newTab) => {
    if (activeTab === 'Settings' && settingsHasUnsavedChanges) {
      const ok = await confirm('You have unsaved changes in Settings. Discard them?');
      if (!ok) return;
      setActiveTab(newTab);
      setSettingsHasUnsavedChanges(false);
    } else {
      setActiveTab(newTab);
    }
  }, [activeTab, settingsHasUnsavedChanges, confirm]);

  const handleAddTodo = useCallback((text, priority, details, deadline) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    const onNotify = onNotifyRef.current;
    const todo = createTodo(text, priority, details, deadline);
    const newTodos = [...(p.todos || []), todo];
    
    const updated = {
      ...recalculateProject({
        ...p,
        todos: newTodos,
        lastWorked: new Date().toISOString(),
        timeline: [...(p.timeline || []), { date: new Date().toISOString(), action: `Added todo: ${text}` }],
      }),
      nextStep: text,
    };
    onUpdate(updated);
    onNotify?.('Todo added');
  }, []);

  const handleEditTodo = useCallback((todo) => {
    setEditingTodo(todo);
  }, []);

  const handleSaveEditedTodo = useCallback((editedTodo) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    const onNotify = onNotifyRef.current;
    const newTodos = (p.todos || []).map((t) =>
      t.id === editedTodo.id ? editedTodo : t
    );
    const updated = recalculateProject({
      ...p,
      todos: newTodos,
      lastWorked: new Date().toISOString(),
      timeline: [...(p.timeline || []), { date: new Date().toISOString(), action: `Updated todo: ${editedTodo.text}` }],
    });
    onUpdate(updated);
    onNotify?.('Todo updated');
  }, []);

  const handleToggleTodo = useCallback((todoId) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    const onNotify = onNotifyRef.current;
    const newTodos = (p.todos || []).map((t) =>
      t.id === todoId ? { ...t, done: !t.done } : t
    );
    const toggled = newTodos.find((t) => t.id === todoId);
    
    const updated = recalculateProject({
      ...p,
      todos: newTodos,
      lastWorked: new Date().toISOString(),
      timeline: [...(p.timeline || []), {
        date: new Date().toISOString(),
        action: `Marked "${toggled?.text || 'unknown'}" as ${toggled?.done ? 'done' : 'pending'}`,
      }],
    });
    onUpdate(updated);
    onNotify?.(toggled?.done ? 'Todo completed' : 'Todo reopened');
  }, []);

  const handleRemoveTodo = useCallback((todoId) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    const onNotify = onNotifyRef.current;
    const removed = (p.todos || []).find((t) => t.id === todoId);
    const newTodos = (p.todos || []).filter((t) => t.id !== todoId);
    
    const updated = recalculateProject({
      ...p,
      todos: newTodos,
      lastWorked: new Date().toISOString(),
      timeline: [...(p.timeline || []), { date: new Date().toISOString(), action: `Removed todo: "${removed?.text}"` }],
    });
    onUpdate(updated);
    onNotify?.('Todo removed');
  }, []);

  const handleReorderTodos = useCallback((reorderedTodos) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    const updated = recalculateProject({
      ...p,
      todos: reorderedTodos,
    });
    onUpdate(updated);
  }, []);

  const handleDeleteProject = useCallback(async () => {
    const p = projectRef.current;
    const onDelete = onDeleteProject;
    const ok = await confirm(`Archive "${p.title}"? It will be moved to Archived status.`);
    if (!ok) return;
    onDelete?.(p.id);
  }, [onDeleteProject, confirm]);

  const handleSortChange = useCallback((sortBy) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    onUpdate({ ...p, sortState: sortBy });
  }, []);

  // Memoize progress calculation at component level
  const progress = useMemo(() => computeProgress(project.todos), [project.todos]);

  const headerInfo = useMemo(() => {
    const firstActive = getFirstActiveTodo(project.todos);
    return {
      currentFocusText: project.currentFocus || firstActive?.text || 'Not set',
      nextStepText: project.nextStep || computeNextStepText(project.todos) || 'No todos yet',
      activeTodoCount: (project.todos || []).filter((t) => !t.done).length,
    };
  }, [project.todos, project.currentFocus, project.nextStep]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Projects
        </motion.button>
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <motion.button
              onClick={onToggleSidebar}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-1.5 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
              aria-label="Toggle active todos sidebar"
              title="Toggle active todos sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {activeTodosCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-clay)] text-white text-[9px] font-bold flex items-center justify-center">
                  {activeTodosCount > 9 ? '9+' : activeTodosCount}
                </span>
              )}
            </motion.button>
          )}
          {onToggleStreamerMode && (
            <motion.button
              onClick={onToggleStreamerMode}
              title={isStreamerMode ? 'Disable streamer mode' : 'Enable streamer mode'}
              className={`p-1.5 rounded-lg transition-colors ${
                isStreamerMode
                  ? 'text-red-400 hover:text-red-300 bg-red-500/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              {isStreamerMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </motion.button>
          )}
          <motion.button
            onClick={() => { if (!isToggleAllowed()) return; onToggleDarkMode(); }}
            whileTap={{ scale: 0.9, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <motion.div
              key={isDarkMode ? 'dark' : 'light'}
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 180, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </motion.div>
          </motion.button>
          <motion.button
            onClick={handleDeleteProject}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-red-500 transition-colors"
            aria-label="Delete project"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </motion.button>
        </div>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[project.status] || '#7A706A' }} />
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]" data-streamer>
              {project.title}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {project.goal}
            </p>
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0 ml-4">
          worked {formatLastWorked(project.lastWorked)}
        </span>
      </div>

      <div className="p-5 mb-6 rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r from-[var(--accent-clay)]/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-clay)]/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              Resume Project
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3">
              <span className="text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Focus:</span>{' '}
                <span data-streamer>{headerInfo.currentFocusText}</span>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Next:</span>{' '}
                <span data-streamer>{headerInfo.nextStepText}</span>
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {headerInfo.activeTodoCount} todos remaining
              </span>
            </div>
            {/* Dynamic progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar value={progress} label={`Project progress: ${progress}%`} />
              </div>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 mb-6 border-b border-[var(--border-subtle)]" role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              role="tab"
              aria-selected={isActive}
              className={`relative px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[var(--accent-clay)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab}
              {isActive && (
                <motion.div
                  layoutId="detail-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-clay)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="popLayout">
        {activeTab === 'Overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <OverviewTab
              project={project}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onRemoveTodo={handleRemoveTodo}
              onEditTodo={handleEditTodo}
              onReorderTodos={handleReorderTodos}
            />
          </motion.div>
        )}
        {activeTab === 'Todos' && (
          <motion.div
            key="todos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <TodosTab
              project={project}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onRemoveTodo={handleRemoveTodo}
              onEditTodo={handleEditTodo}
              onReorderTodos={handleReorderTodos}
              onSortChange={handleSortChange}
            />
          </motion.div>
        )}
        {activeTab === 'Workspace' && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <WorkspaceTab
              project={project}
              onUpdateProject={onUpdateProject}
              onNotify={onNotify}
            />
          </motion.div>
        )}
        {activeTab === 'Scratchpad' && (
          <motion.div
            key="scratchpad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ScratchpadTab
              project={project}
              onUpdateProject={onUpdateProject}
              onNotify={onNotify}
            />
          </motion.div>
        )}
        {activeTab === 'Timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <TimelineTab project={project} />
          </motion.div>
        )}
        {activeTab === 'Settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SettingsTab
              project={project}
              onUpdateProject={onUpdateProject}
              onNotify={onNotify}
              onUnsavedChanges={setSettingsHasUnsavedChanges}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <EditTodoModal
        todo={editingTodo}
        isOpen={!!editingTodo}
        onClose={() => setEditingTodo(null)}
        onSave={handleSaveEditedTodo}
      />
    </div>
  );
}

ProjectDetailView.propTypes = {
  project: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  onUpdateProject: PropTypes.func.isRequired,
  onDeleteProject: PropTypes.func.isRequired,
  onNotify: PropTypes.func,
  isDarkMode: PropTypes.bool,
  onToggleDarkMode: PropTypes.func,
  isStreamerMode: PropTypes.bool,
  onToggleStreamerMode: PropTypes.func,
  onToggleSidebar: PropTypes.func,
  activeTodosCount: PropTypes.number,
};
