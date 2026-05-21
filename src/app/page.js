'use client';
import { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '@/components/DashboardHeader';
import NewProjectModal from '@/components/NewProjectModal';
import ToastContainer, { useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProjectCard from '@/components/ProjectCard';
import { seedProjects, SEED_KEY, createProject } from '@/app/data';
import { loadProjects, saveProjects } from '@/lib/storage';

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
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [ready, setReady] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  // Load from localStorage once
  useEffect(() => {
    const stored = loadProjects();
    if (stored && stored.length > 0) {
      setProjects(stored);
    } else if (!localStorage.getItem(SEED_KEY)) {
      localStorage.setItem(SEED_KEY, 'true');
      setProjects(seedProjects);
      const result = saveProjects(seedProjects);
      if (!result.success) {
        addToast(result.error || 'Failed to save initial data', 'error');
      }
    }
    setReady(true);
  }, [addToast]);

  // Sync selected project when URL changes (handles browser back/forward)
  useEffect(() => {
    if (!ready) return;
    const projectId = searchParams.get('project');
    if (projectId) {
      // Support both string IDs (seed-*) and numeric IDs (user projects)
      const found = projects.find((p) => String(p.id) === projectId);
      if (found) {
        setSelectedProject(found);
      } else {
        // Project ID in URL but not found — go to dashboard
        setSelectedProject(null);
        router.push('/', { scroll: false });
      }
    } else {
      // No ?project= param — always go to dashboard
      setSelectedProject(null);
    }
  }, [searchParams, ready, router, projects]);

  const persistProjects = useCallback((updated) => {
    setProjects(updated);
    const result = saveProjects(updated);
    if (!result.success) {
      addToast(result.error || 'Failed to save changes', 'error');
    }
  }, [addToast]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.goal?.toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'All') return list;
    if (activeFilter === 'Ideas') return list.filter((p) => p.status === 'Incubating' || p.status === 'Waiting');
    if (activeFilter === 'Archived') return list.filter((p) => p.status === 'Archived');
    return list.filter((p) => p.status === activeFilter);
  }, [projects, activeFilter, searchQuery]);

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

  const handleCardClick = (project) => {
    if (!project) return;
    // Store the focused card ID before navigating
    setLastFocusedCardId(project.id);
    setSelectedProject(project);
    router.push(`/?project=${project.id}`, { scroll: false });
  };

  const handleDeleteProject = useCallback((id) => {
    setProjects((current) => {
      const updated = current.filter((p) => p.id !== id);
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updated;
    });
    // handleBack navigates to / which clears selectedProject via searchParams effect
    router.push('/', { scroll: false });
    addToast('Project deleted', 'error');
  }, [router, addToast]);

  const handleBack = useCallback(() => {
    // Just push to /; the searchParams effect will clear selectedProject
    router.push('/', { scroll: false });
    
    // Restore focus to the last focused card after navigation
    if (lastFocusedCardId) {
      setTimeout(() => {
        const cardElement = document.querySelector(`[data-project-id="${lastFocusedCardId}"]`);
        if (cardElement) {
          cardElement.focus();
        }
      }, 100);
    }
  }, [router, lastFocusedCardId]);

  return (
    <div className="min-h-screen">
      <NewProjectButton onClick={() => setIsNewModalOpen(true)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {selectedProject ? (
            <ErrorBoundary 
              context="ProjectDetailView"
              errorMessage="Failed to load project details. Try going back to the dashboard."
              onReset={handleBack}
            >
              <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[var(--accent-clay)] border-t-transparent animate-spin" /></div>}>
                <ProjectDetailView
                  key={`detail-${selectedProject.id}`}
                  project={selectedProject}
                  onBack={handleBack}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  onNotify={addToast}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <motion.div
              key="grid"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DashboardHeader
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                projectCounts={projectCounts}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
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
            </motion.div>
          )}
        </AnimatePresence>
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
