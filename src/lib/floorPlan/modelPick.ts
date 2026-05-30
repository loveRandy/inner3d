import { getAssetById } from '@/features/assets';
import {
  boundsFromCorners,
  createDefaultFootprint,
  pointInPolygon,
  transformFootprintCorners,
  type ModelFootprint,
} from '@/lib/scene/modelFootprint';
import { getWorldTransform } from '@/lib/transform/worldTransform';
import type { SceneEntity } from '@/types/scene';
import type { Vec2 } from '@/types/floorPlan';

function getModelFootprint(
  entity: SceneEntity,
  footprints: Record<string, ModelFootprint>,
): ModelFootprint {
  const asset = getAssetById(entity.assetId ?? '');
  if (!asset) return createDefaultFootprint();
  return footprints[asset.modelUrl] ?? createDefaultFootprint();
}

export function getEntityFootprintCorners(
  entityId: string,
  entities: Record<string, SceneEntity>,
  footprints: Record<string, ModelFootprint>,
): Vec2[] {
  const entity = entities[entityId];
  if (!entity || entity.visible === false) return [];

  const world = getWorldTransform(entityId, entities);

  if (entity.type === 'group') {
    const childCorners =
      entity.children?.flatMap((childId) =>
        getEntityFootprintCorners(childId, entities, footprints),
      ) ?? [];
    if (childCorners.length === 0) {
      return transformFootprintCorners(createDefaultFootprint(0.8), world);
    }
    const bounds = boundsFromCorners(childCorners);
    return [
      { x: bounds.minX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.minZ },
      { x: bounds.maxX, z: bounds.maxZ },
      { x: bounds.minX, z: bounds.maxZ },
    ];
  }

  return transformFootprintCorners(getModelFootprint(entity, footprints), world);
}

export function pickEntityAtPoint(
  point: Vec2,
  rootIds: string[],
  entities: Record<string, SceneEntity>,
  footprints: Record<string, ModelFootprint>,
): string | null {
  for (let i = rootIds.length - 1; i >= 0; i--) {
    const id = rootIds[i];
    const entity = entities[id];
    if (!entity || entity.visible === false) continue;
    const corners = getEntityFootprintCorners(id, entities, footprints);
    if (corners.length >= 3 && pointInPolygon(point, corners)) {
      return id;
    }
  }
  return null;
}
