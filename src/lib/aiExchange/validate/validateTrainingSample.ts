import {
  TRAINING_SAMPLE_FORMAT,
  TRAINING_SAMPLE_FORMAT_VERSION,
} from '@/lib/aiExchange/constants';
import type { TrainingSamplePackageV1 } from '@/lib/aiExchange/types/trainingSample';
import { isFiniteNumber, isNonEmptyString, isRecord } from '@/lib/aiExchange/validate/guards';
import { validateSemanticFloorPlan } from '@/lib/aiExchange/validate/validateSemanticFloorPlan';

const SPLITS = ['train', 'val', 'test'] as const;
const QUALITIES = ['draft', 'reviewed'] as const;
const SOURCES = ['editor_export', 'manual_trace', 'cad_import', 'ai_corrected'] as const;
const MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function validateTrainingSamplePackage(data: unknown): TrainingSamplePackageV1 {
  if (!isRecord(data)) {
    throw new Error('训练样本包必须是 JSON 对象');
  }
  if (data.format !== TRAINING_SAMPLE_FORMAT) {
    throw new Error(`不支持的 format: ${String(data.format)}`);
  }
  if (data.formatVersion !== TRAINING_SAMPLE_FORMAT_VERSION) {
    throw new Error(`不支持的 formatVersion: ${String(data.formatVersion)}`);
  }

  if (!isRecord(data.meta)) throw new Error('meta 无效');
  if (!isNonEmptyString(data.meta.id)) throw new Error('meta.id 不能为空');
  if (!SPLITS.includes(data.meta.split as (typeof SPLITS)[number])) {
    throw new Error('meta.split 无效');
  }
  if (!QUALITIES.includes(data.meta.quality as (typeof QUALITIES)[number])) {
    throw new Error('meta.quality 无效');
  }
  if (!SOURCES.includes(data.meta.source as (typeof SOURCES)[number])) {
    throw new Error('meta.source 无效');
  }
  if (!isNonEmptyString(data.meta.createdAt)) throw new Error('meta.createdAt 无效');
  if (!isNonEmptyString(data.meta.updatedAt)) throw new Error('meta.updatedAt 无效');

  if (!isRecord(data.input) || !isRecord(data.input.image)) {
    throw new Error('input.image 无效');
  }
  const image = data.input.image;
  if (!isNonEmptyString(image.ref)) throw new Error('input.image.ref 不能为空');
  if (!isFiniteNumber(image.width) || image.width <= 0) throw new Error('input.image.width 无效');
  if (!isFiniteNumber(image.height) || image.height <= 0) throw new Error('input.image.height 无效');
  if (!MIME_TYPES.includes(image.mimeType as (typeof MIME_TYPES)[number])) {
    throw new Error('input.image.mimeType 无效');
  }

  const { plan: label } = validateSemanticFloorPlan(data.label);

  const pkg: TrainingSamplePackageV1 = {
    format: TRAINING_SAMPLE_FORMAT,
    formatVersion: TRAINING_SAMPLE_FORMAT_VERSION,
    meta: {
      id: data.meta.id,
      split: data.meta.split as TrainingSamplePackageV1['meta']['split'],
      quality: data.meta.quality as TrainingSamplePackageV1['meta']['quality'],
      source: data.meta.source as TrainingSamplePackageV1['meta']['source'],
      tags: Array.isArray(data.meta.tags)
        ? data.meta.tags.filter((t): t is string => typeof t === 'string')
        : undefined,
      annotator: typeof data.meta.annotator === 'string' ? data.meta.annotator : undefined,
      createdAt: data.meta.createdAt,
      updatedAt: data.meta.updatedAt,
    },
    input: {
      image: {
        ref: image.ref,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType as TrainingSamplePackageV1['input']['image']['mimeType'],
      },
    },
    label,
  };

  if (data.prediction != null) {
    if (!isRecord(data.prediction)) throw new Error('prediction 无效');
    const { plan } = validateSemanticFloorPlan(data.prediction.label);
    if (!isNonEmptyString(data.prediction.modelId)) throw new Error('prediction.modelId 无效');
    if (!isNonEmptyString(data.prediction.predictedAt)) throw new Error('prediction.predictedAt 无效');
    pkg.prediction = {
      label: plan,
      modelId: data.prediction.modelId,
      predictedAt: data.prediction.predictedAt,
    };
  }

  return pkg;
}
