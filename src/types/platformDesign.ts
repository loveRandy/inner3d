export type FloorMaterialCategory = 'texture' | 'tile' | 'stone' | 'wood' | 'carpet';

export interface FloorMaterialPreset {
  id: string;
  name: string;
  category: FloorMaterialCategory;
  thumbnail?: string;
  map?: string;
  color: string;
  roughness?: number;
  metalness?: number;
  repeatMm?: { x: number; y: number };
}

/** 单房间地台材质，持久化在 Room 上 */
export interface RoomFloorMaterial {
  presetId: string;
}

export const DEFAULT_FLOOR_PRESET_ID = 'wood-grain-light';

export const DEFAULT_FLOOR_MATERIAL: RoomFloorMaterial = {
  presetId: DEFAULT_FLOOR_PRESET_ID,
};

export const FLOOR_MATERIAL_CATEGORIES: { id: FloorMaterialCategory; label: string }[] = [
  { id: 'texture', label: '贴图' },
  { id: 'tile', label: '瓷砖' },
  { id: 'stone', label: '石材' },
  { id: 'wood', label: '地板' },
  { id: 'carpet', label: '地毯' },
];
