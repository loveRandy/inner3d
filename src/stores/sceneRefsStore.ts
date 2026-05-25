import { create } from 'zustand';
import type { Object3D } from 'three';

interface SceneRefsState {
  refs: Record<string, Object3D>;
  registerRef: (entityId: string, object: Object3D | null) => void;
}

export const useSceneRefsStore = create<SceneRefsState>((set) => ({
  refs: {},
  registerRef: (entityId, object) => {
    set((state) => {
      const refs = { ...state.refs };
      if (object) {
        refs[entityId] = object;
      } else {
        delete refs[entityId];
      }
      return { refs };
    });
  },
}));
