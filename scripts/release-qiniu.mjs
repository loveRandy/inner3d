import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(rootDir, '../.env.deploy.local') });
dotenv.config({ path: path.join(rootDir, '../.env.deploy') });
dotenv.config({ path: path.join(rootDir, '../.env.production.local') });

if (!process.env.VITE_CDN_BASE_URL) {
  console.warn('警告: 未设置 VITE_CDN_BASE_URL，构建产物将使用相对路径 /');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: path.join(rootDir, '..'),
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const buildOnly = process.argv.includes('--build-only');

run('npm', ['run', 'build']);

if (!buildOnly) {
  run('node', ['scripts/deploy-qiniu.mjs']);
}
