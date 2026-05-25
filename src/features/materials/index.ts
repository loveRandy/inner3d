import type { MaterialPreset } from '@/types/scene';
import manifest from '@/assets/materials/manifest.json';
import { publicUrl } from '@/lib/assets/publicUrl';

const MATERIAL_CATEGORIES: Record<string, string> = {
  all: '全部',
  fabric: '织物',
  wood: '木材',
  leather: '皮革',
  metal: '金属',
};

function withPublicUrls(item: MaterialPreset): MaterialPreset {
  return {
    ...item,
    thumbnail: item.thumbnail ? publicUrl(item.thumbnail) : item.thumbnail,
    map: item.map ? publicUrl(item.map) : item.map,
  };
}

export function getMaterialManifest(): MaterialPreset[] {
  return (manifest as MaterialPreset[]).map(withPublicUrls);
}

export function getMaterialPresetById(id: string): MaterialPreset | undefined {
  return getMaterialManifest().find((item) => item.id === id);
}

export function getMaterialCategories(): { id: string; label: string }[] {
  const ids = new Set(getMaterialManifest().map((item) => item.category));
  return [
    { id: 'all', label: MATERIAL_CATEGORIES.all },
    ...Array.from(ids).map((id) => ({ id, label: MATERIAL_CATEGORIES[id] ?? id })),
  ];
}
