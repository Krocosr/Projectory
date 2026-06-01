'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { DraggableTodoList, AddTodoBar, TodoItem } from './shared';
import { sortTodos, SORT_OPTIONS, groupTodosByDeadline } from '@/lib/todoAggregator';
import { getTemplates, saveTemplate, deleteTemplate, applyTemplateToProject, exportTemplates, importTemplates } from '@/lib/todoTemplates';
import { Input, Button } from '@/components/ui';

export default function TodosTab({ project, onAddTodo, onToggleTodo, onRemoveTodo, onEditTodo, onReorderTodos, onSortChange, onUpdateProject, onNotify }) {
  const [section, setSection] = useState('Active');
  const [showGrouped, setShowGrouped] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState({});
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const templatesRef = useRef(null);
  const fileInputRef = useRef(null);
  const sortBy = project.sortState || 'default';

  const { activeTodos, doneTodos } = useMemo(() => ({
    activeTodos: (project.todos || []).filter((t) => !t.done),
    doneTodos: (project.todos || []).filter((t) => t.done),
  }), [project.todos]);

  const displayedTodos = useMemo(() => {
    const todos = section === 'Active' ? activeTodos : doneTodos;
    const sorted = sortTodos(todos, sortBy);
    if (sortBy === 'default' && section === 'Done') {
      sorted.sort((a, b) => b.id - a.id);
    }
    return sorted;
  }, [section, activeTodos, doneTodos, sortBy]);

  const groupedTodos = useMemo(() => {
    if (section === 'Done') return null;
    return groupTodosByDeadline(activeTodos);
  }, [activeTodos, section]);

  const handleReorderActive = useCallback((reordered) => {
    const done = (project.todos || []).filter((t) => t.done);
    onReorderTodos([...reordered, ...done]);
  }, [project.todos, onReorderTodos]);

  const handleReorderDone = useCallback((reordered) => {
    const active = (project.todos || []).filter((t) => !t.done);
    onReorderTodos([...active, ...reordered]);
  }, [project.todos, onReorderTodos]);

  const openTemplates = useCallback(() => {
    setTemplates(getTemplates());
    setTemplatesOpen(true);
  }, []);

  const handleApplyTemplate = useCallback((name) => {
    const updated = applyTemplateToProject(project, name);
    if (updated !== project) {
      onUpdateProject?.(updated);
      onNotify?.('Template applied');
    }
    setTemplatesOpen(false);
  }, [project, onUpdateProject, onNotify]);

  const handleDeleteTemplate = useCallback((name) => {
    deleteTemplate(name);
    setTemplates(getTemplates());
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (!saveTemplateName.trim()) return;
    const activeTodos = (project.todos || []).filter((t) => !t.done);
    if (activeTodos.length === 0) {
      onNotify?.('No active todos to save');
      return;
    }
    saveTemplate(saveTemplateName.trim(), activeTodos);
    setSaveTemplateName('');
    setShowSaveTemplate(false);
    setTemplates(getTemplates());
    onNotify?.('Template saved');
  }, [saveTemplateName, project.todos, onNotify]);

  const handleExportTemplates = useCallback(() => {
    exportTemplates();
    setTemplatesOpen(false);
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = importTemplates(ev.target.result);
      if (result.success) {
        onNotify?.('Templates imported');
        setTemplates(getTemplates());
      } else {
        onNotify?.(result.error || 'Import failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onNotify]);

  useEffect(() => {
    if (!templatesOpen) return;
    const handleClick = (e) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target)) {
        setTemplatesOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setTemplatesOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [templatesOpen]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-6">
          {['Active', 'Done'].map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`text-xs font-medium uppercase tracking-wider pb-3 -mb-3 transition-colors ${
                section === s
                  ? 'text-[var(--accent-clay)] border-b-2 border-[var(--accent-clay)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s}
              <span className="ml-1.5 text-[10px] opacity-60">
                {s === 'Done' ? doneTodos.length : activeTodos.length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative" ref={templatesRef}>
            <button
              onClick={openTemplates}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/50 transition-colors"
              aria-label="Todo templates"
              title="Todo templates"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm0 8a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
              </svg>
            </button>
            <AnimatePresence>
              {templatesOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-modal)] border border-[var(--border-subtle)] py-2 overflow-hidden z-50"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Templates
                  </div>
                  {Object.keys(templates).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--text-muted)]">No saved templates</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {Object.entries(templates).map(([name, todos]) => (
                        <div key={name} className="flex items-center justify-between px-3 py-2 hover:bg-[var(--border-subtle)]/40 transition-colors group">
                          <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
                            {name}
                            <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">({todos.length})</span>
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleApplyTemplate(name)}
                              className="px-2 py-0.5 text-[10px] font-medium text-[var(--accent-clay)] hover:bg-[var(--accent-clay)]/10 rounded transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(name)}
                              className="p-0.5 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                              aria-label={`Delete template ${name}`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                    <button
                      onClick={() => { setTemplatesOpen(false); setShowSaveTemplate(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/40 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Save Active as Template...
                    </button>
                    <button
                      onClick={handleExportTemplates}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/40 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" />
                      </svg>
                      Export Templates
                    </button>
                    <button
                      onClick={handleImportClick}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]/40 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 4v12" />
                      </svg>
                      Import Templates
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6l-4 5h4l-5 7h6m3-16l4 5h-4l5 7h-6" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="text-[11px] px-1.5 py-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--accent-clay)]/30 appearance-none cursor-pointer hover:border-[var(--text-muted)] transition-colors"
            aria-label="Sort todos"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {showGrouped && section === 'Active' && groupedTodos ? (
        <div className="space-y-5">
          {[
            { key: 'overdue', label: 'Overdue', color: 'text-red-500', bg: 'bg-red-500/8' },
            { key: 'today', label: 'Today', color: 'text-amber-500', bg: 'bg-amber-500/8' },
            { key: 'thisWeek', label: 'This Week', color: 'text-blue-500', bg: 'bg-blue-500/8' },
            { key: 'nextMonth', label: 'Next Month', color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
            { key: 'noDeadline', label: 'No Deadline', color: 'text-[var(--text-muted)]', bg: 'bg-[var(--border-subtle)]/30' },
          ].map(({ key, label, color, bg }) => {
            const items = groupedTodos[key];
            if (!items || items.length === 0) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
                    {label}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${bg} ${color}`}>
                    {items.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {items.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggleTodo}
                      onRemove={onRemoveTodo}
                      onEdit={onEditTodo}
                      dragHandleProps={{}}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : displayedTodos.length > 0 ? (
        <DraggableTodoList
          todos={displayedTodos}
          onToggle={onToggleTodo}
          onRemove={onRemoveTodo}
          onEdit={onEditTodo}
          onReorder={section === 'Active' ? handleReorderActive : handleReorderDone}
        />
      ) : (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
          {section === 'Done' ? 'No completed todos' : 'No active todos'}
        </p>
      )}

      <div className="mt-4">
        <AddTodoBar onAdd={onAddTodo} />
      </div>

      <AnimatePresence>
        {showSaveTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowSaveTemplate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-sm w-full p-6"
            >
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">
                Save as Template
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Save all active todos as a reusable template.
              </p>
              <Input
                type="text"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Template name..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false); }}
              />
              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowSaveTemplate(false); setSaveTemplateName(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  onClick={handleSaveTemplate}
                  className="flex-1"
                  disabled={!saveTemplateName.trim()}
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

TodosTab.propTypes = {
  project: PropTypes.object.isRequired,
  onAddTodo: PropTypes.func.isRequired,
  onToggleTodo: PropTypes.func.isRequired,
  onRemoveTodo: PropTypes.func.isRequired,
  onEditTodo: PropTypes.func.isRequired,
  onReorderTodos: PropTypes.func.isRequired,
  onSortChange: PropTypes.func,
  onUpdateProject: PropTypes.func,
  onNotify: PropTypes.func,
};
