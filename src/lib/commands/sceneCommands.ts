import type { Command } from '@/lib/commands/types';
import type {
  MaterialOverride,
  MeshPartKey,
  SceneDocument,
  SceneEntity,
  SceneSettings,
  Transform,
  Vec3,
} from '@/types/scene';
import {
  applySnapshot,
  createModelEntity,
  patchSettings,
  snapshotState,
  type DocumentSnapshot,
} from '@/lib/scene/documentUtils';
import { getAssetById } from '@/features/assets';
import {
  averageVec3,
  cloneTransform,
  composeTransforms,
  getWorldTransform,
  worldToLocalTransform,
} from '@/lib/transform/worldTransform';
import { useSceneStore } from '@/stores/sceneStore';
import { randomUUID } from '@/lib/id/randomUUID';
import { createEmptyFloorPlan } from '@/types/floorPlan';

function getCurrentSnapshot(): DocumentSnapshot {
  const { document, selectedIds, floorPlanSelection } = useSceneStore.getState();
  return snapshotState(document, selectedIds, floorPlanSelection);
}

function restoreSnapshot(before: DocumentSnapshot) {
  const restored = applySnapshot(before);
  useSceneStore.setState({
    document: restored.document,
    selectedIds: restored.selectedIds,
    floorPlanSelection: restored.floorPlanSelection,
  });
}

export function createAddModelCommand(assetId: string, position: Vec3): Command {
  const asset = getAssetById(assetId);
  const entity = createModelEntity(
    assetId,
    asset?.name ?? assetId,
    {
      position: { ...position },
      rotation: { x: 0, y: 0, z: 0 },
      scale: asset?.defaultScale ?? { x: 1, y: 1, z: 1 },
    },
  );

  let before: DocumentSnapshot;

  return {
    name: 'addModel',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        state.document.entities[entity.id] = entity;
        state.document.rootIds.push(entity.id);
        state.document.updatedAt = Date.now();
        state.selectedIds = [entity.id];
        state.placementAssetId = null;
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createUpdateTransformCommand(
  id: string,
  next: Transform,
  prev: Transform,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateTransform',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const entity = state.document.entities[id];
        if (!entity) return;
        entity.transform = cloneTransform(next);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const entity = state.document.entities[id];
        if (!entity) return;
        entity.transform = cloneTransform(prev);
        state.document.updatedAt = Date.now();
      });
      if (before) {
        useSceneStore.setState({ selectedIds: before.selectedIds });
      }
    },
  };
}

export function createUpdateEntityCommand(
  id: string,
  patch: Partial<SceneEntity>,
  prev: Partial<SceneEntity>,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateEntity',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const entity = state.document.entities[id];
        if (!entity) return;
        Object.assign(entity, patch);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const entity = state.document.entities[id];
        if (!entity) return;
        Object.assign(entity, prev);
        state.document.updatedAt = Date.now();
      });
      if (before) {
        useSceneStore.setState({ selectedIds: before.selectedIds });
      }
    },
  };
}

export function createUpdateMaterialOverridesCommand(
  id: string,
  next: Record<MeshPartKey, MaterialOverride>,
  prev: Record<MeshPartKey, MaterialOverride>,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateMaterialOverrides',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const entity = state.document.entities[id];
        if (!entity) return;
        entity.materialOverrides = Object.keys(next).length > 0 ? { ...next } : undefined;
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const entity = state.document.entities[id];
        if (!entity) return;
        entity.materialOverrides = Object.keys(prev).length > 0 ? { ...prev } : undefined;
        state.document.updatedAt = Date.now();
      });
      if (before) {
        useSceneStore.setState({ selectedIds: before.selectedIds });
      }
    },
  };
}

export function createUpdateSettingsCommand(
  patch: Partial<SceneSettings>,
  prev: Partial<SceneSettings>,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateSettings',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        state.document = patchSettings(state.document, patch);
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        state.document = patchSettings(state.document, prev);
      });
      if (before) {
        useSceneStore.setState({ selectedIds: before.selectedIds });
      }
    },
  };
}

export function createRemoveEntitiesCommand(ids: string[]): Command {
  let before: DocumentSnapshot;

  return {
    name: 'removeEntities',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.getState().removeEntitiesByIds(ids);
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createGroupCommand(selectedIds: string[]): Command {
  let before: DocumentSnapshot;

  return {
    name: 'group',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.getState().groupEntities(selectedIds);
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createUngroupCommand(groupId: string): Command {
  let before: DocumentSnapshot;

  return {
    name: 'ungroup',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.getState().ungroupEntity(groupId);
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createClearSceneCommand(): Command {
  let before: DocumentSnapshot;

  return {
    name: 'clearScene',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        state.document.entities = {};
        state.document.rootIds = [];
        if (state.document.floorPlan) {
          state.document.floorPlan = createEmptyFloorPlan();
        }
        state.document.updatedAt = Date.now();
        state.selectedIds = [];
        state.floorPlanSelection = [];
        state.placementAssetId = null;
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function buildGroupFromSelection(
  document: SceneDocument,
  selectedIds: string[],
): { group: SceneEntity; updatedEntities: Record<string, SceneEntity>; rootIds: string[] } | null {
  const topLevel = selectedIds.filter((id) => document.rootIds.includes(id));
  if (topLevel.length < 2) return null;

  const entities = { ...document.entities };
  const worldTransforms = topLevel.map((id) => ({
    id,
    world: getWorldTransform(id, entities),
  }));
  const center = averageVec3(worldTransforms.map((w) => w.world.position));

  const group: SceneEntity = {
    id: randomUUID(),
    type: 'group',
    name: '组合',
    transform: {
      position: center,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    children: [...topLevel],
    visible: true,
    locked: false,
  };

  const groupWorld = group.transform;
  for (const { id, world } of worldTransforms) {
    const entity = entities[id];
    if (!entity) continue;
    entities[id] = {
      ...entity,
      transform: worldToLocalTransform(world, groupWorld),
    };
  }

  entities[group.id] = group;
  const rootIds = document.rootIds.filter((id) => !topLevel.includes(id));
  rootIds.push(group.id);

  return { group, updatedEntities: entities, rootIds };
}

export function buildUngroup(
  document: SceneDocument,
  groupId: string,
): { entities: Record<string, SceneEntity>; rootIds: string[]; selectedIds: string[] } | null {
  const group = document.entities[groupId];
  if (!group || group.type !== 'group' || !group.children?.length) return null;

  const entities = { ...document.entities };
  const groupWorld = getWorldTransform(groupId, entities);
  const childIds = [...group.children];

  for (const childId of childIds) {
    const child = entities[childId];
    if (!child) continue;
    entities[childId] = {
      ...child,
      transform: composeTransforms(groupWorld, child.transform),
    };
  }

  delete entities[groupId];
  const rootIds = document.rootIds.filter((id) => id !== groupId);
  rootIds.push(...childIds);

  return { entities, rootIds, selectedIds: childIds };
}
