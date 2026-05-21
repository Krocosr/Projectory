import { runMigrations, needsMigration } from './migrations';

const STORAGE_KEY = 'deadliner_projects';

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
    return migrated.projects;
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
 * Save projects to localStorage with versioned structure
 * 
 * Stores data as { version, projects } to support future migrations
 * 
 * @param {Array} projects - Array of project objects
 * @returns {boolean} True if save succeeded, false otherwise
 */
export function saveProjects(projects) {
  if (typeof window === 'undefined') return false;
  
  // Validate input
  if (!Array.isArray(projects)) {
    console.error('saveProjects: expected array, got', typeof projects);
    return false;
  }
  
  try {
    const serialized = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (e) {
    console.error('Failed to save projects:', e);
    
    // Handle quota exceeded error
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.error('localStorage quota exceeded. Consider cleaning up old data.');
    }
    
    return false;
  }
}

/**
 * Create a new todo item with standardized structure
 * 
 * @param {string} text - Todo description
 * @param {string} priority - Priority level: 'High', 'Medium', or 'Low'
 * @param {string} details - Optional detailed description
 * @returns {Object} Todo object with id, text, priority, details, done, createdAt
 */
export function createTodo(text, priority = 'Medium', details = '') {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    text,
    priority,
    details,
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
