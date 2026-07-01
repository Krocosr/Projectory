'use client';
import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import useProjectStore from '@/store/useProjectStore';
import { exportToFile, importFromFile } from '@/lib/storage';
import { getActiveTodos, SORT_OPTIONS, sortTodos } from '@/lib/todoAggregator';
import { useConfirm } from '@/components/ConfirmModal';
import { PRIORITY_STYLES } from '@/lib/constants';
import { Input } from '@/components/ui';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'insights', label: 'Insights' },
  { id: 'about', label: 'About' },
];

function TodoItem({ todo, onToggle, onNavigate }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(todo.projectId, todo.id); }}
        className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-[var(--text-muted)] flex items-center justify-center"
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
        <p className="text-sm text-[var(--text-primary)] truncate">{todo.text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] max-w-28 truncate">
            {todo.projectTitle}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.Medium}`}>
            {todo.priority}
          </span>
        </div>
      </button>
    </div>
  );
}

export default function MobileNavDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();

  const projects = useProjectStore((s) => s.projects);
  const isDarkMode = useProjectStore((s) => s.isDarkMode);
  const isStreamerMode = useProjectStore((s) => s.isStreamerMode);
  const setIsDarkMode = useProjectStore((s) => s.setIsDarkMode);
  const setIsStreamerMode = useProjectStore((s) => s.setIsStreamerMode);
  const setShowSettings = useProjectStore((s) => s.setShowSettings);
  const toggleTodoInProject = useProjectStore((s) => s.toggleTodoInProject);
  const replaceAllProjects = useProjectStore((s) => s.replaceAllProjects);
  const mergeProjects = useProjectStore((s) => s.mergeProjects);
  const addToast = useProjectStore((s) => s.addToast);

  const [showTodos, setShowTodos] = useState(false);
  const [todoSort, setTodoSort] = useState('priority');
  const [todoSearch, setTodoSearch] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const fileInputRef = useRef(null);

  const isActive = (id) => {
    if (id === 'dashboard') return pathname === '/dashboard';
    if (id === 'projects') return pathname === '/' || pathname.startsWith('/?project=');
    return false;
  };

  const handleNav = useCallback((id) => {
    if (id === 'dashboard') { router.push('/dashboard', { scroll: false }); onClose(); return; }
    if (id === 'projects') { router.push('/', { scroll: false }); onClose(); return; }
    if (id === 'insights') { addToast('Insights — coming soon', 'info'); return; }
    if (id === 'about') { setShowAbout(true); return; }
  }, [router, onClose, addToast]);

  const activeTodos = useMemo(() => getActiveTodos(projects, 'priority'), [projects]);
  const filteredTodos = useMemo(() => {
    if (!todoSearch.trim()) return activeTodos;
    const q = todoSearch.toLowerCase();
    return activeTodos.filter((t) => t.text.toLowerCase().includes(q) || t.projectTitle.toLowerCase().includes(q));
  }, [activeTodos, todoSearch]);
  const sortedTodos = useMemo(() => sortTodos(filteredTodos, todoSort), [filteredTodos, todoSort]);

  const handleToggle = useCallback((projectId, todoId) => {
    toggleTodoInProject(projectId, todoId);
  }, [toggleTodoInProject]);

  const handleNavigate = useCallback((projectId) => {
    onClose();
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      router.push(`/?project=${projectId}`, { scroll: false });
    }
  }, [projects, router, onClose]);

  const handleExport = useCallback(() => {
    exportToFile(projects);
    addToast('Projects exported');
  }, [projects, addToast]);

  const handleImport = useCallback(async (file) => {
    const { projects: imported, error } = await importFromFile(file);
    if (error) { addToast(error, 'error'); return; }
    const ok = await confirm(`Replace all projects with ${imported.length} projects from the backup?`);
    if (ok) {
      const result = replaceAllProjects(imported);
      addToast(result.success ? `Imported ${imported.length} projects` : (result.error || 'Import failed'), result.success ? 'info' : 'error');
      return;
    }
    const result = mergeProjects(imported);
    addToast(result.success ? `Merged ${result.addedCount} new projects` : (result.error || 'Merge failed'), result.success ? 'info' : 'error');
  }, [addToast, confirm, replaceAllProjects, mergeProjects]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.div
              key="drawer"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed top-14 left-0 right-0 bottom-0 z-40 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] overflow-y-auto lg:hidden"
              role="dialog"
              aria-label="Navigation menu"
            >
              <div className="p-4 space-y-4">
                <nav className="space-y-0.5">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                        isActive(item.id)
                          ? 'bg-[var(--accent-clay)]/12 text-[var(--accent-clay)] font-semibold'
                          : 'text-[var(--text-primary)] hover:bg-[var(--border-subtle)] font-medium'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="border-t border-[var(--border-subtle)]" />

                <div>
                  <button
                    onClick={() => setShowTodos(!showTodos)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                  >
                    <span>Active Todos ({activeTodos.length})</span>
                    <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showTodos ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {showTodos && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-2 space-y-2">
                          <Input
                            type="text"
                            value={todoSearch}
                            onChange={(e) => setTodoSearch(e.target.value)}
                            placeholder="Search todos..."
                            aria-label="Search todos"
                          />
                          <select
                            value={todoSort}
                            onChange={(e) => setTodoSort(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] outline-none appearance-none cursor-pointer"
                            aria-label="Sort todos"
                          >
                            {SORT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="max-h-64 overflow-y-auto">
                            {sortedTodos.length === 0 ? (
                              <p className="text-xs text-[var(--text-muted)] text-center py-4">No active todos</p>
                            ) : (
                              sortedTodos.map((todo) => (
                                <TodoItem key={`${todo.projectId}-${todo.id}`} todo={todo} onToggle={handleToggle} onNavigate={handleNavigate} />
                              ))
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="border-t border-[var(--border-subtle)]" />

                <div className="px-4 space-y-1">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Utilities</p>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export backup
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Import backup
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImport(f); e.target.value = ''; } }} className="hidden" aria-hidden="true" />
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors font-medium"
                  >
                    <span className="flex items-center gap-3">
                      {isDarkMode ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                      Dark mode
                    </span>
                    <div className={`w-9 h-5 rounded-full transition-colors ${isDarkMode ? 'bg-[var(--accent-clay)]' : 'bg-[var(--border-subtle)]'} relative`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isDarkMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  <button
                    onClick={() => setIsStreamerMode(!isStreamerMode)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm transition-colors font-medium ${
                      isStreamerMode ? 'text-red-400 bg-red-500/10' : 'text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
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
                      Streamer mode
                    </span>
                    <div className={`w-9 h-5 rounded-full transition-colors ${isStreamerMode ? 'bg-red-400' : 'bg-[var(--border-subtle)]'} relative`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isStreamerMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </div>

                <div className="border-t border-[var(--border-subtle)]" />

                <button
                  onClick={() => { setShowSettings(true); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  </svg>
                  Settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="About Projectory"
          >
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowAbout(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">About Projectory</h2>
                <button
                  onClick={() => setShowAbout(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Version</p>
                  <p className="text-sm text-[var(--text-primary)] mt-1 font-medium">0.11.4</p>
                </div>
                <div className="space-y-3">
                  <a href="https://github.com/Krocosr/Projectory" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    GitHub Repository
                  </a>
                  <a href="https://github.com/Krocosr/Projectory/issues" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    Report an Issue
                  </a>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Next.js', 'React', 'Tailwind CSS', 'Zustand', 'Dexie.js', 'Framer Motion', '@dnd-kit', '@hello-pangea/dnd'].map((tech) => (
                      <span key={tech} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{tech}</span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] space-y-1 leading-relaxed">
                  <p>Built with care for local-first project management.</p>
                  <p>Licensed under the MIT License.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
