import type { Command } from '@/lib/commands/types';
import type {
  FloorPlanSelection,
  FloorPlanSettings,
  Opening,
  Vec2,
  WallSegment,
} from '@/types/floorPlan';
import {
  applySnapshot,
  snapshotState,
  type DocumentSnapshot,
} from '@/lib/scene/documentUtils';
import {
  addRectWallsToPlan,
  addWallSegmentToPlan,
  patchFloorPlanSettings,
  removeFloorPlanSelection,
  updateWallEndpointInPlan,
} from '@/lib/floorPlan/mutations';
import { applySemanticFloorPlanToFloorPlan } from '@/lib/aiExchange/import/applySemanticFloorPlan';
import type { SemanticFloorPlanV1 } from '@/lib/aiExchange/types/semanticFloorPlan';
import { createOpeningOnWall } from '@/lib/floorPlan/openingPlacement';
import { useSceneStore } from '@/stores/sceneStore';

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

export function createAddWallCommand(start: Vec2, end: Vec2, gridSize: number): Command {
  let before: DocumentSnapshot;

  return {
    name: 'addWall',
    execute: () => {
      before = getCurrentSnapshot();
      let wallId: string | null = null;
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        const wall = addWallSegmentToPlan(fp, start, end, gridSize);
        wallId = wall?.id ?? null;
        state.document.updatedAt = Date.now();
        state.floorPlanSelection = wallId ? [{ kind: 'wall', id: wallId }] : [];
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createAddRectWallsCommand(cornerA: Vec2, cornerB: Vec2, gridSize: number): Command {
  let before: DocumentSnapshot;

  return {
    name: 'addRectWalls',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        addRectWallsToPlan(fp, cornerA, cornerB, gridSize);
        state.document.updatedAt = Date.now();
        state.floorPlanSelection = [];
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createUpdateWallCommand(
  wallId: string,
  patch: Partial<WallSegment>,
  prev: Partial<WallSegment>,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateWall',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const wall = state.document.floorPlan?.walls[wallId];
        if (!wall) return;
        Object.assign(wall, patch);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const wall = state.document.floorPlan?.walls[wallId];
        if (!wall) return;
        Object.assign(wall, prev);
        state.document.updatedAt = Date.now();
      });
      useSceneStore.setState({ floorPlanSelection: before.floorPlanSelection });
    },
  };
}

export function createUpdateWallEndpointCommand(
  wallId: string,
  end: 'start' | 'end',
  point: Vec2,
  gridSize: number,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateWallEndpoint',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        updateWallEndpointInPlan(fp, wallId, end, point, gridSize);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createAddOpeningCommand(
  wallId: string,
  type: 'door' | 'window' | 'opening',
  pickPoint: Vec2,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'addOpening',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        const opening = createOpeningOnWall(fp, wallId, type, pickPoint);
        if (!opening) return;
        fp.openings[opening.id] = opening;
        fp.openingIds.push(opening.id);
        state.document.updatedAt = Date.now();
        state.floorPlanSelection = [{ kind: 'opening', id: opening.id }];
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createUpdateOpeningCommand(
  openingId: string,
  patch: Partial<Opening>,
  prev: Partial<Opening>,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateOpening',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const opening = state.document.floorPlan?.openings[openingId];
        if (!opening) return;
        Object.assign(opening, patch);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const opening = state.document.floorPlan?.openings[openingId];
        if (!opening) return;
        Object.assign(opening, prev);
        state.document.updatedAt = Date.now();
      });
      useSceneStore.setState({ floorPlanSelection: before.floorPlanSelection });
    },
  };
}

export function createUpdateRoomCommand(
  roomId: string,
  patch: { name?: string },
  prev: { name?: string },
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateRoom',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const room = state.document.floorPlan?.rooms[roomId];
        if (!room) return;
        Object.assign(room, patch);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const room = state.document.floorPlan?.rooms[roomId];
        if (!room) return;
        Object.assign(room, prev);
        state.document.updatedAt = Date.now();
      });
      useSceneStore.setState({ floorPlanSelection: before.floorPlanSelection });
    },
  };
}

export function createUpdateFloorPlanSettingsCommand(
  patch: Partial<FloorPlanSettings>,
  prev: Partial<FloorPlanSettings>,
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'updateFloorPlanSettings',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        patchFloorPlanSettings(fp, patch);
        state.document.updatedAt = Date.now();
      });
    },
    undo: () => {
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        patchFloorPlanSettings(fp, prev);
        state.document.updatedAt = Date.now();
      });
      useSceneStore.setState({ floorPlanSelection: before.floorPlanSelection });
    },
  };
}

export function createImportSemanticFloorPlanCommand(semantic: SemanticFloorPlanV1): Command {
  let before: DocumentSnapshot;

  return {
    name: 'importSemanticFloorPlan',
    execute: () => {
      before = getCurrentSnapshot();
      const current = useSceneStore.getState().document.floorPlan;
      const { floorPlan, warnings } = applySemanticFloorPlanToFloorPlan(semantic, current);

      if (warnings.length > 0) {
        console.warn('[importSemanticFloorPlan]', warnings.join('; '));
      }

      useSceneStore.setState((state) => {
        state.document.floorPlan = floorPlan;
        state.document.updatedAt = Date.now();
        state.floorPlanSelection = [];
        state.selectedRoomId = null;
        state.selectedIds = [];
      });
    },
    undo: () => restoreSnapshot(before),
  };
}

export function createRemoveFloorPlanSelectionCommand(
  selection: FloorPlanSelection[],
): Command {
  let before: DocumentSnapshot;

  return {
    name: 'removeFloorPlan',
    execute: () => {
      before = getCurrentSnapshot();
      useSceneStore.setState((state) => {
        const fp = state.document.floorPlan;
        if (!fp) return;
        removeFloorPlanSelection(fp, selection);
        state.document.updatedAt = Date.now();
        state.floorPlanSelection = [];
      });
    },
    undo: () => restoreSnapshot(before),
  };
}
