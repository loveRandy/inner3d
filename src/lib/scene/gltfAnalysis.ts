import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { countMeshes, listMeshParts, type MeshPartSummary } from '@/lib/scene/meshParts';

export interface GltfAnalysisResult {
  meshCount: number;
  parts: MeshPartSummary[];
  supportsMaterialReplace: boolean;
  summaryMessage: string;
}

export function buildMeshAnalysisMessage(meshCount: number, parts: MeshPartSummary[]): string {
  if (meshCount <= 0) {
    return '未检测到可编辑 mesh';
  }
  if (meshCount === 1) {
    return `检测到 1 个部件（${parts[0]?.name ?? '整体'}），支持材质替换`;
  }
  const names = parts.map((part) => part.name).join('、');
  return `检测到 ${meshCount} 个部件（${names}），支持材质替换`;
}

export function buildPartsMap(parts: MeshPartSummary[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of parts) {
    const segment = part.meshKey.split('/').pop() ?? part.meshKey;
    map[segment] = part.name;
    map[part.meshKey] = part.name;
  }
  return map;
}

export async function analyzeGltfFromUrl(url: string): Promise<GltfAnalysisResult> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const meshCount = countMeshes(gltf.scene);
  const parts = listMeshParts(gltf.scene);
  return {
    meshCount,
    parts,
    supportsMaterialReplace: meshCount > 0,
    summaryMessage: buildMeshAnalysisMessage(meshCount, parts),
  };
}

export async function analyzeGltfFile(file: File): Promise<GltfAnalysisResult> {
  const url = URL.createObjectURL(file);
  try {
    return await analyzeGltfFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
