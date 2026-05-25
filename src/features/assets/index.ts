import type { AssetManifestItem } from '@/types/scene';
import manifest from '@/assets/manifest.json';
import { publicUrl } from '@/lib/assets/publicUrl';
import { getCustomAssets } from '@/stores/customAssetStore';

function withPublicUrls(item: AssetManifestItem): AssetManifestItem {
  return {
    ...item,
    thumbnail: publicUrl(item.thumbnail),
    modelUrl: publicUrl(item.modelUrl),
  };
}

export function getAssetManifest(): AssetManifestItem[] {
  return [
    ...(manifest as AssetManifestItem[]).map(withPublicUrls),
    ...getCustomAssets(),
  ];
}

export function getAssetById(id: string): AssetManifestItem | undefined {
  return getAssetManifest().find((item) => item.id === id);
}

export { preloadAllAssets, useAssetPreload } from './useAssetPreload';
