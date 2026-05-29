import type {
  SceneDocument,
  SceneEntity,
  SceneSettings,
  Transform,
  Vec3,
} from '@/types/scene';
import { createEmptyDocument } from '@/types/scene';
import type { FloorPlan } from '@/types/floorPlan';
import { getAssetById } from '@/features/assets';
import { getMaterialPresetById } from '@/features/materials';
import { normalizeSceneDocument } from '@/lib/scene/documentUtils';
import { randomUUID } from '@/lib/id/randomUUID';

const SCENE_FILE_EXTENSION = '.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVec3(value: unknown): value is Vec3 {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
}

function isTransform(value: unknown): value is Transform {
  return isRecord(value) && isVec3(value.position) && isVec3(value.rotation) && isVec3(value.scale);
}

function isEntity(value: unknown): value is SceneEntity {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || !value.id) return false;
  if (value.type !== 'model' && value.type !== 'group') return false;
  if (typeof value.name !== 'string') return false;
  if (!isTransform(value.transform)) return false;
  if (value.type === 'model' && typeof value.assetId !== 'string') return false;
  if (value.children != null && !Array.isArray(value.children)) return false;
  if (Array.isArray(value.children) && !value.children.every((id) => typeof id === 'string')) {
    return false;
  }
  if (value.materialOverrides != null) {
    if (!isRecord(value.materialOverrides)) return false;
    for (const [key, override] of Object.entries(value.materialOverrides)) {
      if (typeof key !== 'string' || !key) return false;
      if (!isRecord(override)) return false;

      const presetId = override.presetId;
      const customMap = override.customMap;
      const hasValidPreset = typeof presetId === 'string' && Boolean(getMaterialPresetById(presetId));
      const hasValidMap =
        typeof customMap === 'string' &&
        customMap.length > 0 &&
        (customMap.startsWith('data:image/') || customMap.startsWith('/'));

      if (!hasValidPreset && !hasValidMap) return false;
      if (typeof presetId === 'string' && !hasValidPreset) return false;
    }
  }
  return true;
}

function isSettings(value: unknown): value is SceneSettings {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.backgroundColor === 'string' &&
    typeof value.gridVisible === 'boolean' &&
    typeof value.gridSize === 'number' &&
    typeof value.ambientIntensity === 'number'
  );
}

function unwrapScenePayload(data: unknown): unknown {
  if (isRecord(data) && isRecord(data.document)) {
    return data.document;
  }
  return data;
}

function validateEntityGraph(doc: SceneDocument): void {
  const { entities, rootIds } = doc;

  for (const id of rootIds) {
    if (!entities[id]) {
      throw new Error(`场景数据不完整：根节点 "${id}" 不存在`);
    }
  }

  for (const entity of Object.values(entities)) {
    if (entity.type === 'model') {
      if (!entity.assetId || !getAssetById(entity.assetId)) {
        throw new Error(`场景包含未知模型资源 "${entity.assetId ?? entity.name}"`);
      }
    }

    if (entity.type === 'group') {
      const children = entity.children ?? [];
      for (const childId of children) {
        if (!entities[childId]) {
          throw new Error(`组合 "${entity.name}" 引用了不存在的子节点`);
        }
      }
    }
  }

  const referencedAsChild = new Set<string>();
  for (const entity of Object.values(entities)) {
    entity.children?.forEach((childId) => referencedAsChild.add(childId));
  }

  for (const rootId of rootIds) {
    if (referencedAsChild.has(rootId)) {
      throw new Error('场景层级结构无效');
    }
  }
}

export function validateSceneDocument(data: unknown): SceneDocument {
  const payload = unwrapScenePayload(data);
  if (!isRecord(payload)) {
    throw new Error('无效的场景文件格式');
  }

  if (payload.version !== 1 && payload.version !== 2) {
    throw new Error('不支持的场景版本');
  }

  if (!isSettings(payload.settings)) {
    throw new Error('场景设置数据无效');
  }

  if (!isRecord(payload.entities)) {
    throw new Error('场景对象数据无效');
  }

  if (!Array.isArray(payload.rootIds) || !payload.rootIds.every((id) => typeof id === 'string')) {
    throw new Error('场景根节点数据无效');
  }

  const entities: Record<string, SceneEntity> = {};
  for (const [id, entity] of Object.entries(payload.entities)) {
    if (!isEntity(entity)) {
      throw new Error(`对象 "${id}" 数据格式无效`);
    }
    entities[id] = entity;
  }

  const doc: SceneDocument = {
    version: payload.version === 2 ? 2 : 1,
    id: typeof payload.id === 'string' && payload.id ? payload.id : randomUUID(),
    settings: payload.settings,
    floorPlan:
      isRecord(payload.floorPlan) ? (payload.floorPlan as unknown as FloorPlan) : undefined,
    entities,
    rootIds: [...payload.rootIds],
    updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now(),
  };

  validateEntityGraph(doc);
  return normalizeSceneDocument(doc);
}

export function sanitizeSceneFilename(name: string): string {
  const trimmed = name.trim() || '未命名场景';
  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
  return sanitized.slice(0, 64);
}

export function buildSceneExportFilename(name: string): string {
  return `${sanitizeSceneFilename(name)}${SCENE_FILE_EXTENSION}`;
}

export function downloadSceneFile(doc: SceneDocument): void {
  const payload = {
    format: '3d-scene-editor',
    formatVersion: 1,
    exportedAt: Date.now(),
    document: {
      ...doc,
      updatedAt: Date.now(),
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = buildSceneExportFilename(doc.settings.name);
  link.click();
  URL.revokeObjectURL(url);
}

export async function readSceneFile(file: File): Promise<SceneDocument> {
  if (!file.name.toLowerCase().endsWith(SCENE_FILE_EXTENSION)) {
    throw new Error('请选择 .json 场景文件');
  }

  const text = await file.text();
  if (!text.trim()) {
    throw new Error('场景文件为空');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('场景文件不是有效的 JSON');
  }

  return validateSceneDocument(parsed);
}

export function createFallbackDocument(): SceneDocument {
  return createEmptyDocument();
}
