#!/usr/bin/env node
/**
 * 下载 Kenney Building Kit (CC0) 并复制门窗 GLB 到 public/models/kenney-building/
 * 来源: https://opengameart.org/content/kenney-building-kit
 */
import { mkdir, cp } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const zipUrl =
  'https://opengameart.org/sites/default/files/kenney_building-kit.zip';
const tmpZip = '/tmp/kenney_building-kit.zip';
const tmpDir = '/tmp/kenney_building';
const outDir = path.join(root, 'public/models/kenney-building');
const glbDir = path.join(tmpDir, 'Models/GLB format');

const files = [
  'door-rotate-square-a.glb',
  'wall-window-square-detailed.glb',
  'wall-window-wide-square-detailed.glb',
];

const variationTexture = path.join(tmpDir, 'Models/Textures/variation-a.png');
const colormapTexture = path.join(glbDir, 'Textures/colormap.png');

console.log('Downloading Kenney Building Kit...');
execSync(`curl -fsSL -o "${tmpZip}" "${zipUrl}"`, { stdio: 'inherit' });
execSync(`unzip -qo "${tmpZip}" -d "${path.dirname(tmpDir)}"`, { stdio: 'inherit' });

await mkdir(outDir, { recursive: true });
await mkdir(path.join(outDir, 'Textures'), { recursive: true });
for (const name of files) {
  await cp(path.join(glbDir, name), path.join(outDir, name));
}
await cp(variationTexture, path.join(outDir, 'variation-a.png'));
await cp(colormapTexture, path.join(outDir, 'Textures/colormap.png'));
console.log(`Copied ${files.length} models + textures to ${outDir}`);
