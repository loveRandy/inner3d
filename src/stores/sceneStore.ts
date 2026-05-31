import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SceneDocument, SceneEntity, Transform } from '@/types/scene';
import { createEmptyDocument } from '@/types/scene';
import type { FloorPlanSelection } from '@/types/floorPlan';
import type { RoomFloorMaterial } from '@/types/platformDesign';
import { normalizeSceneDocument } from '@/lib/scene/documentUtils';
import { buildGroupFromSelection, buildUngroup } from '@/lib/commands/sceneCommands';
import { getWorldTransform } from '@/lib/transform/worldTransform';

interface SceneState {
  document: SceneDocument;
  selectedIds: string[];
  selectedRoomId: string | null;
  floorPlanSelection: FloorPlanSelection[];
  placementAssetId: string | null;
  hoveredEntityId: string | null;
  hoveredFloorPlanId: { kind: FloorPlanSelection['kind']; id: string } | null;

  setPlacementAsset: (assetId: string | null) => void;
  setHoveredEntity: (entityId: string | null) => void;
  setHoveredFloorPlan: (item: { kind: FloorPlanSelection['kind']; id: string } | null) => void;
  setSelection: (ids: string[]) => void;
  clearEntitySelection: () => void;
  setSelectedRoomId: (roomId: string | null) => void;
  setFloorPlanSelection: (items: FloorPlanSelection[]) => void;
  toggleSelection: (id: string, additive: boolean) => void;
  loadDocument: (doc: SceneDocument) => void;
  removeEntitiesByIds: (ids: string[]) => void;
  groupEntities: (selectedIds: string[]) => void;
  ungroupEntity: (groupId: string) => void;
  updateRoomFloorMaterial: (roomId: string, material: RoomFloorMaterial) => void;
  getEntityWorldTransform: (id: string) => Transform;
}

function collectDescendantIds(
  id: string,
  entities: Record<string, SceneEntity>,
): string[] {
  const entity = entities[id];
  if (!entity) return [];
  if (entity.type === 'group' && entity.children?.length) {
    return [id, ...entity.children.flatMap((childId) => collectDescendantIds(childId, entities))];
  }
  return [id];
}

export const useSceneStore = create<SceneState>()(
  immer((set, get) => ({
    document: createEmptyDocument(),
    selectedIds: [],
    selectedRoomId: null,
    floorPlanSelection: [],
    placementAssetId: null,
    hoveredEntityId: null,
    hoveredFloorPlanId: null,

    setPlacementAsset: (assetId) => {
      set({ placementAssetId: assetId, hoveredEntityId: null });
    },

    setHoveredEntity: (entityId) => {
      set({ hoveredEntityId: entityId });
    },

    setHoveredFloorPlan: (item) => {
      set({ hoveredFloorPlanId: item });
    },

    setSelection: (ids) => {
      set({ selectedIds: ids, floorPlanSelection: [], selectedRoomId: null });
    },

    clearEntitySelection: () => {
      set({ selectedIds: [], hoveredEntityId: null });
    },

    setSelectedRoomId: (roomId) => {
      set({ selectedRoomId: roomId, selectedIds: [], floorPlanSelection: [] });
    },

    setFloorPlanSelection: (items) => {
      set({ floorPlanSelection: items, selectedIds: [], selectedRoomId: null });
    },

    toggleSelection: (id, additive) => {
      set((state) => {
        if (!additive) {
          state.selectedIds = [id];
          state.selectedRoomId = null;
          state.floorPlanSelection = [];
          return;
        }
        if (state.selectedIds.includes(id)) {
          state.selectedIds = state.selectedIds.filter((x) => x !== id);
        } else {
          state.selectedIds.push(id);
        }
      });
    },

    loadDocument: (doc) => {
      set({
        document: normalizeSceneDocument(doc),
        selectedIds: [],
        selectedRoomId: null,
        floorPlanSelection: [],
        placementAssetId: null,
        hoveredEntityId: null,
        hoveredFloorPlanId: null,
      });
    },

    removeEntitiesByIds: (ids) => {
      set((state) => {
        const removeSet = new Set<string>();
        for (const id of ids) {
          collectDescendantIds(id, state.document.entities).forEach((x) => removeSet.add(x));
        }

        for (const id of removeSet) {
          delete state.document.entities[id];
        }

        state.document.rootIds = state.document.rootIds.filter((id) => !removeSet.has(id));

        for (const entity of Object.values(state.document.entities)) {
          if (entity.type === 'group' && entity.children) {
            entity.children = entity.children.filter((id) => !removeSet.has(id));
            if (entity.children.length === 0) {
              delete state.document.entities[entity.id];
              state.document.rootIds = state.document.rootIds.filter((rid) => rid !== entity.id);
            }
          }
        }

        state.selectedIds = state.selectedIds.filter((id) => !removeSet.has(id));
        state.document.updatedAt = Date.now();
      });
    },

    groupEntities: (selectedIds) => {
      set((state) => {
        const result = buildGroupFromSelection(state.document, selectedIds);
        if (!result) return;
        state.document.entities = result.updatedEntities;
        state.document.rootIds = result.rootIds;
        state.document.updatedAt = Date.now();
        state.selectedIds = [result.group.id];
      });
    },

    ungroupEntity: (groupId) => {
      set((state) => {
        const result = buildUngroup(state.document, groupId);
        if (!result) return;
        state.document.entities = result.entities;
        state.document.rootIds = result.rootIds;
        state.document.updatedAt = Date.now();
        state.selectedIds = result.selectedIds;
      });
    },

    getEntityWorldTransform: (id) => {
      return getWorldTransform(id, get().document.entities);
    },

    updateRoomFloorMaterial: (roomId, material) => {
      set((state) => {
        const room = state.document.floorPlan?.rooms[roomId];
        if (!room || !state.document.floorPlan) return;
        room.floorMaterial = { ...material };
        state.document.updatedAt = Date.now();
      });
    },
  })),
);
