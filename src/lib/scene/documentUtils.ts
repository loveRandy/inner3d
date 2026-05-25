import type { SceneDocument, SceneEntity, SceneSettings, Transform } from '@/types/scene';
import { createEmptyDocument } from '@/types/scene';
import { randomUUID } from '@/lib/id/randomUUID';
import { cloneTransform } from '@/lib/transform/worldTransform';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (value && HEX_COLOR.test(value)) return value.toLowerCase();
  return fallback;
}

export function normalizeSceneDocument(doc: SceneDocument): SceneDocument {
  const defaults = createEmptyDocument().settings;
  const next = cloneDocument(doc);
  next.settings = {
    ...defaults,
    ...next.settings,
    backgroundColor: normalizeHexColor(next.settings.backgroundColor, defaults.backgroundColor),
  };
  return next;
}

export interface DocumentSnapshot {
  document: SceneDocument;
  selectedIds: string[];
}

export function cloneDocument(doc: SceneDocument): SceneDocument {
  return JSON.parse(JSON.stringify(doc)) as SceneDocument;
}

export function snapshotState(
  document: SceneDocument,
  selectedIds: string[],
): DocumentSnapshot {
  return {
    document: cloneDocument(document),
    selectedIds: [...selectedIds],
  };
}

export function applySnapshot(snapshot: DocumentSnapshot): {
  document: SceneDocument;
  selectedIds: string[];
} {
  return {
    document: cloneDocument(snapshot.document),
    selectedIds: [...snapshot.selectedIds],
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
