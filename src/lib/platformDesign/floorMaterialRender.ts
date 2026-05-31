import * as THREE from 'three';
import type { FloorMaterialPreset } from '@/types/platformDesign';
import { getFloorMaterialPresetById } from '@/features/platformDesign/floorMaterials';
import { createFloorMaterialCanvasTexture } from '@/lib/platformDesign/floorMaterialTextures';

/** 获取 3D 用地台贴图 */
export function getFloorMaterialTexture(presetId: string): THREE.Texture {
  return createFloorMaterialCanvasTexture(presetId);
}

export function getFloorMaterialProps(presetId: string): {
  map: THREE.Texture;
  color: string;
  roughness: number;
  metalness: number;
} {
  const preset = getFloorMaterialPresetById(presetId);
  return {
    map: getFloorMaterialTexture(presetId),
    color: '#ffffff',
    roughness: preset?.roughness ?? 0.88,
    metalness: preset?.metalness ?? 0.02,
  };
}

export function getFloorMaterialRepeat(preset: FloorMaterialPreset | undefined): { x: number; z: number } {
  const repeatMm = preset?.repeatMm ?? { x: 600, y: 600 };
  return { x: repeatMm.x / 1000, z: repeatMm.y / 1000 };
}
