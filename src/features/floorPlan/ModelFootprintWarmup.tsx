import { useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getAssetManifest } from '@/features/assets';
import { publicUrl } from '@/lib/assets/publicUrl';
import { computeFootprintFromObject } from '@/lib/scene/modelFootprint';
import { useModelFootprintStore } from '@/stores/modelFootprintStore';

export function ModelFootprintWarmup() {
  const registerFootprint = useModelFootprintStore((s) => s.registerFootprint);

  useEffect(() => {
    const loader = new GLTFLoader();
    const manifest = getAssetManifest();

    manifest.forEach((asset) => {
      loader.load(
        publicUrl(asset.modelUrl),
        (gltf) => {
          registerFootprint(asset.modelUrl, computeFootprintFromObject(gltf.scene));
        },
        undefined,
        () => {
          // 加载失败时跳过，渲染层会使用默认占位尺寸
        },
      );
    });
  }, [registerFootprint]);

  return null;
}
