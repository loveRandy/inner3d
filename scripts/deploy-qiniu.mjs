import { createReadStream, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import qiniu from 'qiniu';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(rootDir, '../.env.deploy.local') });
dotenv.config({ path: path.join(rootDir, '../.env.deploy') });
dotenv.config({ path: path.join(rootDir, '../.env.production.local') });

const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET || 'randy';
const prefix = normalizePrefix(process.env.QINIU_PREFIX || '3d-scene-editor/');
const distDir = path.resolve(rootDir, '../dist');
const zoneId = process.env.QINIU_ZONE || 'z2';

const SKIP_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function normalizePrefix(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function getZone(zone) {
  switch (zone) {
    case 'z1':
      return qiniu.zone.Zone_z1;
    case 'z2':
      return qiniu.zone.Zone_z2;
    case 'na0':
      return qiniu.zone.Zone_na0;
    case 'as0':
      return qiniu.zone.Zone_as0;
    default:
      return qiniu.zone.Zone_z0;
  }
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (!SKIP_FILE_NAMES.has(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function uploadFile(formUploader, uploadToken, key, localPath, mimeType) {
  const putExtra = new qiniu.form_up.PutExtra();
  if (mimeType) putExtra.mimeType = mimeType;

  return new Promise((resolve, reject) => {
    formUploader.putStream(
      uploadToken,
      key,
      createReadStream(localPath),
      putExtra,
      (err, body, info) => {
        if (err) {
          reject(err);
          return;
        }
        if (info.statusCode === 200) {
          resolve(body);
          return;
        }
        reject(new Error(`上传失败 ${key}: HTTP ${info.statusCode} ${JSON.stringify(body)}`));
      },
    );
  });
}

async function main() {
  if (!accessKey || !secretKey) {
    throw new Error('请在 .env.deploy.local 中配置 QINIU_ACCESS_KEY 与 QINIU_SECRET_KEY');
  }

  if (!existsSync(distDir)) {
    throw new Error('未找到 dist 目录，请先执行 npm run build:cdn');
  }

  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const config = new qiniu.conf.Config();
  config.zone = getZone(zoneId);
  const formUploader = new qiniu.form_up.FormUploader(config);

  const createUploadToken = (key) => {
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: `${bucket}:${key}`,
    });
    return putPolicy.uploadToken(mac);
  };

  const files = await walkFiles(distDir);
  console.log(`开始上传到七牛 bucket=${bucket}, zone=${zoneId}, prefix=${prefix}, 文件数=${files.length}`);

  for (const filePath of files) {
    const relativePath = path.relative(distDir, filePath).split(path.sep).join('/');
    const key = `${prefix}${relativePath}`;
    const mimeType = getMimeType(filePath);
    const uploadToken = createUploadToken(key);
    await uploadFile(formUploader, uploadToken, key, filePath, mimeType);
    console.log(`✓ ${key}`);
  }

  const cdnBase = process.env.VITE_CDN_BASE_URL;
  console.log('\n上传完成。');
  if (cdnBase) {
    console.log(`访问地址示例: ${cdnBase}`);
  } else {
    console.log('请在 .env.deploy.local 配置 VITE_CDN_BASE_URL（七牛 CDN 域名 + 前缀）');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
