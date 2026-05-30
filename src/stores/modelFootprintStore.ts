import { create } from 'zustand';
import type { ModelFootprint } from '@/lib/scene/modelFootprint';

interface ModelFootprintState {
  footprints: Record<string, ModelFootprint>;
  registerFootprint: (modelUrl: string, footprint: ModelFootprint) => void;
  getFootprint: (modelUrl: string) => ModelFootprint | undefined;
}

export const useModelFootprintStore = create<ModelFootprintState>((set, get) => ({
  footprints: {},

  registerFootprint: (modelUrl, footprint) => {
    set((state) => ({
      footprints: {
        ...state.footprints,
        [modelUrl]: footprint,
      },
    }));
  },

  getFootprint: (modelUrl) => get().footprints[modelUrl],
}));
