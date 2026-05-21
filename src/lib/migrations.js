/**
 * Data Migration System
 * 
 * Handles versioned migrations for localStorage data structure changes.
 * Each migration function transforms data from one version to the next.
 * 
 * Version History:
 * - v1: Initial structure (implicit, no version field)
 * - v2: Added version field, standardized todo structure
 * - v3: (Future) Reserved for next breaking change
 */

const CURRENT_VERSION = 2;

/**
 * Migration from v1 (no version) to v2 (with version field)
 * Ensures all todos have required fields: id, text, priority, done, createdAt
 */
function migrateV1toV2(data) {
  if (!Array.isArray(data)) return data;
  
  return data.map(project => ({
    ...project,
    todos: (project.todos || []).map(todo => ({
      id: todo.id || Date.now() + Math.random(),
      text: todo.text || '',
      priority: todo.priority || 'Medium',
      details: todo.details || '',
      done: Boolean(todo.done),
      createdAt: todo.createdAt || new Date().toISOString(),
    })),
    timeline: project.timeline || [],
    notes: project.notes || '',
    links: project.links || [],
    assets: project.assets || [],
  }));
}

/**
 * Registry of all migration functions
 * Key is the target version, value is the migration function
 */
const MIGRATIONS = {
  2: migrateV1toV2,
  // Future migrations:
  // 3: migrateV2toV3,
  // 4: migrateV3toV4,
};

/**
 * Run all necessary migrations to bring data to current version
 * @param {Object} storageData - Raw data from localStorage
 * @returns {Object} Migrated data with version field
 */
export function runMigrations(storageData) {
  // Handle null/undefined
  if (!storageData) {
    return { version: CURRENT_VERSION, projects: [] };
  }

  // If data is already an object with version, extract it
  let currentVersion = storageData.version || 1;
  let projects = storageData.projects || storageData;

  // Ensure projects is an array
  if (!Array.isArray(projects)) {
    console.warn('Invalid projects data structure, resetting to empty array');
    return { version: CURRENT_VERSION, projects: [] };
  }

  // Run migrations sequentially from current version to target
  for (let v = currentVersion + 1; v <= CURRENT_VERSION; v++) {
    if (MIGRATIONS[v]) {
      console.log(`Running migration to v${v}`);
      projects = MIGRATIONS[v](projects);
    }
  }

  return {
    version: CURRENT_VERSION,
    projects,
  };
}

/**
 * Get the current data version
 */
export function getCurrentVersion() {
  return CURRENT_VERSION;
}

/**
 * Check if data needs migration
 * @param {Object} storageData - Raw data from localStorage
 * @returns {boolean} True if migration is needed
 */
export function needsMigration(storageData) {
  if (!storageData) return false;
  const dataVersion = storageData.version || 1;
  return dataVersion < CURRENT_VERSION;
}
