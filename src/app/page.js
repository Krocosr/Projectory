'use client';
import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

// Store
import useProjectStore from '@/store/useProjectStore';

// Components
import DashboardHeader from '@/components/DashboardHeader';
import NewProjectModal from '@/components/NewProjectModal';
import ToastContainer, { useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import ActiveTodosSidebar from '@/components/ActiveTodosSidebar';
import { NewProjectButton } from '@/components/NewProjectButton';
import { NewProjectCard } from '@/components/NewProjectCard';
import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { CardSkeleton } from '@/components/CardSkeleton';
import { SortableProjectCard } from '@/components/SortableProjectCard';
import { ProjectDetailSkeleton } from '@/components/ProjectDetailSkeleton';

// Hooks
import { useProjectPolling } from '@/hooks/useProjectPolling';
import { useProjectDragDrop } from '@/hooks/useProjectDragDrop';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Utils
import { seedProjects, SEED_KEY } from '@/app/data';
import { recoverFromApi, exportToFile, importFromFile, createAutoBackup } from '@/lib/storage';
import { migrateFromLocalStorage } from '@/lib/db';
import { getActiveTodos } from '@/lib/todoAggregator';
import { searchProjects } from '@/lib/search';
import { useConfirm } from '@/components/ConfirmModal';
import { AUTO_BACKUP_INTERVAL_MS } from '@/lib/constants';

const projectDetailViewImport = import('@/components/ProjectDetailView').catch(err => {
  console.error('Failed to load ProjectDetailView:', err);
  return { default: () => <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-red-500/20 min-h-[400px] flex items-center justify-center text-sm text-red-500">Failed to load project details</div> };
});
const ProjectDetailView = lazy(() => projectDetailViewImport);

if (typeof window !== 'undefined') {
  const _sp = new URLSearchParams(window.location.search);
  if (_sp.get('project')) {
    projectDetailViewImport.catch(() => {});
  }
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const confirm = useConfirm();
  const { toasts, addToast, dismissToast } = useToast();
  
  // Zustand store
  const {
    projects,
    selectedProject,
    ready,
    activeFilter,
    searchQuery,
    projectSortBy,
    isDarkMode,
    isStreamerMode,
    isSidebarOpen,
    isNewModalOpen,
    setProjects,
    setSelectedProject,
    setReady,
    setActiveFilter,
    setSearchQuery,
    setProjectSortBy,
    setIsDarkMode,
    setIsStreamerMode,
    setIsSidebarOpen,
    setIsNewModalOpen,
    initializeProjects,
    createProject: createProjectAction,
    updateProject: updateProjectAction,
    archiveProject,
    deletePermanent,
    cleanupArchive,
    restoreProjects,
    replaceAllProjects,
    mergeProjects,
    toggleTodoInProject,
    reorderProjects,
  } = useProjectStore();

  const lastFocusedCardIdRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const deferredSearch = useDeferredValue(searchQuery);

  // Initialize on mount
  useEffect(() => {
    history.scrollRestoration = 'manual';
    initializeProjects();
  }, [initializeProjects]);

  // Initialize dark mode
  useEffect(() => {
    const stored = localStorage.getItem('projectory_dark_mode');
    if (stored !== null) {
      const dark = stored === 'true';
      setIsDarkMode(dark);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, [setIsDarkMode]);

  // Initialize streamer mode
  useEffect(() => {
    const stored = localStorage.getItem('projectory_streamer_mode');
    if (stored === 'true') setIsStreamerMode(true);
  }, [setIsStreamerMode]);

  // Periodic auto-backup
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (projects.length > 0) {
        createAutoBackup(projects);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'BACKUP_NOW' });
        }
      }
    }, AUTO_BACKUP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [projects]);

  // Backup on save
  useEffect(() => {
    if (projects.length > 0) {
      createAutoBackup(projects);
    }
  }, [projects]);

  // Recover from API
  useEffect(() => {
    let cancelled = false;

    recoverFromApi().then((recovered) => {
      if (cancelled) return;

      // Check actual store state after initializeProjects has run
      const hasLocal = useProjectStore.getState().projects.length > 0;

      if (recovered && recovered.length > 0) {
        setProjects(recovered);

        const urlParam = new URLSearchParams(window.location.search).get('project');
        if (urlParam) {
          const found = recovered.find((p) => String(p.id) === urlParam);
          if (found) setSelectedProject(found);
        }

        if (!hasLocal) {
          addToast('Projects restored from server backup', 'info');
        }
      } else if (!hasLocal) {
        if (!localStorage.getItem(SEED_KEY)) {
          localStorage.setItem(SEED_KEY, 'true');
          const result = replaceAllProjects(seedProjects);
          if (!result.success) {
            addToast(result.error || 'Failed to save initial data', 'error');
          }
        }
      }
      if (!hasLocal) {
        setReady(true);
      }
    });

    return () => { cancelled = true; };
  }, [addToast, setProjects, setSelectedProject, setReady, replaceAllProjects]);

  // Sync IndexedDB
  useEffect(() => {
    migrateFromLocalStorage().then((migrated) => {
      if (!migrated && projects.length > 0) {
        useProjectStore.getState().setProjects(projects);
      }
    });
  }, []);

  // Polling hook
  useProjectPolling(ready, setProjects, selectedProject, setSelectedProject);

  // Sync selected project with URL
  const projectParam = searchParams.get('project');
  useEffect(() => {
    const actualProjectId = new URLSearchParams(window.location.search).get('project') || null;
    const currentId = selectedProject ? String(selectedProject.id) : null;

    if (actualProjectId === currentId) return;

    if (actualProjectId) {
      const found = projects.find((p) => String(p.id) === actualProjectId);
      if (found) {
        setSelectedProject(found);
      } else if (ready) {
        setSelectedProject(null);
        router.push('/', { scroll: false });
      }
    } else {
      setSelectedProject(null);
    }
  }, [projectParam, ready, projects, router, selectedProject, setSelectedProject]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let list = searchProjects(projects, deferredSearch);
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

  // Keyboard shortcuts hook
  useKeyboardShortcuts(!!selectedProject, () => setIsNewModalOpen(true));

  // Drag-and-drop hook
  const handleReorder = useCallback((reordered, shouldMerge) => {
    if (shouldMerge) {
      const reorderedIds = new Set(reordered.map((p) => p.id));
      const rest = projects.filter((p) => !reorderedIds.has(p.id));
      const merged = [...reordered, ...rest];
      const result = reorderProjects(merged);
      if (!result.success) {
        addToast(result.error || 'Failed to save reorder', 'error');
      }
    } else {
      const result = reorderProjects(reordered);
      if (!result.success) {
        addToast(result.error || 'Failed to save reorder', 'error');
      }
    }
  }, [projects, reorderProjects, addToast]);

  const { sensors, isProjectDragging, handleProjectDragStart, handleProjectDragEnd } = 
    useProjectDragDrop(filteredProjects, projectSortBy, handleReorder, setProjectSortBy, addToast);

  // Reset scroll when navigating
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedProject?.id]);

  // Event handlers
  const handleNewProject = useCallback((form) => {
    const result = createProjectAction(form);
    if (result.success) {
      addToast('Project created');
    } else {
      addToast(result.error || 'Failed to save project', 'error');
    }
  }, [createProjectAction, addToast]);

  const handleUpdateProject = useCallback((updated) => {
    const result = updateProjectAction(updated);
    if (!result.success) {
      addToast(result.error || 'Failed to save changes', 'error');
    }
  }, [updateProjectAction, addToast]);

  const handleCardClick = useCallback((project) => {
    if (!project) return;
    lastFocusedCardIdRef.current = project.id;
    router.push(`/?project=${project.id}`, { scroll: false });
  }, [router]);

  const handleDeleteProject = useCallback((id) => {
    const result = archiveProject(id);
    if (result.success) {
      router.push('/', { scroll: false });
      addToast(`"${result.projectToArchive?.title || 'Project'}" archived`, 'success', {
        onUndo: () => {
          restoreProjects(projects);
          addToast('Project restored');
        }
      });
    } else {
      addToast(result.error || 'Failed to archive project', 'error');
    }
  }, [archiveProject, router, addToast, projects, restoreProjects]);

  const handleDeletePermanent = useCallback((id) => {
    const snapshot = [...projects];
    const result = deletePermanent(id);
    if (result.success) {
      router.push('/', { scroll: false });
      addToast(`"${result.deletedProject?.title || 'Project'}" permanently deleted`, 'error', {
        onUndo: () => {
          restoreProjects(snapshot);
          addToast('Project restored');
        }
      });
    } else {
      addToast(result.error || 'Failed to delete project', 'error');
    }
  }, [deletePermanent, router, addToast, projects, restoreProjects]);

  const handleCleanupArchive = useCallback(async () => {
    const result = cleanupArchive();
    if (!result.success) {
      addToast(result.error || 'No archived projects to clean up', 'info');
      return;
    }
    const ok = await confirm(`Permanently delete all ${result.count} archived projects? This cannot be undone.`);
    if (!ok) {
      restoreProjects(result.snapshot);
      return;
    }
    addToast(`Deleted ${result.count} archived projects`, 'success', {
      onUndo: () => {
        restoreProjects(result.snapshot);
        addToast(`Restored ${result.count} archived projects`);
      }
    });
  }, [cleanupArchive, addToast, confirm, restoreProjects]);

  const handleBack = useCallback(() => {
    setSelectedProject(null);
    router.replace('/', { scroll: false });
    
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
      const result = replaceAllProjects(imported);
      addToast(result.success ? `Imported ${imported.length} projects` : (result.error || 'Import failed'), result.success ? 'info' : 'error');
      return;
    }
    const result = mergeProjects(imported);
    addToast(result.success ? `Merged ${result.addedCount} new projects` : (result.error || 'Merge failed'), result.success ? 'info' : 'error');
  }, [addToast, confirm, replaceAllProjects, mergeProjects]);

  const handleToggleTodoFromSidebar = useCallback((projectId, todoId) => {
    const result = toggleTodoInProject(projectId, todoId);
    if (!result.success) {
      addToast(result.error || 'Failed to save changes', 'error');
    }
  }, [toggleTodoInProject, addToast]);

  const handleSidebarReorder = useCallback((reorderedTodos) => {
    setProjects((current) => {
      const orderMap = {};
      reorderedTodos.forEach((todo, index) => {
        if (!orderMap[todo.projectId]) {
          orderMap[todo.projectId] = [];
        }
        orderMap[todo.projectId].push({ id: todo.id, order: index });
      });
      const updated = current.map((project) => {
        if (!orderMap[project.id]) return project;
        const projectOrders = orderMap[project.id];
        const todoOrderMap = new Map(projectOrders.map(o => [o.id, o.order]));
        const newTodos = (project.todos || []).map((todo) => {
          if (todoOrderMap.has(todo.id)) {
            return { ...todo, order: todoOrderMap.get(todo.id) };
          }
          return todo;
        });
        return { ...project, todos: newTodos };
      });
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save todo reorder', 'error');
      }
      return updated;
    });
  }, [addToast]);

  const handleSidebarNavigate = useCallback((projectId) => {
    setIsSidebarOpen(false);
    const project = projects.find((p) => p.id === projectId);
    if (project) handleCardClick(project);
  }, [projects, handleCardClick, setIsSidebarOpen]);

  const handleToggleStreamerMode = useCallback(() => {
    setIsStreamerMode(!isStreamerMode);
    addToast(isStreamerMode ? 'Streamer mode off' : 'Streamer mode on - sensitive content hidden');
  }, [isStreamerMode, setIsStreamerMode, addToast]);

  return (
    <div className={`min-h-screen flex overflow-hidden${isStreamerMode ? ' streamer-mode' : ''}`}>
      <NewProjectButton onClick={() => setIsNewModalOpen(true)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div 
        ref={scrollContainerRef} 
        className={`flex-1 min-w-0 transition-all duration-300 relative ${isProjectDragging ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`} 
        style={{ marginRight: isSidebarOpen ? '380px' : '0' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-10">
          {selectedProject ? (
            <div key={`detail-${selectedProject.id}`}>
              <ErrorBoundary
                context="ProjectDetailView"
                errorMessage="Failed to load project details. Try going back to the dashboard."
                onReset={handleBack}
              >
                <Suspense fallback={<ProjectDetailSkeleton />}>
                  <ProjectDetailView
                    project={selectedProject}
                    onBack={handleBack}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    onNotify={addToast}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={setIsDarkMode}
                    isStreamerMode={isStreamerMode}
                    onToggleStreamerMode={handleToggleStreamerMode}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    activeTodosCount={aggregatedTodos.length}
                    scrollContainerRef={scrollContainerRef}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          ) : (
            <div key="dashboard">
              <DashboardHeader
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                projectCounts={projectCounts}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onExport={handleExport}
                onImport={handleImport}
                isDarkMode={isDarkMode}
                onToggleDarkMode={setIsDarkMode}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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
              ) : (
                <div>
                  {filteredProjects.length > 0 ? (
                    <DndContext 
                      onDragStart={handleProjectDragStart} 
                      onDragEnd={handleProjectDragEnd} 
                      sensors={sensors} 
                      collisionDetection={closestCorners}
                    >
                      <SortableContext 
                        items={filteredProjects.map((p) => String(p.id))} 
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
                          {filteredProjects.map((project) => (
                            <SortableProjectCard
                              key={String(project.id)}
                              project={project}
                              onClick={handleCardClick}
                              onUpdateProject={handleUpdateProject}
                              onDeleteProject={handleDeleteProject}
                              onDeletePermanent={handleDeletePermanent}
                              onNotify={addToast}
                            />
                          ))}
                          {activeFilter === 'All' && !searchQuery && (
                            <NewProjectCard onClick={() => setIsNewModalOpen(true)} />
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ActiveTodosSidebar
        isOpen={isSidebarOpen}
        todos={aggregatedTodos}
        onToggleTodo={handleToggleTodoFromSidebar}
        onNavigateToProject={handleSidebarNavigate}
        onReorderTodos={handleSidebarReorder}
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-primary)]" />}>
      <DashboardContent />
    </Suspense>
  );
}
