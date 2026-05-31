'use client';
import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import DashboardHeader from '@/components/DashboardHeader';
import NewProjectModal from '@/components/NewProjectModal';
import ToastContainer, { useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProjectCard from '@/components/ProjectCard';
import { seedProjects, SEED_KEY, createProject } from '@/app/data';
import { loadProjects, saveProjects, recoverFromApi, exportToFile, importFromFile, recalculateProject } from '@/lib/storage';
import { getActiveTodos } from '@/lib/todoAggregator';
import ActiveTodosSidebar from '@/components/ActiveTodosSidebar';
import { DEFAULT_PROJECT_SORT } from '@/lib/constants';
import { Button } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmModal';
import { createAutoBackup } from '@/lib/storage';
import { AUTO_BACKUP_INTERVAL_MS, STREAMER_KEY } from '@/lib/constants';

// Lazy load only the heavy ProjectDetailView component
// ProjectCard is small (~210 lines) and used frequently, so keep it eager for better UX
const ProjectDetailView = lazy(() => 
  import('@/components/ProjectDetailView').catch(err => {
    console.error('Failed to load ProjectDetailView:', err);
    return { default: () => <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-red-500/20 min-h-[400px] flex items-center justify-center text-sm text-red-500">Failed to load project details</div> };
  })
);

function NewProjectButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center text-white"
      style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
      aria-label="New Project"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </motion.button>
  );
}

function NewProjectCard({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-clay)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-2xl h-full"
    >
      <div className="relative h-full bg-[var(--bg-card)] rounded-2xl border-2 border-dashed border-[var(--border-subtle)] p-6 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 hover:border-[var(--accent-clay)]/40 hover:bg-[var(--accent-clay)]/[0.02]">
        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[var(--border-subtle)] flex items-center justify-center mb-3 transition-colors duration-300 group-hover:border-[var(--accent-clay)]/40">
          <svg className="w-5 h-5 text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--accent-clay)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--accent-clay)]">
          New Project
        </span>
      </div>
    </button>
  );
}

function EmptyPortfolio({ onNewProject }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-[var(--border-subtle)] flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">
        No projects yet
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
        Create your first project to start tracking your work.
      </p>
      <Button onClick={onNewProject} variant="gradient" className="px-5 py-2.5 rounded-xl text-sm">
        Create your first project
      </Button>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-subtle)] min-h-[220px] animate-pulse">
      <div className="h-4 bg-[var(--border-subtle)] rounded w-1/3 mb-4" />
      <div className="h-6 bg-[var(--border-subtle)] rounded w-2/3 mb-2" />
      <div className="h-4 bg-[var(--border-subtle)] rounded w-full mb-auto" />
      <div className="mt-8 h-1.5 bg-[var(--border-subtle)] rounded-full" />
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [ready, setReady] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();
  const lastFocusedCardIdRef = useRef(null);
  const pendingNavigateHomeRef = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const DARK_MODE_KEY = 'projectory_dark_mode';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isStreamerMode, setIsStreamerMode] = useState(false);
  const confirm = useConfirm();

  // Initialize dark mode from localStorage + system preference
  useEffect(() => {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) {
      const dark = stored === 'true';
      setIsDarkMode(dark);
      document.documentElement.classList.toggle('dark', dark);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  // Initialize streamer mode from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STREAMER_KEY);
    if (stored === 'true') setIsStreamerMode(true);
  }, []);

  // Periodic auto-backup
  useEffect(() => {
    const timer = setInterval(() => {
      if (projects.length > 0) {
        createAutoBackup(projects);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'BACKUP_NOW' });
        }
      }
    }, AUTO_BACKUP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [projects]);

  // Also backup on save
  useEffect(() => {
    if (projects.length > 0) {
      createAutoBackup(projects);
    }
  }, [projects]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsNewModalOpen(true);
      }
      if (e.key === '/' && !selectedProject) {
        e.preventDefault();
        const searchInput = document.querySelector('input[aria-label="Search projects"]');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedProject]);

  // Load from localStorage (instant), then check API for fresher data
  useEffect(() => {
    let cancelled = false;

    const stored = loadProjects();
    if (stored && stored.length > 0) {
      setProjects(stored);
      setReady(true);
    }

    // Always check API — ensures tool-written data (from OpenCode etc.) is picked up
    recoverFromApi().then((recovered) => {
      if (cancelled) return;
      if (recovered && recovered.length > 0) {
        const enriched = recovered.map(recalculateProject);
        setProjects(enriched);
        saveProjects(enriched);
        if (!stored || stored.length === 0) {
          addToast('Projects restored from server backup', 'info');
        }
      } else if (!stored || stored.length === 0) {
        if (!localStorage.getItem(SEED_KEY)) {
          localStorage.setItem(SEED_KEY, 'true');
          setProjects(seedProjects);
          const result = saveProjects(seedProjects);
          if (!result.success) {
            addToast(result.error || 'Failed to save initial data', 'error');
          }
        }
      }
      if (!stored || stored.length === 0) {
        setReady(true);
      }
    });

    return () => { cancelled = true; };
  }, [addToast]);

  // Poll for external changes (from OpenCode tools) so they appear live in the browser
  const lastPollMtimeRef = useRef(null);
  const pollIntervalRef = useRef(null);
  useEffect(() => {
    if (!ready) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/projects/poll');
        if (!res.ok) return;
        const { modified } = await res.json();
        if (modified === null) return;
        if (lastPollMtimeRef.current !== null && modified !== lastPollMtimeRef.current) {
          const dataRes = await fetch('/api/projects');
          if (!dataRes.ok) return;
          const { projects: serverProjects } = await dataRes.json();
          if (serverProjects && serverProjects.length > 0) {
            const enriched = serverProjects.map(recalculateProject);
            setProjects(enriched);
            saveProjects(enriched);
          }
        }
        lastPollMtimeRef.current = modified;
      } catch {
        // Server may not be running - silently ignore
      }
    };
    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [ready]);

  // Sync selected project when URL changes (handles browser back/forward)
  const projectParam = searchParams.get('project');
  useEffect(() => {
    if (!ready) return;
    if (projectParam) {
      pendingNavigateHomeRef.current = false;
      const found = projects.find((p) => String(p.id) === projectParam);
      if (found) {
        setSelectedProject(found);
      } else {
        setSelectedProject(null);
        router.push('/', { scroll: false });
      }
    } else {
      pendingNavigateHomeRef.current = false;
      setSelectedProject(null);
    }
  }, [projectParam, ready, projects, router]);

  const [projectSortBy, setProjectSortBy] = useState(DEFAULT_PROJECT_SORT);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter((p) => {
        const searchText = [
          p.title, p.description, p.goal,
          ...(p.todos || []).map((t) => t.text),
          p.notes,
          ...(p.links || []).map((l) => l.title),
        ].filter(Boolean).join(' ').toLowerCase();
        return searchText.includes(q);
      });
    }
    if (activeFilter === 'All') list = list.filter((p) => p.status !== 'Archived');
    else if (activeFilter === 'Ideas') list = list.filter((p) => p.status === 'Incubating' || p.status === 'Waiting');
    else if (activeFilter === 'Archived') list = list.filter((p) => p.status === 'Archived');
    else list = list.filter((p) => p.status === activeFilter);

    if (projectSortBy === 'unsorted') return list;
    return [...list].sort((a, b) => {
      switch (projectSortBy) {
        case 'changed':
          return new Date(b.lastWorked || 0) - new Date(a.lastWorked || 0);
        case 'created':
          return (b.id || 0) - (a.id || 0);
        case 'alpha':
          return (a.title || '').localeCompare(b.title || '');
        case 'alpha-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'deadline': {
          const da = a.deadline || '';
          const db = b.deadline || '';
          if (da === 'Ongoing') return 1;
          if (db === 'Ongoing') return -1;
          if (da === 'Completed') return 1;
          if (db === 'Completed') return -1;
          return da.localeCompare(db);
        }
        default:
          return 0;
      }
    });
  }, [projects, activeFilter, deferredSearch, projectSortBy]);

  const projectCounts = useMemo(() => {
    const counts = { total: projects.filter((p) => p.status !== 'Archived').length };
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    counts.statusCount = new Set(projects.map((p) => p.status)).size;
    return counts;
  }, [projects]);

  const [todoSortBy, setTodoSortBy] = useState('priority');
  const aggregatedTodos = useMemo(() => getActiveTodos(projects, todoSortBy), [projects, todoSortBy]);

  const handleNewProject = useCallback((form) => {
    const created = createProject(form);
    setProjects((current) => {
      const updated = [created, ...current];
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save project', 'error');
      }
      return updated;
    });
    addToast('Project created');
  }, [addToast]);

  const handleUpdateProject = useCallback((updated) => {
    const recalculated = recalculateProject(updated);
    setProjects((currentProjects) => {
      const updatedProjects = currentProjects.map((p) => (p.id === recalculated.id ? recalculated : p));
      const result = saveProjects(updatedProjects);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updatedProjects;
    });
    setSelectedProject((current) => (current?.id === recalculated.id ? recalculated : current));
  }, [addToast]);

  const handleCardClick = useCallback((project) => {
    if (!project) return;
    pendingNavigateHomeRef.current = false;
    lastFocusedCardIdRef.current = project.id;
    setSelectedProject(project);
    router.push(`/?project=${project.id}`, { scroll: false });
  }, [router]);

  const handleDeleteProject = useCallback((id) => {
    pendingNavigateHomeRef.current = true;
    setSelectedProject(null);
    setProjects((current) => {
      const updated = current.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: 'Archived',
          archivedAt: new Date().toISOString(),
          timeline: [...(p.timeline || []), { date: new Date().toISOString(), action: 'Project archived' }],
        };
      });
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updated;
    });
    router.push('/', { scroll: false });
    addToast('Project archived');
  }, [router, addToast, setSelectedProject]);

  const handleDeletePermanent = useCallback((id) => {
    pendingNavigateHomeRef.current = true;
    setSelectedProject(null);
    setProjects((current) => {
      const updated = current.filter((p) => p.id !== id);
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updated;
    });
    router.push('/', { scroll: false });
    addToast('Project deleted permanently');
  }, [router, addToast, setSelectedProject]);

  const handleCleanupArchive = useCallback(async () => {
    const archivedCount = projects.filter((p) => p.status === 'Archived').length;
    if (archivedCount === 0) {
      addToast('No archived projects to clean up', 'info');
      return;
    }
    const ok = await confirm(`Permanently delete all ${archivedCount} archived projects? This cannot be undone.`);
    if (!ok) return;
    setProjects((current) => {
      const updated = current.filter((p) => p.status !== 'Archived');
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updated;
    });
    addToast(`Deleted ${archivedCount} archived projects`);
  }, [projects, addToast, confirm]);

  const handleBack = useCallback(() => {
    pendingNavigateHomeRef.current = true;
    setSelectedProject(null);
    router.push('/', { scroll: false });
    
    // Restore focus to the last focused card after navigation
    const focusedId = lastFocusedCardIdRef.current;
    if (focusedId) {
      let attempts = 0;
      const tryFocus = () => {
        const cardElement = document.querySelector(`[data-project-id="${focusedId}"]`);
        if (cardElement) {
          cardElement.focus();
          return;
        }
        if (++attempts < 20) requestAnimationFrame(tryFocus);
      };
      requestAnimationFrame(tryFocus);
    }
  }, [setSelectedProject, router]);

  const handleExport = useCallback(() => {
    exportToFile(projects);
    addToast('Projects exported');
  }, [projects, addToast]);

  const handleImport = useCallback(async (file) => {
    const { projects: imported, error } = await importFromFile(file);
    if (error) {
      addToast(error, 'error');
      return;
    }
    const ok = await confirm(`Replace all projects with ${imported.length} projects from the backup?`);
    if (ok) {
      setProjects(imported);
      const result = saveProjects(imported);
      addToast(result.success ? `Imported ${imported.length} projects` : (result.error || 'Import failed'), result.success ? 'info' : 'error');
      return;
    }
    // Merge: skip duplicates by ID, add new ones
    setProjects((current) => {
      const existingIds = new Set(current.map((p) => p.id));
      const merged = [...current, ...imported.filter((p) => !existingIds.has(p.id))];
      const result = saveProjects(merged);
      if (!result.success) addToast(result.error || 'Merge failed', 'error');
      return merged;
    });
    addToast(`Merged ${imported.filter((p) => !projects.some((c) => c.id === p.id)).length} new projects`, 'info');
  }, [addToast, projects, confirm]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleTodoFromSidebar = useCallback((projectId, todoId) => {
    setProjects((current) => {
      const updated = current.map((p) => {
        if (p.id !== projectId) return p;
        const newTodos = (p.todos || []).map((t) =>
          t.id === todoId ? { ...t, done: !t.done } : t
        );
        return recalculateProject({ ...p, todos: newTodos });
      });
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updated;
    });
  }, [addToast]);

  const handleSidebarNavigate = useCallback((projectId) => {
    setIsSidebarOpen(false);
    const project = projects.find((p) => p.id === projectId);
    if (project) handleCardClick(project);
  }, [projects, handleCardClick]);

  const handleToggleStreamerMode = useCallback(() => {
    setIsStreamerMode((prev) => {
      const next = !prev;
      localStorage.setItem(STREAMER_KEY, String(next));
      addToast(next ? 'Streamer mode on - sensitive content hidden' : 'Streamer mode off');
      return next;
    });
  }, [addToast]);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(DARK_MODE_KEY, String(next));
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  const handleProjectDragEnd = useCallback((result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    setProjects((current) => {
      const reordered = [...current];
      const [removed] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, removed);
      const saveResult = saveProjects(reordered);
      if (!saveResult.success) {
        addToast(saveResult.error || 'Failed to save reorder', 'error');
      }
      return reordered;
    });
  }, [addToast]);

  return (
    <div className={`min-h-screen flex overflow-hidden${isStreamerMode ? ' streamer-mode' : ''}`}>
      <NewProjectButton onClick={() => setIsNewModalOpen(true)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex-1 min-w-0 transition-all duration-300 overflow-y-auto" style={{ marginRight: isSidebarOpen ? '380px' : '0' }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          {selectedProject ? (
            <motion.div
              key={`detail-${selectedProject.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <ErrorBoundary 
                context="ProjectDetailView"
                errorMessage="Failed to load project details. Try going back to the dashboard."
                onReset={handleBack}
              >
                <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[var(--accent-clay)] border-t-transparent animate-spin" /></div>}>
                  <ProjectDetailView
                    project={selectedProject}
                    onBack={handleBack}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    onNotify={addToast}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={handleToggleDarkMode}
                    isStreamerMode={isStreamerMode}
                    onToggleStreamerMode={handleToggleStreamerMode}
                    onToggleSidebar={handleToggleSidebar}
                    activeTodosCount={aggregatedTodos.length}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          ) : (<>
                <DashboardHeader
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  projectCounts={projectCounts}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onExport={handleExport}
                  onImport={handleImport}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={handleToggleDarkMode}
                  onToggleSidebar={handleToggleSidebar}
                  activeTodosCount={aggregatedTodos.length}
                  onCleanupArchive={handleCleanupArchive}
                  projectSortBy={projectSortBy}
                  onProjectSortChange={setProjectSortBy}
                  isStreamerMode={isStreamerMode}
                  onToggleStreamerMode={handleToggleStreamerMode}
                />

                {!ready ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <DragDropContext onDragEnd={handleProjectDragEnd}>
                    <Droppable droppableId="projects">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr transition-colors ${
                            snapshot.isDraggingOver ? 'bg-[var(--accent-clay)]/5 rounded-2xl p-2' : ''
                          }`}
                        >
                          {filteredProjects.map((project, index) => (
                            <Draggable
                              key={String(project.id)}
                              draggableId={String(project.id)}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={provided.draggableProps.style}
                                  className={`transition-shadow ${
                                    snapshot.isDragging ? 'shadow-2xl ring-2 ring-[var(--accent-clay)]/40 rounded-2xl scale-105' : ''
                                  }`}
                                >
                                  <ErrorBoundary 
                                    key={project.id}
                                    context={`ProjectCard-${project.id}`}
                                    errorMessage="Failed to load this project card."
                                  >
                                    <ProjectCard
                                      project={project}
                                      onClick={handleCardClick}
                                      onUpdateProject={handleUpdateProject}
                                      onDeleteProject={handleDeleteProject}
                                      onDeletePermanent={handleDeletePermanent}
                                    />
                                  </ErrorBoundary>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {activeFilter === 'All' && !searchQuery && (
                            <NewProjectCard onClick={() => setIsNewModalOpen(true)} />
                          )}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : projects.length === 0 ? (
                  <EmptyPortfolio onNewProject={() => setIsNewModalOpen(true)} />
                ) : (
                  <div className="text-center py-20">
                    <p className="text-sm text-[var(--text-muted)]">
                      {searchQuery ? 'No projects match your search' : `No ${activeFilter.toLowerCase()} projects`}
                    </p>
                    <button
                      onClick={() => { setActiveFilter('All'); setSearchQuery(''); }}
                      className="mt-2 text-sm text-[var(--accent-clay)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Show all projects
                    </button>
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      <ActiveTodosSidebar
        isOpen={isSidebarOpen}
        todos={aggregatedTodos}
        onToggleTodo={handleToggleTodoFromSidebar}
        onNavigateToProject={handleSidebarNavigate}
      />

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleNewProject}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DashboardContent />
    </Suspense>
  );
}
