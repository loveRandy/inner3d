import { get, set } from 'idb-keyval';
import type { SceneDocument } from '@/types/scene';

export const DB_KEY_CURRENT = 'scene-editor:current';

export async function saveScene(doc: SceneDocument): Promise<void> {
  const payload = { ...doc, updatedAt: Date.now() };
  await set(DB_KEY_CURRENT, payload);
}

export async function loadScene(): Promise<SceneDocument | null> {
  const doc = await get<SceneDocument>(DB_KEY_CURRENT);
  return doc ?? null;
}
