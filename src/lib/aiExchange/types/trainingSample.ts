import {
  TRAINING_SAMPLE_FORMAT,
  TRAINING_SAMPLE_FORMAT_VERSION,
} from '@/lib/aiExchange/constants';
import type { SemanticFloorPlanV1 } from '@/lib/aiExchange/types/semanticFloorPlan';
import type { FloorPlan } from '@/types/floorPlan';

export type TrainingSampleSplit = 'train' | 'val' | 'test';
export type TrainingSampleQuality = 'draft' | 'reviewed';
export type TrainingSampleSource =
  | 'editor_export'
  | 'manual_trace'
  | 'cad_import'
  | 'ai_corrected';

export type TrainingSampleImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export interface TrainingSampleMetaV1 {
  id: string;
  split: TrainingSampleSplit;
  quality: TrainingSampleQuality;
  source: TrainingSampleSource;
  tags?: string[];
  annotator?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSampleImageV1 {
  ref: string;
  width: number;
  height: number;
  mimeType: TrainingSampleImageMime;
}

export interface TrainingSampleGroundTruthV1 {
  floorPlan?: FloorPlan;
  sceneSummary?: {
    entityCount: number;
    roomCount: number;
  };
}

export interface TrainingSamplePredictionV1 {
  label: SemanticFloorPlanV1;
  modelId: string;
  predictedAt: string;
}

/** E0 — 训练样本包 */
export interface TrainingSamplePackageV1 {
  format: typeof TRAINING_SAMPLE_FORMAT;
  formatVersion: typeof TRAINING_SAMPLE_FORMAT_VERSION;
  meta: TrainingSampleMetaV1;
  input: {
    image: TrainingSampleImageV1;
  };
  label: SemanticFloorPlanV1;
  groundTruth?: TrainingSampleGroundTruthV1;
  prediction?: TrainingSamplePredictionV1;
}
