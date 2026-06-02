import type { FixtureCategory } from '@/lib/aiExchange/types/semanticFloorPlan';

/** FixtureCategory → 编辑器默认 assetId（manifest.json） */
export const FIXTURE_TO_ASSET_ID: Partial<Record<FixtureCategory, string>> = {
  chair: 'chair-a',
  table: 'table-medium',
  sofa: 'couch',
  bed: 'bed-double-a',
  cabinet: 'cabinet-medium',
  storage_rack: 'cabinet-medium',
};

/** assetId → FixtureCategory（导出时反查） */
export const ASSET_ID_TO_FIXTURE: Record<string, FixtureCategory> = {
  'chair-a': 'chair',
  'table-medium': 'table',
  couch: 'sofa',
  'bed-double-a': 'bed',
  'cabinet-medium': 'cabinet',
  'lamp-standing': 'appliance',
};

export function getDefaultAssetIdForFixture(category: FixtureCategory): string | undefined {
  return FIXTURE_TO_ASSET_ID[category];
}

export function getFixtureCategoryForAssetId(assetId: string): FixtureCategory {
  return ASSET_ID_TO_FIXTURE[assetId] ?? 'unknown';
}
