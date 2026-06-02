import { randomUUID } from '@/lib/id/randomUUID';
import { createEmptyFloorPlan, type FloorPlan } from '@/types/floorPlan';

export type Vec3 = { x: number; y: number; z: number };

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface AssetManifestItem {
  id: string;
  name: string;
  thumbnail: string;
  modelUrl: string;
  defaultScale?: Vec3;
  /** mesh 数量（静态 manifest 可选填写） */
  meshCount?: number;
  /** 部件 meshKey / 节点名 → 中文显示名（与 partLabels 等价，优先 parts） */
  parts?: Record<string, string>;
  /** @deprecated 使用 parts */
  partLabels?: Record<string, string>;
}

export type MaterialPresetId = string;
export type MeshPartKey = string;

export interface MaterialOverride {
  presetId?: MaterialPresetId;
  /** data URL 或 public 路径，用于自定义贴图 */
  customMap?: string;
}

export interface MaterialPreset {
  id: MaterialPresetId;
  name: string;
  category: string;
  color: string;
  thumbnail?: string;
  roughness?: number;
  metalness?: number;
  map?: string;
}

export interface SceneEntity {
  id: string;
  type: 'model' | 'group';
  name: string;
  transform: Transform;
  locked?: boolean;
  visible?: boolean;
  assetId?: string;
  children?: string[];
  materialOverrides?: Record<MeshPartKey, MaterialOverride>;
}

export interface SceneSettings {
  name: string;
  backgroundColor: string;
  gridVisible: boolean;
  gridSize: number;
  ambientIntensity: number;
}

/** 参考平面户型图（扫描/截图），用于 AI 对照与训练样本 */
export interface FloorPlanReference {
  imageRef: string;
  mimeType: string;
  width: number;
  height: number;
  transform?: {
    scale: number;
    offsetX: number;
    offsetZ: number;
    rotationRad: number;
  };
  displayMode?: 'off' | 'underlay';
}

export interface SceneDocument {
  version: 1 | 2;
  id: string;
  settings: SceneSettings;
  floorPlan?: FloorPlan;
  /** 参考户型图元数据；图像本体建议 IndexedDB 或侧车文件 */
  floorPlanReference?: FloorPlanReference;
  entities: Record<string, SceneEntity>;
  rootIds: string[];
  updatedAt: number;
}

export const DEFAULT_TRANSFORM: Transform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

export function createEmptyDocument(): SceneDocument {
  return {
    version: 2,
    id: randomUUID(),
    settings: {
      name: '未命名场景',
      backgroundColor: '#87ceeb',
      gridVisible: true,
      gridSize: 0.3,
      ambientIntensity: 0.85,
    },
    floorPlan: createEmptyFloorPlan(),
    entities: {},
    rootIds: [],
    updatedAt: Date.now(),
  };
}
