import { get, set } from 'idb-keyval';
import type { AssetManifestItem } from '@/types/scene';

export const DB_KEY_CUSTOM_ASSETS = 'scene-editor:custom-assets';

export interface StoredCustomAsset {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  data: ArrayBuffer;
  meshCount: number;
  parts: Record<string, string>;
  importedAt: number;
}

export interface CustomAssetManifestItem extends AssetManifestItem {
  meshCount: number;
  isCustom: true;
}

export async function loadStoredCustomAssets(): Promise<StoredCustomAsset[]> {
  const stored = await get<StoredCustomAsset[]>(DB_KEY_CUSTOM_ASSETS);
  return stored ?? [];
}

export async function saveStoredCustomAssets(assets: StoredCustomAsset[]): Promise<void> {
  await set(DB_KEY_CUSTOM_ASSETS, assets);
}
