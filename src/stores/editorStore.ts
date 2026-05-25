import { create } from 'zustand';
import type { MaterialOverride, MaterialPresetId, MeshPartKey } from '@/types/scene';
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

export interface MaterialModeState {
  active: boolean;
  entityId: string;
  selectedMeshKey: MeshPartKey | null;
  selectedPresetId: MaterialPresetId | null;
  draftOverrides: Record<MeshPartKey, MaterialOverride>;
  partTree: ModelPartTreeNode;
}

interface EditorState {
  clearConfirmOpen: boolean;
  saveMessage: string | null;
  isTransformDragging: boolean;
  gizmoPointerActive: boolean;
  materialMode: MaterialModeState | null;
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
  clearConfirmOpen: false,
  saveMessage: null,
  isTransformDragging: false,
  gizmoPointerActive: false,
  materialMode: null,
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
