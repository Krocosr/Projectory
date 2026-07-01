import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')).version;

const tauriConf = join(root, 'src-tauri', 'tauri.conf.json');
const config = JSON.parse(readFileSync(tauriConf, 'utf-8'));
if (config.version !== version) {
  config.version = version;
  writeFileSync(tauriConf, JSON.stringify(config, null, 2) + '\n');
  console.log(`[sync-version] tauri.conf.json → ${version}`);
}

const cargoToml = join(root, 'src-tauri', 'Cargo.toml');
let cargo = readFileSync(cargoToml, 'utf-8');
if (cargo.includes(`version = "${version}"`)) return;
cargo = cargo.replace(/^version = ".*"/m, `version = "${version}"`);
writeFileSync(cargoToml, cargo);
console.log(`[sync-version] Cargo.toml → ${version}`);
