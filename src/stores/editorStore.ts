import { create } from 'zustand';
import type { MaterialOverride, MaterialPresetId, MeshPartKey } from '@/types/scene';
import type { FloorPlanTool, Vec2 } from '@/types/floorPlan';
import { useSceneRefsStore } from '@/stores/sceneRefsStore';
import { useSceneStore } from '@/stores/sceneStore';
import { getAssetById } from '@/features/assets';
import {
  buildModelPartTree,
  findFirstMeshKey,
  refreshTreeOverrides,
  resolvePartLabels,
  type ModelPartTreeNode,
} from '@/lib/scene/meshParts';

export type EditorMode = 'furniture' | 'floorPlan';

export interface MaterialModeState {
  active: boolean;
  entityId: string;
  selectedMeshKey: MeshPartKey | null;
  selectedPresetId: MaterialPresetId | null;
  draftOverrides: Record<MeshPartKey, MaterialOverride>;
  partTree: ModelPartTreeNode;
}

interface EditorState {
  editorMode: EditorMode;
  floorPlanTool: FloorPlanTool;
  wallDrawStart: Vec2 | null;
  wallDrawPreview: Vec2 | null;
  rectDrawStart: Vec2 | null;
  rectDrawPreview: Vec2 | null;
  floorPlanZoom: number;
  clearConfirmOpen: boolean;
  saveMessage: string | null;
  isTransformDragging: boolean;
  gizmoPointerActive: boolean;
  materialMode: MaterialModeState | null;
  setEditorMode: (mode: EditorMode) => void;
  setFloorPlanTool: (tool: FloorPlanTool) => void;
  setWallDrawStart: (point: Vec2 | null) => void;
  setWallDrawPreview: (point: Vec2 | null) => void;
  setRectDrawStart: (point: Vec2 | null) => void;
  setRectDrawPreview: (point: Vec2 | null) => void;
  setFloorPlanZoom: (zoom: number) => void;
  resetFloorPlanDrawState: () => void;
  setClearConfirmOpen: (open: boolean) => void;
  setSaveMessage: (message: string | null) => void;
  setTransformDragging: (dragging: boolean) => void;
  setGizmoPointerActive: (active: boolean) => void;
  enterMaterialMode: (entityId: string) => boolean;
  exitMaterialMode: () => void;
  setSelectedMeshKey: (meshKey: MeshPartKey | null) => void;
  applyDraftMaterial: (presetId: MaterialPresetId) => void;
  applyDraftCustomMap: (dataUrl: string) => void;
  clearDraftOverride: (meshKey: MeshPartKey) => void;
  getDraftOverrides: () => Record<MeshPartKey, MaterialOverride>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editorMode: 'furniture',
  floorPlanTool: 'select',
  wallDrawStart: null,
  wallDrawPreview: null,
  rectDrawStart: null,
  rectDrawPreview: null,
  floorPlanZoom: 1,
  clearConfirmOpen: false,
  saveMessage: null,
  isTransformDragging: false,
  gizmoPointerActive: false,
  materialMode: null,

  setEditorMode: (mode) => {
    set({
      editorMode: mode,
      wallDrawStart: null,
      wallDrawPreview: null,
      rectDrawStart: null,
      rectDrawPreview: null,
    });
    if (mode === 'floorPlan') {
      useSceneStore.getState().setPlacementAsset(null);
    } else {
      set({ floorPlanTool: 'select' });
      useSceneStore.getState().setFloorPlanSelection([]);
    }
  },

  setFloorPlanTool: (tool) => {
    set({
      floorPlanTool: tool,
      wallDrawStart: null,
      wallDrawPreview: null,
      rectDrawStart: null,
      rectDrawPreview: null,
    });
    useSceneStore.getState().setFloorPlanSelection([]);
    useSceneStore.getState().setHoveredFloorPlan(null);
  },

  setWallDrawStart: (point) => set({ wallDrawStart: point }),
  setWallDrawPreview: (point) => set({ wallDrawPreview: point }),
  setRectDrawStart: (point) => set({ rectDrawStart: point }),
  setRectDrawPreview: (point) => set({ rectDrawPreview: point }),
  setFloorPlanZoom: (zoom) => set({ floorPlanZoom: Math.max(0.25, Math.min(4, zoom)) }),

  resetFloorPlanDrawState: () =>
    set({
      wallDrawStart: null,
      wallDrawPreview: null,
      rectDrawStart: null,
      rectDrawPreview: null,
    }),

  setClearConfirmOpen: (open) => set({ clearConfirmOpen: open }),
  setSaveMessage: (message) => set({ saveMessage: message }),
  setTransformDragging: (dragging) => set({ isTransformDragging: dragging }),
  setGizmoPointerActive: (active) => set({ gizmoPointerActive: active }),

  enterMaterialMode: (entityId) => {
    const entity = useSceneStore.getState().document.entities[entityId];
    const object = useSceneRefsStore.getState().refs[entityId];
    if (!entity || entity.type !== 'model' || !object) return false;

    const asset = getAssetById(entity.assetId ?? '');
    const overrides = { ...(entity.materialOverrides ?? {}) };
    const partTree = buildModelPartTree(object, overrides, resolvePartLabels(asset));
    const selectedMeshKey = findFirstMeshKey(partTree);

    set({
      materialMode: {
        active: true,
        entityId,
        selectedMeshKey,
        selectedPresetId: selectedMeshKey ? overrides[selectedMeshKey]?.presetId ?? null : null,
        draftOverrides: overrides,
        partTree,
      },
    });
    return true;
  },

  exitMaterialMode: () => set({ materialMode: null }),

  setSelectedMeshKey: (meshKey) => {
    const mode = get().materialMode;
    if (!mode) return;
    set({
      materialMode: {
        ...mode,
        selectedMeshKey: meshKey,
        selectedPresetId: meshKey ? mode.draftOverrides[meshKey]?.presetId ?? null : null,
      },
    });
  },

  applyDraftMaterial: (presetId) => {
    const mode = get().materialMode;
    if (!mode?.selectedMeshKey) return;

    const draftOverrides = {
      ...mode.draftOverrides,
      [mode.selectedMeshKey]: { presetId },
    };

    set({
      materialMode: {
        ...mode,
        selectedPresetId: presetId,
        draftOverrides,
        partTree: refreshTreeOverrides(mode.partTree, draftOverrides),
      },
    });
  },

  applyDraftCustomMap: (dataUrl) => {
    const mode = get().materialMode;
    if (!mode?.selectedMeshKey) return;

    const draftOverrides = {
      ...mode.draftOverrides,
      [mode.selectedMeshKey]: { customMap: dataUrl },
    };

    set({
      materialMode: {
        ...mode,
        selectedPresetId: null,
        draftOverrides,
        partTree: refreshTreeOverrides(mode.partTree, draftOverrides),
      },
    });
  },

  clearDraftOverride: (meshKey) => {
    const mode = get().materialMode;
    if (!mode) return;

    const draftOverrides = { ...mode.draftOverrides };
    delete draftOverrides[meshKey];

    set({
      materialMode: {
        ...mode,
        selectedPresetId:
          mode.selectedMeshKey === meshKey ? null : mode.selectedPresetId,
        draftOverrides,
        partTree: refreshTreeOverrides(mode.partTree, draftOverrides),
      },
    });
  },

  getDraftOverrides: () => get().materialMode?.draftOverrides ?? {},
}));
