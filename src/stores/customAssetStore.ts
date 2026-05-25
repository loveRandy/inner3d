import { create } from 'zustand';
import { useGLTF } from '@react-three/drei';
import type { AssetManifestItem } from '@/types/scene';
import { analyzeGltfFile, buildPartsMap } from '@/lib/scene/gltfAnalysis';
import {
  loadStoredCustomAssets,
  saveStoredCustomAssets,
  type CustomAssetManifestItem,
  type StoredCustomAsset,
} from '@/lib/persistence/customAssetsDb';
import { publicUrl } from '@/lib/assets/publicUrl';
import { randomUUID } from '@/lib/id/randomUUID';

const IMPORTED_THUMBNAIL = publicUrl('/thumbnails/imported-model.svg');
const blobUrlById = new Map<string, string>();

function guessMimeType(fileName: string): string {
  return fileName.toLowerCase().endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json';
}

function toManifestItem(stored: StoredCustomAsset): CustomAssetManifestItem {
  const modelUrl = blobUrlById.get(stored.id);
  if (!modelUrl) {
    throw new Error(`自定义模型 ${stored.id} 未初始化`);
  }

  return {
    id: stored.id,
    name: stored.name,
    thumbnail: IMPORTED_THUMBNAIL,
    modelUrl,
    meshCount: stored.meshCount,
    parts: stored.parts,
    partLabels: stored.parts,
    isCustom: true,
  };
}

interface CustomAssetState {
  assets: CustomAssetManifestItem[];
  ready: boolean;
  hydrate: () => Promise<void>;
  importGltfFile: (file: File) => Promise<{ asset: CustomAssetManifestItem; summaryMessage: string }>;
}

export const useCustomAssetStore = create<CustomAssetState>((set, get) => ({
  assets: [],
  ready: false,

  hydrate: async () => {
    const stored = await loadStoredCustomAssets();
    const assets: CustomAssetManifestItem[] = [];

    for (const item of stored) {
      const blob = new Blob([item.data], { type: item.mimeType });
      const url = URL.createObjectURL(blob);
      blobUrlById.set(item.id, url);
      assets.push(toManifestItem(item));
      useGLTF.preload(url);
    }

    set({ assets, ready: true });
  },

  importGltfFile: async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.gltf') && !lowerName.endsWith('.glb')) {
      throw new Error('请选择 .gltf 或 .glb 文件');
    }

    const analysis = await analyzeGltfFile(file);
    const id = `custom-${randomUUID()}`;
    const data = await file.arrayBuffer();
    const mimeType = file.type || guessMimeType(file.name);
    const parts = buildPartsMap(analysis.parts);
    const baseName = file.name.replace(/\.(gltf|glb)$/i, '');

    const stored: StoredCustomAsset = {
      id,
      name: baseName,
      fileName: file.name,
      mimeType,
      data,
      meshCount: analysis.meshCount,
      parts,
      importedAt: Date.now(),
    };

    const existing = await loadStoredCustomAssets();
    await saveStoredCustomAssets([...existing, stored]);

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    blobUrlById.set(id, url);
    useGLTF.preload(url);

    const manifestItem = toManifestItem(stored);
    set({ assets: [...get().assets, manifestItem], ready: true });
    return { asset: manifestItem, summaryMessage: analysis.summaryMessage };
  },
}));

export function getCustomAssets(): CustomAssetManifestItem[] {
  return useCustomAssetStore.getState().assets;
}

export function getCustomAssetById(id: string): CustomAssetManifestItem | undefined {
  return useCustomAssetStore.getState().assets.find((item) => item.id === id);
}

export function getAssetMeshCount(asset: AssetManifestItem): number | undefined {
  const custom = asset as CustomAssetManifestItem;
  if (typeof custom.meshCount === 'number') return custom.meshCount;
  return undefined;
}
