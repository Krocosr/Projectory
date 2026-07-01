import fs from 'fs';
import path from 'path';
import { ProjectSchema } from './validation.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');

export function readProjects() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    const validated = data.filter((p, i) => {
      const result = ProjectSchema.safeParse(p);
      if (!result.success) {
        console.warn(`Skipping invalid project at index ${i} (id: ${p?.id ?? 'unknown'}):`, result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '));
        return false;
      }
      return true;
    });

    if (validated.length !== data.length) {
      console.warn(`Filtered ${data.length - validated.length} invalid project(s) from projects.json`);
    }

    return validated;
  } catch (e) {
    console.error('Failed to read projects file:', e.message);
    return [];
  }
}

export function writeProjects(projects) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
  } catch (e) {
    console.error('Failed to write projects file:', e.message);
  }
}
