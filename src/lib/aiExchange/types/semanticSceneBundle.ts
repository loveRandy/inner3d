import {
  SEMANTIC_SCENE_FORMAT,
  SEMANTIC_SCENE_FORMAT_VERSION,
} from '@/lib/aiExchange/constants';
import type {
  FixtureCategory,
  SemanticFloorPlanV1,
} from '@/lib/aiExchange/types/semanticFloorPlan';
import type { TrainingSampleImageMime } from '@/lib/aiExchange/types/trainingSample';

export interface SemanticVec3 {
  x: number;
  y: number;
  z: number;
}

export interface SemanticFurnitureTransformV1 {
  position: SemanticVec3;
  rotationY: number;
  scale?: SemanticVec3;
}

/** E2 — 家具语义层（3D 变换 + 类别） */
export interface SemanticFurnitureV1 {
  key: string;
  category: FixtureCategory;
  suggestedAssetId?: string;
  name?: string;
  roomKey?: string;
  transform: SemanticFurnitureTransformV1;
}

export interface SemanticSceneSettingsV1 {
  name?: string;
  gridSize?: number;
}

export interface SemanticReferenceImageV1 {
  ref: string;
  mimeType: TrainingSampleImageMime;
  width: number;
  height: number;
}

/** E2 — 语义化场景包 */
export interface SemanticSceneBundleV1 {
  format: typeof SEMANTIC_SCENE_FORMAT;
  formatVersion: typeof SEMANTIC_SCENE_FORMAT_VERSION;
  exportedAt: string;
  floorPlan: SemanticFloorPlanV1;
  furniture?: SemanticFurnitureV1[];
  sceneSettings?: SemanticSceneSettingsV1;
  referenceImage?: SemanticReferenceImageV1;
}
