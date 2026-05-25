import { Mesh, type Object3D } from 'three';
import type { AssetManifestItem, MaterialOverride, MeshPartKey } from '@/types/scene';

export interface ModelPartTreeNode {
  id: string;
  meshKey: MeshPartKey | null;
  name: string;
  children: ModelPartTreeNode[];
  hasOverride: boolean;
}

export interface MeshPartInfo {
  meshKey: MeshPartKey;
  name: string;
  mesh: Mesh;
}

function getDisplayName(object: Object3D, meshKey: string, partLabels?: Record<string, string>): string {
  const segment = meshKey.split('/').pop() ?? meshKey;
  if (partLabels?.[meshKey]) return partLabels[meshKey];
  if (partLabels?.[segment]) return partLabels[segment];
  const extras = object.userData.extras as { label?: string } | undefined;
  if (extras?.label) return extras.label;
  if (object.name) return object.name;
  return segment;
}

export function getMeshKeyFromRoot(object: Mesh, root: Object3D): MeshPartKey {
  const parts: string[] = [];
  let current: Object3D | null = object;

  while (current && current !== root) {
    parts.unshift(current.name || current.uuid);
    current = current.parent;
  }

  return parts.join('/');
}

export function annotateMeshKeys(
  root: Object3D,
  entityId: string,
  partLabels?: Record<string, string>,
): MeshPartInfo[] {
  const parts: MeshPartInfo[] = [];

  root.traverse((child) => {
    child.userData.entityId = entityId;
    if (child instanceof Mesh) {
      const meshKey = getMeshKeyFromRoot(child, root);
      child.userData.meshKey = meshKey;
      parts.push({
        meshKey,
        name: getDisplayName(child, meshKey, partLabels),
        mesh: child,
      });
    }
  });

  return parts;
}

export function countMeshes(root: Object3D): number {
  let count = 0;
  root.traverse((child) => {
    if (child instanceof Mesh) count += 1;
  });
  return count;
}

export interface MeshPartSummary {
  meshKey: MeshPartKey;
  name: string;
}

export function resolvePartLabels(
  item?: Pick<AssetManifestItem, 'parts' | 'partLabels'>,
): Record<string, string> | undefined {
  return item?.parts ?? item?.partLabels;
}

export function listMeshParts(root: Object3D): MeshPartSummary[] {
  const copy = root.clone(true);
  return annotateMeshKeys(copy, '__analyze__').map(({ meshKey, name }) => ({ meshKey, name }));
}

export function buildModelPartTree(
  root: Object3D,
  overrides: Record<MeshPartKey, MaterialOverride> = {},
  partLabels?: Record<string, string>,
): ModelPartTreeNode {
  const meshKey =
    root instanceof Mesh ? (root.userData.meshKey as MeshPartKey | undefined) : undefined;

  const node: ModelPartTreeNode = {
    id: meshKey ?? root.uuid,
    meshKey: root instanceof Mesh ? meshKey ?? root.uuid : null,
    name:
      root instanceof Mesh && meshKey
        ? getDisplayName(root, meshKey, partLabels)
        : root.name || '模型',
    children: [],
    hasOverride: meshKey ? Boolean(overrides[meshKey]) : false,
  };

  for (const child of root.children) {
    node.children.push(buildModelPartTree(child, overrides, partLabels));
  }

  return node;
}

export function findFirstMeshKey(node: ModelPartTreeNode): MeshPartKey | null {
  if (node.meshKey) return node.meshKey;
  for (const child of node.children) {
    const found = findFirstMeshKey(child);
    if (found) return found;
  }
  return null;
}

export function findMeshByKey(root: Object3D, meshKey: MeshPartKey): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((child) => {
    if (found) return;
    if (child instanceof Mesh && child.userData.meshKey === meshKey) {
      found = child;
    }
  });
  return found;
}

export function refreshTreeOverrides(
  node: ModelPartTreeNode,
  overrides: Record<MeshPartKey, MaterialOverride>,
): ModelPartTreeNode {
  return {
    ...node,
    hasOverride: node.meshKey ? Boolean(overrides[node.meshKey]) : false,
    children: node.children.map((child) => refreshTreeOverrides(child, overrides)),
  };
}
