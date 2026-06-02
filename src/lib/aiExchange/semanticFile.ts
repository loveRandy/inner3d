import { SFP_FILE_EXTENSION, SSB_FILE_EXTENSION } from '@/lib/aiExchange/constants';
import type { SemanticFloorPlanV1 } from '@/lib/aiExchange/types/semanticFloorPlan';
import type { SemanticSceneBundleV1 } from '@/lib/aiExchange/types/semanticSceneBundle';
import {
  unwrapSemanticFloorPlanPayload,
  validateSemanticFloorPlan,
  validateSemanticSceneBundle,
} from '@/lib/aiExchange/validate';

export function sanitizeSemanticFilename(name: string, extension: string): string {
  const trimmed = name.trim() || 'semantic-floor-plan';
  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
  return sanitized.slice(0, 64) + extension;
}

export function buildSemanticFloorPlanFilename(title?: string): string {
  return sanitizeSemanticFilename(title ?? '户型', SFP_FILE_EXTENSION);
}

export function buildSemanticSceneBundleFilename(name?: string): string {
  return sanitizeSemanticFilename(name ?? '场景', SSB_FILE_EXTENSION);
}

export async function readSemanticFloorPlanFile(file: File): Promise<SemanticFloorPlanV1> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.json') && !lower.endsWith('.sfp.json')) {
    throw new Error(`请选择 ${SFP_FILE_EXTENSION} 或 .json 语义户型文件`);
  }
  const text = await file.text();
  if (!text.trim()) throw new Error('文件为空');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  const { plan } = validateSemanticFloorPlan(unwrapSemanticFloorPlanPayload(parsed));
  return plan;
}

export async function readSemanticSceneBundleFile(file: File): Promise<SemanticSceneBundleV1> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.json') && !lower.endsWith('.ssb.json')) {
    throw new Error(`请选择 ${SSB_FILE_EXTENSION} 或 .json 语义场景文件`);
  }
  const text = await file.text();
  if (!text.trim()) throw new Error('文件为空');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  return validateSemanticSceneBundle(parsed);
}

export function downloadSemanticFloorPlan(plan: SemanticFloorPlanV1, title?: string): void {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = buildSemanticFloorPlanFilename(title ?? plan.meta.title);
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadSemanticSceneBundle(bundle: SemanticSceneBundleV1): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = buildSemanticSceneBundleFilename(bundle.sceneSettings?.name);
  link.click();
  URL.revokeObjectURL(url);
}
