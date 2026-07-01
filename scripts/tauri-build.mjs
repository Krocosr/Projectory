import { execSync } from 'child_process';
import { existsSync, renameSync, rmSync } from 'fs';
import { join } from 'path';

const apiDir = join(process.cwd(), 'src', 'app', 'api');
const apiBackup = join(process.cwd(), 'node_modules', '.api-backup');

// Recover from interrupted previous run
if (existsSync(apiBackup)) {
  if (!existsSync(apiDir)) {
    renameSync(apiBackup, apiDir);
    console.log('[tauri-build] Recovered API routes from stale backup');
  } else {
    // Clean up stale backup if api already exists
    rmSync(apiBackup, { recursive: true, force: true });
    console.log('[tauri-build] Cleaned up stale backup (api already present)');
  }
}

let failed = false;
try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, apiBackup);
    console.log('[tauri-build] Moved API routes out of app directory');
  }

  console.log('[tauri-build] Running next build (static export)...');
  execSync('npx next build --no-lint', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_OUTPUT: 'export' },
  });

  console.log('[tauri-build] Build complete');
} catch (err) {
  console.error('[tauri-build] Build failed:', err.message);
  failed = true;
} finally {
  if (existsSync(apiBackup)) {
    renameSync(apiBackup, apiDir);
    console.log('[tauri-build] Restored API routes');
  }
}

if (failed) process.exit(1);
