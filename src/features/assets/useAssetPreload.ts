import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { getAssetManifest } from './index';
import { preloadArchitectureModels } from '@/features/floorPlan/architectureAssets';
import { useCustomAssetStore } from '@/stores/customAssetStore';

export function useAssetPreload() {
  const customReady = useCustomAssetStore((s) => s.ready);

  useEffect(() => {
    if (!customReady) return;
    getAssetManifest().forEach((asset) => {
      useGLTF.preload(asset.modelUrl);
    });
    preloadArchitectureModels();
  }, [customReady]);
}

export function preloadAllAssets() {
  getAssetManifest().forEach((asset) => {
    useGLTF.preload(asset.modelUrl);
  });
  preloadArchitectureModels();
}
