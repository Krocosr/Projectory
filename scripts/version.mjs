import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const CONFIG_FILE = join(root, '.projectory');

function readConfig() {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  }
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const config = { version: pkg.version, dataFile: 'data/projects.json' };
  writeConfig(config);
  console.log(`[version] created ${CONFIG_FILE}`);
  return config;
}

function writeConfig(config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump type: ${type} (use patch|minor|major)`);
}

function syncVersion(version) {
  const pkgPath = join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  if (pkg.version !== version) {
    pkg.version = version;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  const lockPath = join(root, 'package-lock.json');
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
    if (lock.version !== version) {
      lock.version = version;
      writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    }
  }

  const tauriConf = join(root, 'src-tauri', 'tauri.conf.json');
  const config = JSON.parse(readFileSync(tauriConf, 'utf-8'));
  if (config.version !== version) {
    config.version = version;
    writeFileSync(tauriConf, JSON.stringify(config, null, 2) + '\n');
  }

  const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
  let cargo = readFileSync(cargoPath, 'utf-8');
  if (!cargo.includes(`version = "${version}"`)) {
    cargo = cargo.replace(/^version = ".*"/m, `version = "${version}"`);
    writeFileSync(cargoPath, cargo);
  }

  console.log(`[version] ${version} → package.json, package-lock.json, tauri.conf.json, Cargo.toml`);
}

const [cmd, type] = process.argv.slice(2);
const config = readConfig();

if (cmd === 'bump') {
  if (!type) throw new Error('usage: node scripts/version.mjs bump <patch|minor|major>');
  config.version = bump(config.version, type);
  writeConfig(config);
  syncVersion(config.version);
  console.log(`[version] bumped .projectory → ${config.version}`);
} else if (cmd === 'sync') {
  syncVersion(config.version);
} else {
  throw new Error('usage: node scripts/version.mjs <bump patch|minor|major|sync>');
}
