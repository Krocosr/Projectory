'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTodo, recalculateProject } from '@/lib/storage';
import { computeProgress, computeNextStepText, getFirstActiveTodo } from '@/components/detail/shared';
import PropTypes from 'prop-types';
import { STATUS_COLORS } from '@/lib/constants';
import { formatLastWorked } from '@/lib/dateUtils';
import { OverviewTab, TodosTab, WorkspaceTab, TimelineTab, SettingsTab, EditTodoModal } from '@/components/detail';
import ScratchpadTab from '@/components/detail/ScratchpadTab';


const TABS = ['Overview', 'Todos', 'Workspace', 'Scratchpad', 'Timeline', 'Settings'];

export default function ProjectDetailView({ project, onBack, onUpdateProject, onDeleteProject, onNotify, isDarkMode, onToggleDarkMode }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [editingTodo, setEditingTodo] = useState(null);
  const [settingsHasUnsavedChanges, setSettingsHasUnsavedChanges] = useState(false);

  const projectRef = useRef(project);
  const onUpdateProjectRef = useRef(onUpdateProject);
  const onNotifyRef = useRef(onNotify);
  projectRef.current = project;
  onUpdateProjectRef.current = onUpdateProject;
  onNotifyRef.current = onNotify;

  const handleTabChange = useCallback((newTab) => {
    if (activeTab === 'Settings' && settingsHasUnsavedChanges) {
      if (window.confirm('You have unsaved changes in Settings. Discard them?')) {
        setActiveTab(newTab);
        setSettingsHasUnsavedChanges(false);
      }
    } else {
      setActiveTab(newTab);
    }
  }, [activeTab, settingsHasUnsavedChanges]);

  const handleAddTodo = useCallback((text, priority, details) => {
    const p = projectRef.current;
    const onUpdate = onUpdateProjectRef.current;
    const onNotify = onNotifyRef.current;
    const todo = createTodo(text, priority, details);
    const newTodos = [...(p.todos || []), todo];
    
    const updated = recalculateProject({
      ...p,
      todos: newTodos,
      lastWorked: new Date().toISOString(),
      timeline: [...(p.timeline || []), { date: new Date().toISOString(), action: `Added todo: ${text}` }],
    });
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
    const updated = {
      ...p,
      todos: reorderedTodos,
    };
    onUpdate(updated);
  }, []);

  const handleDeleteProject = useCallback(() => {
    const p = projectRef.current;
    const onDelete = onDeleteProject;
    if (window.confirm(`Archive "${p.title}"? It will be moved to Archived status.`)) {
      onDelete?.(p.id);
    }
  }, [onDeleteProject]);

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
          <motion.button
            onClick={onToggleDarkMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
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
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
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
                {headerInfo.currentFocusText}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Next:</span>{' '}
                {headerInfo.nextStepText}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {headerInfo.activeTodoCount} todos remaining
              </span>
            </div>
            {/* Dynamic progress */}
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Project progress: ${progress}%`}
              >
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--accent-clay), var(--accent-clay-light))' }}
                />
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
};
