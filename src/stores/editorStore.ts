import { create } from 'zustand';
import type { MaterialOverride, MaterialPresetId, MeshPartKey } from '@/types/scene';
import type { FloorPlanTool, Vec2 } from '@/types/floorPlan';
import {
  clampFloorPlanZoom,
  createDefaultViewState,
  fitViewToPolygon,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';
import { isFloorPlanDrawingInProgress } from '@/lib/floorPlan/floorPlanToolState';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import { useSceneRefsStore } from '@/stores/sceneRefsStore';
import { useSceneStore } from '@/stores/sceneStore';
import { usePlatformHistoryStore } from '@/stores/platformHistoryStore';
import { getAssetById } from '@/features/assets';
import {
  DEFAULT_FLOOR_PRESET_ID,
} from '@/types/platformDesign';
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

export interface PlatformDesignModeState {
  active: true;
  roomId: string;
  snapshotPresetId: string;
  draftPresetId: string;
  activePresetId: string | null;
  canvasView: CanvasViewState;
}

interface EditorState {
  editorMode: EditorMode;
  floorPlanTool: FloorPlanTool;
  wallDrawStart: Vec2 | null;
  wallDrawPreview: Vec2 | null;
  rectDrawStart: Vec2 | null;
  rectDrawPreview: Vec2 | null;
  floorPlanZoom: number;
  floorPlanPanX: number;
  floorPlanPanZ: number;
  clearConfirmOpen: boolean;
  saveMessage: string | null;
  isTransformDragging: boolean;
  gizmoPointerActive: boolean;
  materialMode: MaterialModeState | null;
  platformDesignMode: PlatformDesignModeState | null;
  platformClearConfirmOpen: boolean;
  platformCloseConfirmOpen: boolean;
  setEditorMode: (mode: EditorMode) => void;
  setFloorPlanTool: (tool: FloorPlanTool) => void;
  setWallDrawStart: (point: Vec2 | null) => void;
  setWallDrawPreview: (point: Vec2 | null) => void;
  setRectDrawStart: (point: Vec2 | null) => void;
  setRectDrawPreview: (point: Vec2 | null) => void;
  setFloorPlanZoom: (zoom: number) => void;
  setFloorPlanPan: (panX: number, panZ: number) => void;
  setFloorPlanView: (zoom: number, panX: number, panZ: number) => void;
  resetFloorPlanDrawState: () => void;
  cancelFloorPlanTool: () => void;
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
  enterPlatformDesignMode: (roomId: string) => boolean;
  exitPlatformDesignMode: (opts?: { save?: boolean }) => void;
  setActiveFloorMaterialPreset: (presetId: string | null) => void;
  setDraftFloorPresetId: (presetId: string) => void;
  setPlatformCanvasView: (view: Partial<CanvasViewState>) => void;
  markPlatformDesignSaved: () => void;
  setPlatformClearConfirmOpen: (open: boolean) => void;
  setPlatformCloseConfirmOpen: (open: boolean) => void;
  hasPlatformDesignUnsavedChanges: () => boolean;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editorMode: 'furniture',
  floorPlanTool: 'select',
  wallDrawStart: null,
  wallDrawPreview: null,
  rectDrawStart: null,
  rectDrawPreview: null,
  floorPlanZoom: 1,
  floorPlanPanX: 0,
  floorPlanPanZ: 0,
  clearConfirmOpen: false,
  saveMessage: null,
  isTransformDragging: false,
  gizmoPointerActive: false,
  materialMode: null,
  platformDesignMode: null,
  platformClearConfirmOpen: false,
  platformCloseConfirmOpen: false,

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
  setFloorPlanZoom: (zoom) => set({ floorPlanZoom: clampFloorPlanZoom(zoom) }),

  setFloorPlanPan: (panX, panZ) => set({ floorPlanPanX: panX, floorPlanPanZ: panZ }),

  setFloorPlanView: (zoom, panX, panZ) =>
    set({
      floorPlanZoom: clampFloorPlanZoom(zoom),
      floorPlanPanX: panX,
      floorPlanPanZ: panZ,
    }),

  resetFloorPlanDrawState: () =>
    set({
      wallDrawStart: null,
      wallDrawPreview: null,
      rectDrawStart: null,
      rectDrawPreview: null,
    }),

  cancelFloorPlanTool: () => {
    const state = get();
    if (
      isFloorPlanDrawingInProgress({
        floorPlanTool: state.floorPlanTool,
        wallDrawStart: state.wallDrawStart,
        rectDrawStart: state.rectDrawStart,
      })
    ) {
      state.resetFloorPlanDrawState();
      return;
    }
    if (state.floorPlanTool !== 'select') {
      state.setFloorPlanTool('select');
      return;
    }
    const scene = useSceneStore.getState();
    if (scene.floorPlanSelection.length > 0 || scene.selectedIds.length > 0) {
      scene.setFloorPlanSelection([]);
      scene.setSelection([]);
    }
  },

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

  enterPlatformDesignMode: (roomId) => {
    const floorPlan = useSceneStore.getState().document.floorPlan;
    const room = floorPlan?.rooms[roomId];
    if (!room || !floorPlan) return false;

    const presetId = room.floorMaterial?.presetId ?? DEFAULT_FLOOR_PRESET_ID;
    const polygon = getRoomFloorPolygon(floorPlan, room);
    const fit = fitViewToPolygon(polygon);
    const canvasView = {
      ...createDefaultViewState(800, 600),
      ...fit,
    };

    usePlatformHistoryStore.getState().clear();
    set({
      platformDesignMode: {
        active: true,
        roomId,
        snapshotPresetId: presetId,
        draftPresetId: presetId,
        activePresetId: null,
        canvasView,
      },
      materialMode: null,
    });
    return true;
  },

  exitPlatformDesignMode: ({ save = false } = {}) => {
    const mode = get().platformDesignMode;
    if (!mode) return;

    if (save) {
      useSceneStore.getState().updateRoomFloorMaterial(mode.roomId, {
        presetId: mode.draftPresetId,
      });
    }

    set({
      platformDesignMode: null,
      platformClearConfirmOpen: false,
      platformCloseConfirmOpen: false,
    });
    useSceneStore.getState().setSelectedRoomId(null);
    usePlatformHistoryStore.getState().clear();
  },

  setActiveFloorMaterialPreset: (presetId) => {
    const mode = get().platformDesignMode;
    if (!mode) return;
    const next = mode.activePresetId === presetId ? null : presetId;
    set({
      platformDesignMode: { ...mode, activePresetId: next },
    });
  },

  setDraftFloorPresetId: (presetId) => {
    const mode = get().platformDesignMode;
    if (!mode) return;
    set({
      platformDesignMode: { ...mode, draftPresetId: presetId },
    });
  },

  setPlatformCanvasView: (view) => {
    const mode = get().platformDesignMode;
    if (!mode) return;
    set({
      platformDesignMode: {
        ...mode,
        canvasView: {
          ...mode.canvasView,
          ...view,
          zoom: view.zoom !== undefined ? clampFloorPlanZoom(view.zoom) : mode.canvasView.zoom,
        },
      },
    });
  },

  markPlatformDesignSaved: () => {
    const mode = get().platformDesignMode;
    if (!mode) return;
    set({
      platformDesignMode: {
        ...mode,
        snapshotPresetId: mode.draftPresetId,
      },
    });
  },

  setPlatformClearConfirmOpen: (open) => set({ platformClearConfirmOpen: open }),
  setPlatformCloseConfirmOpen: (open) => set({ platformCloseConfirmOpen: open }),

  hasPlatformDesignUnsavedChanges: () => {
    const mode = get().platformDesignMode;
    if (!mode) return false;
    return mode.draftPresetId !== mode.snapshotPresetId;
  },
}));
