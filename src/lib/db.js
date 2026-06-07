import Dexie from 'dexie';

const db = new Dexie('projectory');

db.version(1).stores({
  projects: 'id, status, deadline, lastWorked, title',
  backup: '&timestamp',
});

db.version(2).stores({
  projects: 'id, status, deadline, lastWorked, title',
  backup: '&timestamp',
  config: '&key',
});

export default db;

export async function migrateFromLocalStorage() {
  const raw = localStorage.getItem('projectory_projects');
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    const projects = parsed.projects || parsed;
    if (!Array.isArray(projects)) return false;

    const existing = await db.projects.toArray();
    if (existing.length > 0) return false;

    await db.projects.bulkPut(projects);
    console.log('[db] Migrated', projects.length, 'projects from localStorage to IndexedDB');
    return true;
  } catch (e) {
    console.error('[db] Migration failed:', e);
    return false;
  }
}
