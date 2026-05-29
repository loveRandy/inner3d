import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { createRemoveEntitiesCommand, createRemoveFloorPlanSelectionCommand, createUpdateFloorPlanSettingsCommand } from '@/lib/commands';
import { nextWallAlign } from '@/types/floorPlan';
import type { FloorPlanTool } from '@/types/floorPlan';

const TOOL_KEYS: Record<string, FloorPlanTool> = {
  v: 'select',
  b: 'wall',
  f: 'rectWall',
  d: 'door',
  w: 'window',
  n: 'opening',
};

export function useEditorShortcuts() {
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const execute = useHistoryStore((s) => s.execute);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const floorPlanSelection = useSceneStore((s) => s.floorPlanSelection);
  const editorMode = useEditorStore((s) => s.editorMode);
  const setFloorPlanTool = useEditorStore((s) => s.setFloorPlanTool);
  const resetFloorPlanDrawState = useEditorStore((s) => s.resetFloorPlanDrawState);
  const floorPlanTool = useEditorStore((s) => s.floorPlanTool);
  const wallDrawStart = useEditorStore((s) => s.wallDrawStart);
  const floorPlan = useSceneStore((s) => s.document.floorPlan);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      if (editorMode === 'floorPlan') {
        if (e.key === 'Escape') {
          if (floorPlanTool === 'wall' && wallDrawStart) {
            resetFloorPlanDrawState();
          } else {
            resetFloorPlanDrawState();
            useSceneStore.getState().setFloorPlanSelection([]);
          }
          return;
        }

        if (e.code === 'Space' && !inInput) {
          e.preventDefault();
          const fp = floorPlan;
          if (!fp) return;
          const next = nextWallAlign(fp.settings.defaultAlign);
          useHistoryStore.getState().execute(
            createUpdateFloorPlanSettingsCommand(
              { defaultAlign: next },
              { defaultAlign: fp.settings.defaultAlign },
            ),
          );
          return;
        }

        if (!inInput) {
          const tool = TOOL_KEYS[e.key.toLowerCase()];
          if (tool) {
            e.preventDefault();
            setFloorPlanTool(tool);
            return;
          }
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
          if (floorPlanSelection.length === 0) return;
          e.preventDefault();
          execute(createRemoveFloorPlanSelectionCommand(floorPlanSelection));
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        execute(createRemoveEntitiesCommand(selectedIds));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo,
    redo,
    execute,
    selectedIds,
    floorPlanSelection,
    editorMode,
    setFloorPlanTool,
    resetFloorPlanDrawState,
    floorPlanTool,
    wallDrawStart,
    floorPlan,
  ]);
}
