'use client';
import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardHeader from '@/components/DashboardHeader';
import NewProjectModal from '@/components/NewProjectModal';
import ToastContainer, { useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProjectCard from '@/components/ProjectCard';
import { seedProjects, SEED_KEY, createProject } from '@/app/data';
import { loadProjects, saveProjects, recoverFromApi, exportToFile, importFromFile } from '@/lib/storage';

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
      <button
        onClick={onNewProject}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
      >
        Create your first project
      </button>
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

  // Load from localStorage once, with API recovery fallback
  useEffect(() => {
    const stored = loadProjects();
    if (stored && stored.length > 0) {
      setProjects(stored);
      setReady(true);
      return;
    }

    // localStorage is empty — try to recover from server-side API backup
    recoverFromApi().then((recovered) => {
      if (recovered && recovered.length > 0) {
        setProjects(recovered);
        addToast('Projects restored from server backup', 'info');
      } else if (!localStorage.getItem(SEED_KEY)) {
        localStorage.setItem(SEED_KEY, 'true');
        setProjects(seedProjects);
        const result = saveProjects(seedProjects);
        if (!result.success) {
          addToast(result.error || 'Failed to save initial data', 'error');
        }
      }
      setReady(true);
    });
  }, [addToast]);

  // Sync selected project when URL changes (handles browser back/forward)
  const projectParam = searchParams.get('project');
  useEffect(() => {
    if (!ready) return;
    console.log('[nav] searchParams effect | ready:', ready, '| projectParam:', projectParam, '| projects.length:', projects.length, '| pendingNavigateHome:', pendingNavigateHomeRef.current);
    if (projectParam) {
      pendingNavigateHomeRef.current = false;
      const found = projects.find((p) => String(p.id) === projectParam);
      if (found) {
        setSelectedProject(found);
      } else {
        setSelectedProject(null);
        router.push('/', { scroll: false });
      }
    } else if (pendingNavigateHomeRef.current) {
      pendingNavigateHomeRef.current = false;
      setSelectedProject(null);
    }
  }, [projectParam, ready, projects, router]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter((p) => {
        const searchText = [p.title, p.description, p.goal].filter(Boolean).join(' ').toLowerCase();
        return searchText.includes(q);
      });
    }
    if (activeFilter === 'All') return list;
    if (activeFilter === 'Ideas') return list.filter((p) => p.status === 'Incubating' || p.status === 'Waiting');
    if (activeFilter === 'Archived') return list.filter((p) => p.status === 'Archived');
    return list.filter((p) => p.status === activeFilter);
  }, [projects, activeFilter, deferredSearch]);

  const projectCounts = useMemo(() => {
    const counts = { total: projects.length };
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    counts.statusCount = new Set(projects.map((p) => p.status)).size;
    return counts;
  }, [projects]);

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
    setProjects((currentProjects) => {
      const updatedProjects = currentProjects.map((p) => (p.id === updated.id ? updated : p));
      const result = saveProjects(updatedProjects);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updatedProjects;
    });
    setSelectedProject((current) => (current?.id === updated.id ? updated : current));
  }, [addToast]);

  const handleCardClick = useCallback((project) => {
    if (!project) return;
    console.log('[nav] handleCardClick | id:', project.id, '| title:', project.title);
    pendingNavigateHomeRef.current = false;
    lastFocusedCardIdRef.current = project.id;
    setSelectedProject(project);
    router.push(`/?project=${project.id}`, { scroll: false });
  }, [router]);

  const handleDeleteProject = useCallback((id) => {
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
    addToast('Project deleted', 'error');
  }, [router, addToast, setSelectedProject]);

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
    if (!window.confirm(`Replace all projects with ${imported.length} projects from the backup?`)) return;
    setProjects(imported);
    const result = saveProjects(imported);
    addToast(result.success ? `Imported ${imported.length} projects` : (result.error || 'Import failed'), result.success ? 'info' : 'error');
  }, [addToast]);

  console.log('[render] DashboardContent | ready:', ready, '| selectedProject:', selectedProject?.id || null, '| projects:', projects.length);

  return (
    <div className="min-h-screen">
      <NewProjectButton onClick={() => setIsNewModalOpen(true)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
              />

              {!ready ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
                  {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
                  {filteredProjects.map((project) => (
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
                      />
                    </ErrorBoundary>
                  ))}
                  {activeFilter === 'All' && !searchQuery && (
                    <NewProjectCard onClick={() => setIsNewModalOpen(true)} />
                  )}
                </div>
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
