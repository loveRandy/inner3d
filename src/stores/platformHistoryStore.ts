import { create } from 'zustand';

export interface PlatformCommand {
  name: string;
  execute: () => void;
  undo: () => void;
}

interface PlatformHistoryState {
  past: PlatformCommand[];
  future: PlatformCommand[];
  execute: (command: PlatformCommand) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const usePlatformHistoryStore = create<PlatformHistoryState>((set, get) => ({
  past: [],
  future: [],

  execute: (command) => {
    command.execute();
    set((state) => ({
      past: [...state.past, command],
      future: [],
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;
    const command = past[past.length - 1];
    command.undo();
    set({
      past: past.slice(0, -1),
      future: [command, ...get().future],
    });
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;
    const command = future[0];
    command.execute();
    set({
      past: [...get().past, command],
      future: future.slice(1),
    });
  },

  clear: () => set({ past: [], future: [] }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

export function createSetFloorMaterialCommand(
  oldPresetId: string,
  newPresetId: string,
  apply: (presetId: string) => void,
): PlatformCommand {
  return {
    name: 'setFloorMaterial',
    execute: () => apply(newPresetId),
    undo: () => apply(oldPresetId),
  };
}

export function createResetFloorMaterialCommand(
  currentPresetId: string,
  snapshotPresetId: string,
  apply: (presetId: string) => void,
): PlatformCommand {
  return {
    name: 'resetFloorMaterial',
    execute: () => apply(snapshotPresetId),
    undo: () => apply(currentPresetId),
  };
}
