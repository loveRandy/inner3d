import type { FloorMaterialCategory, FloorMaterialPreset } from '@/types/platformDesign';
import manifest from '@/assets/floorMaterials/manifest.json';
import { FLOOR_MATERIAL_CATEGORIES } from '@/types/platformDesign';

export function getFloorMaterialManifest(): FloorMaterialPreset[] {
  return manifest as FloorMaterialPreset[];
}

export function getFloorMaterialPresetById(id: string): FloorMaterialPreset | undefined {
  return getFloorMaterialManifest().find((item) => item.id === id);
}

export function getFloorMaterialCategories(): { id: FloorMaterialCategory; label: string }[] {
  return FLOOR_MATERIAL_CATEGORIES;
}
