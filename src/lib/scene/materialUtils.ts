import { Mesh, MeshStandardMaterial, TextureLoader } from 'three';
import type { Object3D } from 'three';
import { getMaterialPresetById } from '@/features/materials';
import type { MaterialOverride, MeshPartKey } from '@/types/scene';

const textureLoader = new TextureLoader();
const presetMaterialCache = new Map<string, MeshStandardMaterial>();

function getPresetMaterial(presetId: string): MeshStandardMaterial {
  const preset = getMaterialPresetById(presetId);
  if (!preset) {
    return new MeshStandardMaterial({ color: '#cccccc' });
  }

  let base = presetMaterialCache.get(presetId);
  if (!base) {
    base = new MeshStandardMaterial({
      color: preset.color,
      roughness: preset.roughness ?? 0.7,
      metalness: preset.metalness ?? 0,
    });
    if (preset.map) {
      base.map = textureLoader.load(preset.map);
    }
    presetMaterialCache.set(presetId, base);
  }

  return base.clone();
}

function getCustomMapMaterial(mapUrl: string): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0 });
  material.map = textureLoader.load(mapUrl);
  return material;
}

export function applyMaterialOverrides(
  root: Object3D,
  overrides: Record<MeshPartKey, MaterialOverride>,
): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const meshKey = child.userData.meshKey as MeshPartKey | undefined;
    if (!meshKey) return;

    const override = overrides[meshKey];
    if (!override) return;

    if (override.customMap) {
      child.material = getCustomMapMaterial(override.customMap);
      return;
    }

    if (override.presetId) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const nextMaterials = materials.map(() => getPresetMaterial(override.presetId!));
      child.material = nextMaterials.length === 1 ? nextMaterials[0] : nextMaterials;
    }
  });
}
