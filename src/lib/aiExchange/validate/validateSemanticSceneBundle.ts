import {
  SEMANTIC_SCENE_FORMAT,
  SEMANTIC_SCENE_FORMAT_VERSION,
} from '@/lib/aiExchange/constants';
import type { FixtureCategory } from '@/lib/aiExchange/types/semanticFloorPlan';
import type {
  SemanticFurnitureV1,
  SemanticSceneBundleV1,
} from '@/lib/aiExchange/types/semanticSceneBundle';
import type { TrainingSampleImageMime } from '@/lib/aiExchange/types/trainingSample';
import { FIXTURE_CATEGORIES } from '@/lib/aiExchange/types/semanticFloorPlan';
import { isFiniteNumber, isNonEmptyString, isRecord } from '@/lib/aiExchange/validate/guards';
import { validateSemanticFloorPlan } from '@/lib/aiExchange/validate/validateSemanticFloorPlan';

const MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

function parseVec3(value: unknown, path: string): { x: number; y: number; z: number } {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.z)) {
    throw new Error(`${path} 必须是 { x, y, z } 数值对象`);
  }
  return { x: value.x, y: value.y, z: value.z };
}

export function validateSemanticSceneBundle(data: unknown): SemanticSceneBundleV1 {
  if (!isRecord(data)) {
    throw new Error('语义场景包必须是 JSON 对象');
  }
  if (data.format !== SEMANTIC_SCENE_FORMAT) {
    throw new Error(`不支持的 format: ${String(data.format)}`);
  }
  if (data.formatVersion !== SEMANTIC_SCENE_FORMAT_VERSION) {
    throw new Error(`不支持的 formatVersion: ${String(data.formatVersion)}`);
  }
  if (!isNonEmptyString(data.exportedAt)) {
    throw new Error('exportedAt 无效');
  }

  const { plan: floorPlan } = validateSemanticFloorPlan(data.floorPlan);

  const bundle: SemanticSceneBundleV1 = {
    format: SEMANTIC_SCENE_FORMAT,
    formatVersion: SEMANTIC_SCENE_FORMAT_VERSION,
    exportedAt: data.exportedAt,
    floorPlan,
  };

  if (data.sceneSettings != null) {
    if (!isRecord(data.sceneSettings)) throw new Error('sceneSettings 无效');
    bundle.sceneSettings = {
      name: typeof data.sceneSettings.name === 'string' ? data.sceneSettings.name : undefined,
      gridSize: isFiniteNumber(data.sceneSettings.gridSize) ? data.sceneSettings.gridSize : undefined,
    };
  }

  if (data.furniture != null) {
    if (!Array.isArray(data.furniture)) throw new Error('furniture 必须是数组');
    const roomKeys = new Set(floorPlan.rooms.map((r) => r.key));
    bundle.furniture = data.furniture.map((item, index) => {
      if (!isRecord(item)) throw new Error(`furniture[${index}] 无效`);
      const key = item.key;
      if (!isNonEmptyString(key)) throw new Error(`furniture[${index}].key 不能为空`);
      const category = item.category;
      if (typeof category !== 'string' || !FIXTURE_CATEGORIES.includes(category as FixtureCategory)) {
        throw new Error(`furniture[${index}].category 无效`);
      }
      const roomKey = item.roomKey;
      if (typeof roomKey === 'string' && !roomKeys.has(roomKey)) {
        throw new Error(`furniture[${index}].roomKey "${roomKey}" 未定义`);
      }
      if (!isRecord(item.transform)) throw new Error(`furniture[${index}].transform 无效`);
      return {
        key,
        category: category as SemanticFurnitureV1['category'],
        suggestedAssetId:
          typeof item.suggestedAssetId === 'string' ? item.suggestedAssetId : undefined,
        name: typeof item.name === 'string' ? item.name : undefined,
        roomKey: typeof roomKey === 'string' ? roomKey : undefined,
        transform: {
          position: parseVec3(item.transform.position, `furniture[${index}].transform.position`),
          rotationY: isFiniteNumber(item.transform.rotationY) ? item.transform.rotationY : 0,
          scale: isRecord(item.transform.scale)
            ? parseVec3(item.transform.scale, `furniture[${index}].transform.scale`)
            : undefined,
        },
      };
    });
  }

  if (data.referenceImage != null) {
    if (!isRecord(data.referenceImage)) throw new Error('referenceImage 无效');
    const rawRef = data.referenceImage.ref;
    if (!isNonEmptyString(rawRef)) throw new Error('referenceImage.ref 无效');
    const mimeType = data.referenceImage.mimeType;
    if (typeof mimeType !== 'string' || !MIME_TYPES.includes(mimeType as TrainingSampleImageMime)) {
      throw new Error('referenceImage.mimeType 无效');
    }
    bundle.referenceImage = {
      ref: rawRef,
      mimeType: mimeType as TrainingSampleImageMime,
      width: isFiniteNumber(data.referenceImage.width) ? data.referenceImage.width : 0,
      height: isFiniteNumber(data.referenceImage.height) ? data.referenceImage.height : 0,
    };
  }

  return bundle;
}

/** 解析裸 SemanticFloorPlan 或包在 bundle 中的 floorPlan */
export function unwrapSemanticFloorPlanPayload(data: unknown): unknown {
  if (isRecord(data) && isRecord(data.floorPlan) && data.format === SEMANTIC_SCENE_FORMAT) {
    return data.floorPlan;
  }
  return data;
}
