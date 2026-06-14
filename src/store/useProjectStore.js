import { create } from 'zustand';
import { loadProjects, saveProjects, recalculateProject } from '@/lib/storage';
import { createProject as createProjectUtil } from '@/app/data';

/**
 * Zustand store for project state management.
 * Extracted from page.js to reduce complexity and improve testability.
 */
const useProjectStore = create((set, get) => ({
  // Core state
  projects: [],
  selectedProject: null,
  ready: false,

  // UI state
  activeFilter: 'All',
  searchQuery: '',
  projectSortBy: typeof window !== 'undefined' 
    ? localStorage.getItem('projectory_project_sort') || 'unsorted'
    : 'unsorted',
  isDarkMode: false,
  isStreamerMode: false,
  isSidebarOpen: false,
  isNewModalOpen: false,

  // Actions
  setProjects: (projects) => set({ projects }),
  
  setSelectedProject: (project) => set({ selectedProject: project }),
  
  setReady: (ready) => set({ ready }),
  
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setProjectSortBy: (sortBy) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('projectory_project_sort', sortBy);
    }
    set({ projectSortBy: sortBy });
  },
  
  setIsDarkMode: (isDark) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('projectory_dark_mode', String(isDark));
      document.documentElement.classList.toggle('dark', isDark);
    }
    set({ isDarkMode: isDark });
  },
  
  setIsStreamerMode: (isStreamer) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('projectory_streamer_mode', String(isStreamer));
    }
    set({ isStreamerMode: isStreamer });
  },
  
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  setIsNewModalOpen: (isOpen) => set({ isNewModalOpen: isOpen }),

  // Complex actions
  initializeProjects: () => {
    if (typeof window === 'undefined') return;
    const projects = loadProjects() || [];
    set({ 
      projects,
      ready: projects.length > 0 
    });
  },

  createProject: (formData) => {
    const newProject = createProjectUtil(formData);
    const currentProjects = get().projects;
    const updatedProjects = [newProject, ...currentProjects];
    const result = saveProjects(updatedProjects);
    
    if (result.success) {
      set({ projects: updatedProjects });
    }
    
    return result;
  },

  updateProject: (updatedProject) => {
    const recalculated = recalculateProject(updatedProject);
    const currentProjects = get().projects;
    const currentSelected = get().selectedProject;
    
    const updatedProjects = currentProjects.map((p) => 
      p.id === recalculated.id ? recalculated : p
    );
    
    const result = saveProjects(updatedProjects);
    
    if (result.success) {
      set({ 
        projects: updatedProjects,
        selectedProject: currentSelected?.id === recalculated.id ? recalculated : currentSelected
      });
    }
    
    return result;
  },

  archiveProject: (projectId) => {
    const currentProjects = get().projects;
    const projectToArchive = currentProjects.find((p) => p.id === projectId);
    
    const updatedProjects = currentProjects.map((p) => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        status: 'Archived',
        archivedAt: new Date().toISOString(),
        timeline: [
          ...(p.timeline || []),
          { date: new Date().toISOString(), action: 'Project archived' }
        ],
      };
    });
    
    const result = saveProjects(updatedProjects);
    
    if (result.success) {
      set({ 
        projects: updatedProjects,
        selectedProject: null 
      });
    }
    
    return { success: result.success, error: result.error, projectToArchive };
  },

  deletePermanent: (projectId) => {
    const currentProjects = get().projects;
    const deletedProject = currentProjects.find((p) => p.id === projectId);
    
    const updatedProjects = currentProjects.filter((p) => p.id !== projectId);
    const result = saveProjects(updatedProjects);
    
    if (result.success) {
      set({ 
        projects: updatedProjects,
        selectedProject: null 
      });
    }
    
    return { success: result.success, error: result.error, deletedProject };
  },

  cleanupArchive: () => {
    const currentProjects = get().projects;
    const archivedProjects = currentProjects.filter((p) => p.status === 'Archived');
    const archivedCount = archivedProjects.length;
    
    if (archivedCount === 0) {
      return { success: false, error: 'No archived projects to clean up', count: 0 };
    }
    
    const updatedProjects = currentProjects.filter((p) => p.status !== 'Archived');
    const result = saveProjects(updatedProjects);
    
    if (result.success) {
      set({ projects: updatedProjects });
    }
    
    return { 
      success: result.success, 
      error: result.error, 
      count: archivedCount,
      snapshot: currentProjects 
    };
  },

  restoreProjects: (projectsSnapshot) => {
    const result = saveProjects(projectsSnapshot);
    if (result.success) {
      set({ projects: projectsSnapshot });
    }
    return result;
  },

  replaceAllProjects: (newProjects) => {
    const result = saveProjects(newProjects);
    if (result.success) {
      set({ projects: newProjects });
    }
    return result;
  },

  mergeProjects: (importedProjects) => {
    const currentProjects = get().projects;
    const existingIds = new Set(currentProjects.map((p) => p.id));
    const newProjects = importedProjects.filter((p) => !existingIds.has(p.id));
    const merged = [...currentProjects, ...newProjects];
    
    const result = saveProjects(merged);
    if (result.success) {
      set({ projects: merged });
    }
    
    return { 
      success: result.success, 
      error: result.error, 
      addedCount: newProjects.length 
    };
  },

  toggleTodoInProject: (projectId, todoId) => {
    const currentProjects = get().projects;
    const now = new Date().toISOString();
    
    const updatedProjects = currentProjects.map((p) => {
      if (p.id !== projectId) return p;
      
      const newTodos = (p.todos || []).map((t) =>
        t.id === todoId 
          ? { ...t, done: !t.done, completedAt: t.done ? null : now } 
          : t
      );
      
      return recalculateProject({ ...p, todos: newTodos });
    });
    
    const result = saveProjects(updatedProjects);
    
    if (result.success) {
      set({ projects: updatedProjects });
    }
    
    return result;
  },

  reorderProjects: (reorderedProjects) => {
    const result = saveProjects(reorderedProjects);
    if (result.success) {
      set({ projects: reorderedProjects });
    }
    return result;
  },
}));

export default useProjectStore;
