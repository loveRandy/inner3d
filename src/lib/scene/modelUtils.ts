import { Box3, Object3D } from 'three';

const groundOffsetCache = new Map<string, number>();

export function getGroundOffset(modelUrl: string, scene: Object3D): number {
  const cached = groundOffsetCache.get(modelUrl);
  if (cached !== undefined) return cached;

  const box = new Box3().setFromObject(scene);
  const offset = Number.isFinite(box.min.y) ? -box.min.y : 0;
  groundOffsetCache.set(modelUrl, offset);
  return offset;
}

export function cloneScene(scene: Object3D): Object3D {
  return scene.clone(true);
}

export function applyEntityId(object: Object3D, entityId: string) {
  object.traverse((child) => {
    child.userData.entityId = entityId;
  });
}
