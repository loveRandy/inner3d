import type { SceneDocument, SceneEntity, SceneSettings, Transform } from '@/types/scene';
import { createEmptyDocument } from '@/types/scene';
import { createEmptyFloorPlan } from '@/types/floorPlan';
import { randomUUID } from '@/lib/id/randomUUID';
import { cloneTransform } from '@/lib/transform/worldTransform';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (value && HEX_COLOR.test(value)) return value.toLowerCase();
  return fallback;
}

export function normalizeSceneDocument(doc: SceneDocument): SceneDocument {
  const defaults = createEmptyDocument();
  const next = cloneDocument(doc);
  next.version = 2;
  next.settings = {
    ...defaults.settings,
    ...next.settings,
    backgroundColor: normalizeHexColor(next.settings.backgroundColor, defaults.settings.backgroundColor),
  };
  if (!next.floorPlan) {
    next.floorPlan = createEmptyFloorPlan();
  }
  return next;
}

import type { FloorPlanSelection } from '@/types/floorPlan';

export interface DocumentSnapshot {
  document: SceneDocument;
  selectedIds: string[];
  floorPlanSelection: FloorPlanSelection[];
}

export function cloneDocument(doc: SceneDocument): SceneDocument {
  return JSON.parse(JSON.stringify(doc)) as SceneDocument;
}

export function snapshotState(
  document: SceneDocument,
  selectedIds: string[],
  floorPlanSelection: FloorPlanSelection[] = [],
): DocumentSnapshot {
  return {
    document: cloneDocument(document),
    selectedIds: [...selectedIds],
    floorPlanSelection: [...floorPlanSelection],
  };
}

export function applySnapshot(snapshot: DocumentSnapshot): {
  document: SceneDocument;
  selectedIds: string[];
  floorPlanSelection: FloorPlanSelection[];
} {
  return {
    document: cloneDocument(snapshot.document),
    selectedIds: [...snapshot.selectedIds],
    floorPlanSelection: [...snapshot.floorPlanSelection],
  };
}

export function countEntities(entities: Record<string, SceneEntity>): number {
  return Object.keys(entities).length;
}

export function createModelEntity(
  assetId: string,
  name: string,
  transform: Transform,
): SceneEntity {
  return {
    id: randomUUID(),
    type: 'model',
    name,
    assetId,
    transform: cloneTransform(transform),
    visible: true,
    locked: false,
  };
}

export function patchSettings(
  doc: SceneDocument,
  patch: Partial<SceneSettings>,
): SceneDocument {
  const next = cloneDocument(doc);
  Object.assign(next.settings, patch);
  next.updatedAt = Date.now();
  return next;
}
