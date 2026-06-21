import { createServer } from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextCli = resolve(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

const preferred = parseInt(process.env.PORT, 10) || 3000;
const maxAttempts = 10;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

async function findPort(start) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = start + i;
    if (await isPortAvailable(port)) return port;
    console.log(`  Port ${port} is in use, trying ${port + 1}...`);
  }
  console.error('  No available ports found');
  process.exit(1);
}

const port = await findPort(preferred);
const proc = spawn(process.execPath, [nextCli, 'start', '-H', '0.0.0.0', '-p', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) },
});
proc.on('exit', (code) => process.exit(code));
