import fs from 'fs';
import path from 'path';
import { ProjectSchema } from './validation.js';

function resolveConfigPath() {
  const fromEnv = process.env.PROJECTORY_CONFIG;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
  const local = path.join(process.cwd(), '.projectory');
  if (fs.existsSync(local)) return local;
  return null;
}

function resolveDataFile() {
  const configPath = resolveConfigPath();
  if (configPath) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.dataFile) return path.resolve(path.dirname(configPath), config.dataFile);
    } catch (e) {
      console.warn('Failed to read .projectory config:', e.message);
    }
  }
  return path.join(process.cwd(), 'data', 'projects.json');
}

const DATA_FILE = resolveDataFile();
const DATA_DIR = path.dirname(DATA_FILE);

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
