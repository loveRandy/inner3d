import { Euler, MathUtils, Matrix4, Object3D, Quaternion, Vector3 } from 'three';
import type { SceneEntity, Transform, Vec3 } from '@/types/scene';
import { DEFAULT_TRANSFORM } from '@/types/scene';

const DEG2RAD = MathUtils.DEG2RAD;
const RAD2DEG = MathUtils.RAD2DEG;

export function cloneTransform(t: Transform): Transform {
  return {
    position: { ...t.position },
    rotation: { ...t.rotation },
    scale: { ...t.scale },
  };
}

function applyTransformToObject3D(obj: Object3D, transform: Transform) {
  obj.position.set(transform.position.x, transform.position.y, transform.position.z);
  obj.rotation.set(
    transform.rotation.x * DEG2RAD,
    transform.rotation.y * DEG2RAD,
    transform.rotation.z * DEG2RAD,
    Euler.DEFAULT_ORDER,
  );
  obj.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

function readTransformFromObject3D(obj: Object3D): Transform {
  return {
    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
    rotation: {
      x: obj.rotation.x * RAD2DEG,
      y: obj.rotation.y * RAD2DEG,
      z: obj.rotation.z * RAD2DEG,
    },
    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
  };
}

function readTransformFromMatrix(matrix: Matrix4): Transform {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  matrix.decompose(position, quaternion, scale);
  const euler = new Euler().setFromQuaternion(quaternion, Euler.DEFAULT_ORDER);
  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: {
      x: euler.x * RAD2DEG,
      y: euler.y * RAD2DEG,
      z: euler.z * RAD2DEG,
    },
    scale: { x: scale.x, y: scale.y, z: scale.z },
  };
}

export function composeTransforms(parent: Transform, local: Transform): Transform {
  const parentObj = new Object3D();
  const childObj = new Object3D();
  applyTransformToObject3D(parentObj, parent);
  applyTransformToObject3D(childObj, local);
  parentObj.add(childObj);
  parentObj.updateMatrixWorld(true);
  return readTransformFromMatrix(childObj.matrixWorld);
}

export function findParentGroupId(
  entityId: string,
  entities: Record<string, SceneEntity>,
): string | null {
  for (const entity of Object.values(entities)) {
    if (entity.type === 'group' && entity.children?.includes(entityId)) {
      return entity.id;
    }
  }
  return null;
}

/** 解析为可选择的顶层实体（组内子物体 → 所属 Group） */
export function resolveRootEntityId(
  entityId: string,
  entities: Record<string, SceneEntity>,
  rootIds: string[],
): string {
  let current = entityId;
  let parentId = findParentGroupId(current, entities);
  while (parentId) {
    current = parentId;
    parentId = findParentGroupId(current, entities);
  }
  return rootIds.includes(current) ? current : entityId;
}

export function getWorldTransform(
  entityId: string,
  entities: Record<string, SceneEntity>,
): Transform {
  const entity = entities[entityId];
  if (!entity) return cloneTransform(DEFAULT_TRANSFORM);

  const parentId = findParentGroupId(entityId, entities);
  if (!parentId) return cloneTransform(entity.transform);

  const parentWorld = getWorldTransform(parentId, entities);
  return composeTransforms(parentWorld, entity.transform);
}

export function worldToLocalTransform(
  world: Transform,
  parentWorld: Transform,
): Transform {
  const parentObj = new Object3D();
  const worldObj = new Object3D();
  applyTransformToObject3D(parentObj, parentWorld);
  applyTransformToObject3D(worldObj, world);
  parentObj.updateMatrixWorld(true);
  worldObj.updateMatrixWorld(true);

  const parentInv = new Matrix4().copy(parentObj.matrixWorld).invert();
  const localMatrix = new Matrix4().multiplyMatrices(parentInv, worldObj.matrixWorld);

  const localObj = new Object3D();
  localObj.applyMatrix4(localMatrix);
  localObj.updateMatrixWorld(true);
  return readTransformFromObject3D(localObj);
}

export function averageVec3(points: Vec3[]): Vec3 {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
    z: sum.z / points.length,
  };
}

export function vec3FromVector3(v: Vector3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}
