'use client';
import { useMemo, useEffect, useCallback, useRef, useDeferredValue, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';

import useProjectStore from '@/store/useProjectStore';

import DashboardHeader from '@/components/DashboardHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NewProjectButton } from '@/components/NewProjectButton';
import { NewProjectCard } from '@/components/NewProjectCard';
import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { CardSkeleton } from '@/components/CardSkeleton';
import { ProjectDetailSkeleton } from '@/components/ProjectDetailSkeleton';
import { SortableProjectCard } from '@/components/SortableProjectCard';
import ProjectCard from '@/components/ProjectCard';
import dynamic from 'next/dynamic';
import { launchItems as desktopLaunchItems } from '@/lib/desktop';

const ProjectDetailView = dynamic(() => import('@/components/ProjectDetailView'), { ssr: false });

import { useProjectPolling } from '@/hooks/useProjectPolling';
import { useProjectDragDrop } from '@/hooks/useProjectDragDrop';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import { seedProjects, SEED_KEY } from '@/app/data';
import { recoverFromApi, exportToFile, importFromFile, createAutoBackup } from '@/lib/storage';
import { migrateFromLocalStorage } from '@/lib/db';
import { getActiveTodos } from '@/lib/todoAggregator';
import { searchProjects } from '@/lib/search';
import { useConfirm } from '@/components/ConfirmModal';
import { useSessionManager } from '@/hooks/useSessionManager';
import { AUTO_BACKUP_INTERVAL_MS } from '@/lib/constants';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const projectParam = searchParams.get('project') || null;
  const router = useRouter();
  const confirm = useConfirm();

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
    updateProject: updateProjectAction,
    archiveProject,
    deletePermanent,
    cleanupArchive,
    restoreProjects,
    replaceAllProjects,
    mergeProjects,
    reorderProjects,
    addToast,
    runningSessions,
    setRunningSession,
  } = useProjectStore();

  const lastFocusedCardIdRef = useRef(null);
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    history.scrollRestoration = 'manual';
    initializeProjects();
  }, [initializeProjects]);

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

  useEffect(() => {
    const stored = localStorage.getItem('projectory_streamer_mode');
    if (stored === 'true') setIsStreamerMode(true);
  }, [setIsStreamerMode]);

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

  useEffect(() => {
    if (projects.length > 0) {
      createAutoBackup(projects);
    }
  }, [projects]);

  useEffect(() => {
    let cancelled = false;
    recoverFromApi().then((recovered) => {
      if (cancelled) return;
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

  useEffect(() => {
    migrateFromLocalStorage().then((migrated) => {
      if (!migrated && projects.length > 0) {
        useProjectStore.getState().setProjects(projects);
      }
    });
  }, []);

  useProjectPolling(ready, setProjects, selectedProject, setSelectedProject);

  useEffect(() => {
    const currentId = selectedProject ? String(selectedProject.id) : null;
    if (projectParam === currentId) return;

    if (projectParam) {
      const found = projects.find((p) => String(p.id) === projectParam);
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

  const aggregatedTodos = useMemo(() => getActiveTodos(projects, 'priority'), [projects]);

  useKeyboardShortcuts(!!selectedProject, () => setIsNewModalOpen(true));

  const { stopSession } = useSessionManager();

  const handleReorder = useCallback((reordered, shouldMerge) => {
    const isFiltered = reordered.length < projects.length;
    if (shouldMerge || isFiltered) {
      const reorderedIds = new Set(reordered.map((p) => p.id));
      const merged = [
        ...reordered,
        ...projects.filter((p) => !reorderedIds.has(p.id)),
      ];
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

  const { sensors, handleProjectDragStart, handleProjectDragEnd } =
    useProjectDragDrop(filteredProjects, projectSortBy, handleReorder, setProjectSortBy);

  const [activeDragId, setActiveDragId] = useState(null);

  const onDragStart = useCallback((event) => {
    handleProjectDragStart(event);
    setActiveDragId(event.active.id);
  }, [handleProjectDragStart]);

  const onDragEnd = useCallback((event) => {
    handleProjectDragEnd(event);
    setActiveDragId(null);
  }, [handleProjectDragEnd]);

  const activeDragProject = activeDragId ? filteredProjects.find((p) => String(p.id) === activeDragId) : null;

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

  const fabLaunch = selectedProject?.launchItems?.length > 0;
  const fabRunning = fabLaunch && runningSessions[selectedProject?.id]?.status === 'running';

  const handleFabLaunch = useCallback(async () => {
    const p = selectedProject;
    if (!p || !p.launchItems?.length) return;
    const result = await desktopLaunchItems(p.launchItems);
    if (!result?.success) {
      addToast(result?.error || 'Failed to launch apps', 'error');
      return;
    }
    const now = new Date().toISOString();
    const itemIds = p.launchItems.map((it) => it.id);
    
    const newLog = [...(p.activityLog || []), {
      itemId: `session-${Date.now()}`,
      itemName: `Session (${p.launchItems.length} apps)`,
      startTime: now,
      source: 'launch',
    }];
    const newTimeline = [...(p.timeline || []), { date: now, action: `Launched ${p.launchItems.length} app(s)` }];
    handleUpdateProject({ ...p, activityLog: newLog, timeline: newTimeline });
    setRunningSession(p.id, {
      status: 'running',
      launchItemIds: itemIds,
      startedAt: now,
      timerMode: p.timerConfig?.mode || 'countup',
    });
    addToast(`Started tracking ${p.launchItems.length} app(s)`);
  }, [selectedProject, handleUpdateProject, setRunningSession, addToast]);

  const handleFabStop = useCallback(async () => {
    const p = selectedProject;
    if (!p) return;
    const ok = await confirm('Stop the current session?');
    if (!ok) return;
    stopSession(p, handleUpdateProject, addToast);
  }, [selectedProject, confirm, stopSession, handleUpdateProject, addToast]);

  const fabMode = fabRunning ? 'stop' : fabLaunch ? 'launch' : 'add';

  return (
    <>
      <NewProjectButton
        mode={fabMode}
        onClick={() => setIsNewModalOpen(true)}
        onLaunch={handleFabLaunch}
        onStop={handleFabStop}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 min-h-screen">
        <AnimatePresence mode="wait">
          {selectedProject ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Suspense fallback={<ProjectDetailSkeleton />}>
                <ErrorBoundary
                  context="ProjectDetailView"
                  errorMessage="Failed to load project details. Try going back to the dashboard."
                  onReset={handleBack}
                >
                  <ProjectDetailView
                    project={selectedProject}
                    onBack={handleBack}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    onNotify={addToast}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={setIsDarkMode}
                    isStreamerMode={isStreamerMode}
                    onToggleStreamerMode={() => {
                      setIsStreamerMode(!isStreamerMode);
                      addToast(isStreamerMode ? 'Streamer mode off' : 'Streamer mode on - sensitive content hidden');
                    }}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    activeTodosCount={aggregatedTodos.length}
                  />
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          ) : projectParam && !ready ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              <ProjectDetailSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
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
                onToggleStreamerMode={() => {
                  setIsStreamerMode(!isStreamerMode);
                  addToast(isStreamerMode ? 'Streamer mode off' : 'Streamer mode on - sensitive content hidden');
                }}
              />

              {!ready ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 auto-rows-fr">
                  {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : (
                <div>
                  {filteredProjects.length > 0 ? (
                    <DndContext
                       onDragStart={onDragStart}
                       onDragEnd={onDragEnd}
                       sensors={sensors}
                       collisionDetection={closestCorners}
                     >
                       <SortableContext
                         items={filteredProjects.map((p) => String(p.id))}
                         strategy={rectSortingStrategy}
                       >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 auto-rows-fr">
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
                       <DragOverlay>
                         {activeDragProject ? (
                           <ProjectCard
                             project={activeDragProject}
                             isDragging={true}
                           />
                         ) : null}
                       </DragOverlay>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsContent />
    </Suspense>
  );
}
