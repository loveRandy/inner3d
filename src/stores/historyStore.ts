import { create } from 'zustand';
import type { Command } from '@/lib/commands/types';

interface HistoryState {
  past: Command[];
  future: Command[];
  canUndo: boolean;
  canRedo: boolean;
  execute: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  execute: (cmd) => {
    cmd.execute();
    set((state) => ({
      past: [...state.past, cmd],
      future: [],
      canUndo: true,
      canRedo: false,
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;
    const cmd = past[past.length - 1];
    cmd.undo();
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [cmd, ...state.future],
      canUndo: state.past.length > 1,
      canRedo: true,
    }));
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;
    const cmd = future[0];
    cmd.execute();
    set((state) => ({
      past: [...state.past, cmd],
      future: state.future.slice(1),
      canUndo: true,
      canRedo: state.future.length > 1,
    }));
  },

  clear: () => {
    set({ past: [], future: [], canUndo: false, canRedo: false });
  },
}));
