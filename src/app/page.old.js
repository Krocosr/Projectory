'use client';
import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import DashboardHeader from '@/components/DashboardHeader';
import NewProjectModal from '@/components/NewProjectModal';
import ToastContainer, { useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProjectCard from '@/components/ProjectCard';
import { seedProjects, SEED_KEY, createProject } from '@/app/data';
import { loadProjects, saveProjects, recoverFromApi, exportToFile, importFromFile, recalculateProject } from '@/lib/storage';
import { migrateFromLocalStorage } from '@/lib/db';
import { getActiveTodos } from '@/lib/todoAggregator';
import ActiveTodosSidebar from '@/components/ActiveTodosSidebar';
import { DEFAULT_PROJECT_SORT } from '@/lib/constants';
import { Button } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmModal';
import { createAutoBackup } from '@/lib/storage';
import { AUTO_BACKUP_INTERVAL_MS, POLL_INTERVAL_MS, STREAMER_KEY, PROJECT_SORT_KEY } from '@/lib/constants';

// Lazy load only the heavy ProjectDetailView component
// ProjectCard is small (~210 lines) and used frequently, so keep it eager for better UX
const projectDetailViewImport = import('@/components/ProjectDetailView').catch(err => {
  console.error('Failed to load ProjectDetailView:', err);
  return { default: () => <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-red-500/20 min-h-[400px] flex items-center justify-center text-sm text-red-500">Failed to load project details</div> };
});
const ProjectDetailView = lazy(() => projectDetailViewImport);

// If the URL already has a ?project= param, kick off the chunk download immediately
// so Suspense resolves before or during first paint (no spinner flash)
if (typeof window !== 'undefined') {
  const _sp = new URLSearchParams(window.location.search);
  if (_sp.get('project')) {
    projectDetailViewImport.catch(() => {});
  }
}

function NewProjectButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center text-white"
      style={{ background: 'linear-gradient(135deg, var(--accent-clay), #B8603A)' }}
      aria-label="New Project"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
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

function SortableProjectCard({ project, onClick, onUpdateProject, onDeleteProject, onDeletePermanent, onNotify }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(project.id) });
  const nodeRef = useRef(null);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition,
  } : { transition };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        nodeRef.current = node;
      }}
      style={style}
      {...attributes}
      className={`transition-shadow z-10 ${isDragging ? 'shadow-2xl z-50' : ''}`}
    >
      <ErrorBoundary
        key={project.id}
        context={`ProjectCard-${project.id}`}
        errorMessage="Failed to load this project card."
      >
        <ProjectCard
          project={project}
          onClick={onClick}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
          onDeletePermanent={onDeletePermanent}
          onNotify={onNotify}
          dragHandleProps={listeners}
          isDragging={isDragging}
        />
      </ErrorBoundary>
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

function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-4 bg-[var(--border-subtle)] rounded w-32" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--border-subtle)] rounded-lg" />
          <div className="w-8 h-8 bg-[var(--border-subtle)] rounded-lg" />
          <div className="w-8 h-8 bg-[var(--border-subtle)] rounded-lg" />
        </div>
      </div>

      {/* Title and status */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[var(--border-subtle)]" />
          <div>
            <div className="h-8 bg-[var(--border-subtle)] rounded w-64 mb-2" />
            <div className="h-4 bg-[var(--border-subtle)] rounded w-48" />
          </div>
        </div>
      </div>

      {/* Resume card */}
      <div className="p-5 mb-6 rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r from-[var(--accent-clay)]/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--border-subtle)]" />
          <div className="flex-1">
            <div className="h-5 bg-[var(--border-subtle)] rounded w-32 mb-3" />
            <div className="h-3 bg-[var(--border-subtle)] rounded w-full mb-2" />
            <div className="h-3 bg-[var(--border-subtle)] rounded w-3/4 mb-3" />
            <div className="h-2 bg-[var(--border-subtle)] rounded-full w-full" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border-subtle)]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 bg-[var(--border-subtle)] rounded-t w-20" />
        ))}
      </div>

      {/* Content area */}
      <div className="space-y-4">
        <div className="h-4 bg-[var(--border-subtle)] rounded w-full" />
        <div className="h-4 bg-[var(--border-subtle)] rounded w-5/6" />
        <div className="h-4 bg-[var(--border-subtle)] rounded w-4/6" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Eagerly initialize projects + selectedProject from localStorage so the correct
  // view renders on the very first paint — no dashboard flash when opening a project URL.
  const [projects, setProjects] = useState(() => {
    if (typeof window === 'undefined') return [];
    return loadProjects() || [];
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(() => {
    if (typeof window === 'undefined') return null;
    const param = new URLSearchParams(window.location.search).get('project');
    if (!param) return null;
    const stored = loadProjects();
    if (!stored) return null;
    return stored.find((p) => String(p.id) === param) || null;
  });
  const [ready, setReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    // If localStorage has data we can show the UI immediately
    const stored = loadProjects();
    return !!(stored && stored.length > 0);
  });
  const { toasts, addToast, dismissToast } = useToast();
  const lastFocusedCardIdRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const DARK_MODE_KEY = 'projectory_dark_mode';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isStreamerMode, setIsStreamerMode] = useState(false);
  const confirm = useConfirm();

  // Initialize dark mode from localStorage + system preference
  useEffect(() => {
    history.scrollRestoration = 'manual';
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

  // Periodic auto-backup (pauses when tab is backgrounded)
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

  // State is eagerly initialized from localStorage in useState() above.
  // Just check API for fresher / server-written data.
  useEffect(() => {
    let cancelled = false;
    const hadLocalData = projects.length > 0;

    // Always check API — ensures tool-written data (from OpenCode etc.) is picked up
    recoverFromApi().then((recovered) => {
      if (cancelled) return;
      if (recovered && recovered.length > 0) {
        const enriched = recovered.map(recalculateProject);
        setProjects(enriched);
        saveProjects(enriched);

        // If URL has a project param, pre-select it atomically to avoid flash
        const urlParam = new URLSearchParams(window.location.search).get('project');
        if (urlParam) {
          const found = enriched.find((p) => String(p.id) === urlParam);
          if (found) setSelectedProject(found);
        }

        if (!hadLocalData) {
          addToast('Projects restored from server backup', 'info');
        }
      } else if (!hadLocalData) {
        if (!localStorage.getItem(SEED_KEY)) {
          localStorage.setItem(SEED_KEY, 'true');
          setProjects(seedProjects);
          const result = saveProjects(seedProjects);
          if (!result.success) {
            addToast(result.error || 'Failed to save initial data', 'error');
          }
        }
      }
      if (!hadLocalData) {
        setReady(true);
      }
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast]);

  // Sync IndexedDB: migrate from localStorage on first launch, then keep in sync
  useEffect(() => {
    migrateFromLocalStorage().then((migrated) => {
      if (!migrated && projects.length > 0) {
        saveProjects(projects);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for external changes (from OpenCode tools) so they appear live in the browser
  const lastPollMtimeRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const selectedProjectRef = useRef(selectedProject);
  selectedProjectRef.current = selectedProject;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  useEffect(() => {
    if (!ready) return;
    const poll = async () => {
      if (document.hidden) return;
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
            // Sync selectedProject via ref to avoid stale closure
            const currentSelected = selectedProjectRef.current;
            if (currentSelected && projectsRef.current.some(p => p.id === currentSelected.id)) {
              const updated = enriched.find(p => p.id === currentSelected.id);
              if (updated) setSelectedProject(updated);
            }
          }
        }
        lastPollMtimeRef.current = modified;
      } catch {
        // Server may not be running - silently ignore
      }
    };
    const handleVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', handleVisibility);
    poll();
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [ready]);

  // Sync selected project when URL changes (handles browser back/forward + project data updates)
  // selectedProject is eagerly initialized from localStorage in useState, so no early-return on !ready.
  // Always reads window.location.search directly — useSearchParams may be stale after popstate.
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
  }, [projectParam, ready, projects, router]);

  const [projectSortBy, setProjectSortBy] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(PROJECT_SORT_KEY) || DEFAULT_PROJECT_SORT;
    }
    return DEFAULT_PROJECT_SORT;
  });

  useEffect(() => {
    localStorage.setItem(PROJECT_SORT_KEY, projectSortBy);
  }, [projectSortBy]);

  const filteredProjectsRef = useRef([]);
  const sortByRef = useRef(projectSortBy);

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

  filteredProjectsRef.current = filteredProjects;
  sortByRef.current = projectSortBy;

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
    lastFocusedCardIdRef.current = project.id;
    router.push(`/?project=${project.id}`, { scroll: false });
  }, [router]);

  const handleDeleteProject = useCallback((id) => {
    const snapshot = [...projects];
    const projectToArchive = projects.find((p) => p.id === id);
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
    addToast(`"${projectToArchive?.title || 'Project'}" archived`, 'success', {
      onUndo: () => {
        setProjects(snapshot);
        saveProjects(snapshot);
      }
    });
  }, [router, addToast, setSelectedProject, projects]);

  const handleDeletePermanent = useCallback((id) => {
    const snapshot = [...projects];
    const deletedProject = projects.find((p) => p.id === id);
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
    addToast(`"${deletedProject?.title || 'Project'}" permanently deleted`, 'error', {
      onUndo: () => {
        setProjects(snapshot);
        saveProjects(snapshot);
        addToast('Project restored');
      }
    });
  }, [router, addToast, setSelectedProject, projects]);

  const handleCleanupArchive = useCallback(async () => {
    const archivedCount = projects.filter((p) => p.status === 'Archived').length;
    if (archivedCount === 0) {
      addToast('No archived projects to clean up', 'info');
      return;
    }
    const ok = await confirm(`Permanently delete all ${archivedCount} archived projects? This cannot be undone.`);
    if (!ok) return;
    const snapshot = [...projects];
    setProjects((current) => {
      const updated = current.filter((p) => p.status !== 'Archived');
      const result = saveProjects(updated);
      if (!result.success) {
        addToast(result.error || 'Failed to save changes', 'error');
      }
      return updated;
    });
    addToast(`Deleted ${archivedCount} archived projects`, 'success', {
      onUndo: () => {
        setProjects(snapshot);
        saveProjects(snapshot);
        addToast(`Restored ${archivedCount} archived projects`);
      }
    });
  }, [projects, addToast, confirm]);

  const handleBack = useCallback(() => {
    setSelectedProject(null);
    router.replace('/', { scroll: false });
    
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
      const now = new Date().toISOString();
      const updated = current.map((p) => {
        if (p.id !== projectId) return p;
        const newTodos = (p.todos || []).map((t) =>
          t.id === todoId ? { ...t, done: !t.done, completedAt: t.done ? null : now } : t
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

  const [isProjectDragging, setIsProjectDragging] = useState(false);
  const scrollContainerRef = useRef(null);

  // Reset scroll when navigating between dashboard and project detail
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedProject?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleProjectDragStart = useCallback(() => {
    setIsProjectDragging(true);
  }, []);

  const handleProjectDragEnd = useCallback((event) => {
    setIsProjectDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentSortBy = sortByRef.current;
    const displayed = filteredProjectsRef.current;

    if (currentSortBy !== 'unsorted') {
      // Came from a sorted view — save the dragged order as new unsorted baseline
      const oldIndex = displayed.findIndex((p) => String(p.id) === active.id);
      const newIndex = displayed.findIndex((p) => String(p.id) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(displayed, oldIndex, newIndex);
      setProjectSortBy('unsorted');
      setProjects((current) => {
        const reorderedIds = new Set(reordered.map((p) => p.id));
        const rest = current.filter((p) => !reorderedIds.has(p.id));
        const merged = [...reordered, ...rest];
        const saveResult = saveProjects(merged);
        if (!saveResult.success) {
          addToast(saveResult.error || 'Failed to save reorder', 'error');
        }
        return merged;
      });
    } else {
      // Already unsorted — move within current array
      setProjects((current) => {
        const oldIndex = current.findIndex((p) => String(p.id) === active.id);
        const newIndex = current.findIndex((p) => String(p.id) === over.id);
        if (oldIndex === -1 || newIndex === -1) return current;
        const reordered = arrayMove(current, oldIndex, newIndex);
        const saveResult = saveProjects(reordered);
        if (!saveResult.success) {
          addToast(saveResult.error || 'Failed to save reorder', 'error');
        }
        return reordered;
      });
    }
  }, [addToast]);

  return (
    <div className={`min-h-screen flex overflow-hidden${isStreamerMode ? ' streamer-mode' : ''}`}>
      <NewProjectButton onClick={() => setIsNewModalOpen(true)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div ref={scrollContainerRef} className={`flex-1 min-w-0 transition-all duration-300 relative ${isProjectDragging ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`} style={{ marginRight: isSidebarOpen ? '380px' : '0' }}>
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
                    onToggleDarkMode={handleToggleDarkMode}
                    isStreamerMode={isStreamerMode}
                    onToggleStreamerMode={handleToggleStreamerMode}
                    onToggleSidebar={handleToggleSidebar}
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
              ) : (
                <div>
                  {filteredProjects.length > 0 ? (
                    <DndContext onDragStart={handleProjectDragStart} onDragEnd={handleProjectDragEnd} sensors={sensors} collisionDetection={closestCorners}>
                      <SortableContext items={filteredProjects.map((p) => String(p.id))} strategy={rectSortingStrategy}>
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
