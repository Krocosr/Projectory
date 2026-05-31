import { runMigrations, needsMigration } from './migrations';
import { BACKUP_KEY } from './constants';

const STORAGE_KEY = 'projectory_projects';

/**
 * Load projects from localStorage with automatic migration support
 * 
 * Data structure evolution:
 * - Legacy (v1): Array of projects stored directly
 * - Current (v2+): Object with { version, projects } structure
 * 
 * @returns {Array|null} Array of projects, or null if no data exists
 */
export function loadProjects() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    // Run migrations if needed
    const migrated = runMigrations(parsed);
    
    // If migration occurred, save the updated structure
    if (needsMigration(parsed)) {
      console.log('Data migrated, saving updated structure');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    
    // Return just the projects array for backward compatibility
    // Recalculate derived data from todos to ensure currentFocus, nextStep, progress, todoCount are accurate
    const projects = migrated.projects.map(recalculateProject);
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return projects.filter((p) => {
      if (p.status !== 'Archived' || !p.archivedAt) return true;
      return now - new Date(p.archivedAt).getTime() <= SEVEN_DAYS_MS;
    });
  } catch (e) {
    console.error('Failed to load projects:', e);
    // If JSON parse fails, clear corrupted data
    if (e instanceof SyntaxError) {
      console.warn('Corrupted localStorage data detected, clearing...');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        console.error('Failed to clear corrupted data:', clearError);
      }
    }
    return null;
  }
}

/**
 * Try to recover projects from the server-side API when localStorage is empty
 * 
 * @returns {Promise<Array|null>} Projects array if API has data, null otherwise
 */
export async function recoverFromApi() {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.projects && data.projects.length > 0) {
      // Restore to localStorage immediately so subsequent loads are instant
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.projects));
      console.log('[recovery] Restored', data.projects.length, 'projects from server backup');
      return data.projects;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Export projects as a downloadable JSON file
 * 
 * @param {Array} projects - Array of project objects
 */
export function exportToFile(projects) {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `projectory-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import projects from an uploaded JSON file
 * 
 * @param {File} file - The uploaded JSON file
 * @returns {Promise<{projects: Array, error: string|null}>}
 */
export function importFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          resolve({ projects: null, error: 'Invalid format: expected an array of projects' });
          return;
        }
        resolve({ projects: data, error: null });
      } catch {
        resolve({ projects: null, error: 'Invalid JSON file' });
      }
    };
    reader.onerror = () => resolve({ projects: null, error: 'Failed to read file' });
    reader.readAsText(file);
  });
}

/**
 * Save projects to localStorage with versioned structure
 * 
 * Stores data as { version, projects } to support future migrations
 * 
 * @param {Array} projects - Array of project objects
 * @returns {boolean} True if save succeeded, false otherwise
 */
let syncTimer = null;
function syncToApi(projects) {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    try {
      fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects }),
      }).catch(() => {});
    } catch {
      // Best-effort — API may not be running
    }
  }, 2000);
}

export function saveProjects(projects) {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };
  
  // Validate input
  if (!Array.isArray(projects)) {
    const msg = 'saveProjects: expected array, got ' + typeof projects;
    console.error(msg);
    return { success: false, error: msg };
  }
  
  try {
    const serialized = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, serialized);
    
    // Auto-backup to separate key on every save
    createAutoBackup(projects);
    
    // Best-effort API sync for OpenCode tooling
    syncToApi(projects);
    
    return { success: true };
  } catch (e) {
    console.error('Failed to save projects:', e);
    
    // Handle quota exceeded error
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      const msg = 'localStorage is full. Try clearing old data.';
      console.error('localStorage quota exceeded. Consider cleaning up old data.');
      return { success: false, error: msg };
    }
    
    return { success: false, error: e.message || 'Failed to save projects' };
  }
}

export function createAutoBackup(projects) {
  try {
    const backup = { timestamp: Date.now(), projects };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function restoreFromAutoBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const { projects } = JSON.parse(raw);
    return Array.isArray(projects) ? projects : null;
  } catch {
    return null;
  }
}

/**
 * Recalculate derived project data from todos
 * Ensures currentFocus, nextStep, progress, todoCount are in sync with actual todos
 * 
 * @param {Object} project - Project object
 * @returns {Object} Project with recalculated derived fields
 */
export function recalculateProject(project) {
  const todos = project.todos || [];
  const doneCount = todos.filter((t) => t.done).length;
  const activeTodos = todos.filter((t) => !t.done);
  const total = todos.length;

  return {
    ...project,
    todoCount: activeTodos.length,
    progress: total === 0 ? 0 : Math.round((doneCount / total) * 100),
    currentFocus: activeTodos.length > 0 ? activeTodos[0].text : (total > 0 ? 'All done!' : 'Getting started'),
    nextStep: activeTodos.length > 1 ? activeTodos[1].text : (total > 0 ? '-' : 'Define first action'),
  };
}

/**
 * Create a new todo item with standardized structure
 * 
 * @param {string} text - Todo description
 * @param {string} priority - Priority level: 'High', 'Medium', or 'Low'
 * @param {string} details - Optional detailed description
 * @returns {Object} Todo object with id, text, priority, details, done, createdAt
 */
export function createTodo(text, priority = 'Medium', details = '', deadline = '') {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    text,
    priority,
    details,
    deadline,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a timeline entry for project history tracking
 * 
 * @param {string} action - Description of the action taken
 * @returns {Object} Timeline entry with date and action
 */
export function createTimelineEntry(action) {
  return {
    date: new Date().toISOString(),
    action,
  };
}

/**
 * Add a new todo to a project immutably
 * 
 * @param {Object} project - Project object
 * @param {string} text - Todo description
 * @param {string} priority - Priority level
 * @returns {Object} New project object with added todo
 */
export function addTodoToProject(project, text, priority) {
  return {
    ...project,
    todos: [...(project.todos || []), createTodo(text, priority)],
    todoCount: (project.todoCount || 0) + 1,
  };
}

/**
 * Toggle the done status of a todo in a project immutably
 * 
 * @param {Object} project - Project object
 * @param {number} todoId - ID of the todo to toggle
 * @returns {Object} New project object with toggled todo
 */
export function toggleTodo(project, todoId) {
  return {
    ...project,
    todos: (project.todos || []).map((t) =>
      t.id === todoId ? { ...t, done: !t.done } : t
    ),
  };
}

/**
 * Remove a todo from a project immutably
 * 
 * @param {Object} project - Project object
 * @param {number} todoId - ID of the todo to remove
 * @returns {Object} New project object with todo removed
 */
export function removeTodo(project, todoId) {
  const todos = (project.todos || []).filter((t) => t.id !== todoId);
  return {
    ...project,
    todos,
    todoCount: todos.filter((t) => !t.done).length,
  };
}
