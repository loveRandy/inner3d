import { useGLTF } from '@react-three/drei';
import { publicUrl } from '@/lib/assets/publicUrl';

/** Kenney Building Kit (CC0) — 门窗与墙体贴图 */
export const ARCHITECTURE_ASSETS = {
  door: publicUrl('/models/kenney-building/door-rotate-square-a.glb'),
  window: publicUrl('/models/kenney-building/wall-window-square-detailed.glb'),
  windowWide: publicUrl('/models/kenney-building/wall-window-wide-square-detailed.glb'),
  wallTexture: publicUrl('/models/kenney-building/variation-a.png'),
} as const;

export const WIDE_WINDOW_WIDTH_M = 1.35;

export function preloadArchitectureModels() {
  useGLTF.preload(ARCHITECTURE_ASSETS.door);
  useGLTF.preload(ARCHITECTURE_ASSETS.window);
  useGLTF.preload(ARCHITECTURE_ASSETS.windowWide);
}
