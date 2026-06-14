import { runMigrations, needsMigration, getCurrentVersion } from './migrations';
import { BACKUP_KEY, ARCHIVE_TTL_MS, API_SYNC_DEBOUNCE_MS } from './constants';
import db from './db';

const STORAGE_KEY = 'projectory_projects';

let syncTimer = null;

function loadFromLocalStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToLocalStorage(data) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('localStorage write failed:', e);
    return false;
  }
}

function syncToApi(projects) {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects }),
    }).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('syncToApi failed:', err);
      }
    });
  }, API_SYNC_DEBOUNCE_MS);
}

function processProjects(raw) {
  if (!raw) return null;

  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return null; }
  }

  if (Array.isArray(parsed)) {
    parsed = { version: 1, projects: parsed };
  }

  if (!parsed.projects) return null;

  const migrated = needsMigration(parsed) ? runMigrations(parsed) : parsed;
  const now = Date.now();

  const projects = migrated.projects
    .map(recalculateProject)
    .filter((p) => {
      if (p.status !== 'Archived' || !p.archivedAt) return true;
      return now - new Date(p.archivedAt).getTime() <= ARCHIVE_TTL_MS;
    });

  return projects;
}

export function loadProjects() {
  const raw = loadFromLocalStorage();
  if (!raw) return null;

  const projects = processProjects(raw);
  if (!projects) return null;

  if (needsMigration(raw)) {
    saveToLocalStorage({
      version: getCurrentVersion(),
      projects,
    });
  }

  return projects;
}

export async function loadProjectsFromDb() {
  try {
    const projects = await db.projects.toArray();
    if (projects.length === 0) return null;
    return projects.map(recalculateProject);
  } catch {
    return null;
  }
}

export async function recoverFromApi() {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.projects && data.projects.length > 0) {
      const enriched = data.projects.map(recalculateProject);
      saveToLocalStorage({
        version: getCurrentVersion(),
        projects: enriched,
      });
      try { await db.projects.bulkPut(enriched); } catch {}
      return enriched;
    }
    return null;
  } catch {
    return null;
  }
}

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

export function importFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
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

export function saveProjects(projects) {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };

  if (!Array.isArray(projects)) {
    const msg = 'saveProjects: expected array, got ' + typeof projects;
    console.error(msg);
    return { success: false, error: msg };
  }

  const data = { version: getCurrentVersion(), projects };

  const lsOk = saveToLocalStorage(data);

  db.projects.bulkPut(projects).catch((e) => {
    console.error('IndexedDB write failed:', e);
  });

  createAutoBackup(projects);
  syncToApi(projects);

  if (!lsOk) {
    return { success: false, error: 'localStorage is full. Data still saved to IndexedDB.' };
  }

  return { success: true };
}

export function createAutoBackup(projects) {
  const timestamp = Date.now();
  const backup = { timestamp, projects };

  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch {}

  db.backup.put(backup).catch(() => {});
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

export async function restoreFromDbBackup() {
  try {
    const backups = await db.backup.orderBy('timestamp').reverse().limit(1).toArray();
    if (backups.length === 0) return null;
    return Array.isArray(backups[0].projects) ? backups[0].projects : null;
  } catch {
    return null;
  }
}

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

export function createTimelineEntry(action) {
  return {
    date: new Date().toISOString(),
    action,
  };
}

export function addTodoToProject(project, text, priority) {
  return {
    ...project,
    todos: [...(project.todos || []), createTodo(text, priority)],
    todoCount: (project.todoCount || 0) + 1,
  };
}

export function toggleTodo(project, todoId) {
  return {
    ...project,
    todos: (project.todos || []).map((t) =>
      t.id === todoId ? { ...t, done: !t.done } : t
    ),
  };
}

export function removeTodo(project, todoId) {
  const todos = (project.todos || []).filter((t) => t.id !== todoId);
  return {
    ...project,
    todos,
    todoCount: todos.filter((t) => !t.done).length,
  };
}
