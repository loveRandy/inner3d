import { SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION } from '@/lib/aiExchange/constants';

/** 标准房间语义类型 */
export type RoomType =
  | 'living_room'
  | 'lounge'
  | 'bedroom'
  | 'kitchen'
  | 'dining'
  | 'bathroom'
  | 'corridor'
  | 'balcony'
  | 'closet'
  | 'stairwell'
  | 'utility'
  | 'garage'
  | 'office'
  | 'unknown';

/** 平面固定装置 / 家具符号类别 */
export type FixtureCategory =
  | 'table'
  | 'chair'
  | 'sofa'
  | 'bed'
  | 'cabinet'
  | 'storage_rack'
  | 'ac_unit'
  | 'stair'
  | 'sink'
  | 'toilet'
  | 'bathtub'
  | 'appliance'
  | 'unknown';

export type SemanticFloorPlanSource = 'manual' | 'ai' | 'cad_import' | 'editor_export';
export type SemanticLocale = 'zh-CN' | 'en-US';
export type SemanticWallKind = 'bearing' | 'nonBearing';
export type SemanticOpeningType = 'door' | 'window' | 'opening';
export type SemanticDoorStyle = 'swing' | 'sliding' | 'unknown';
export type SemanticAnnotationType = 'text' | 'arrow' | 'dimension' | 'custom';
export type SemanticLabelLanguage = 'zh' | 'en';

/** 世界 XZ 平面坐标，单位：米 */
export interface SemanticVec2 {
  x: number;
  z: number;
}

export interface SemanticFloorPlanMetaV1 {
  title?: string;
  floorLevel?: string;
  floorLevelLabel?: string;
  source: SemanticFloorPlanSource;
  confidence?: number;
  locale?: SemanticLocale;
  createdAt?: string;
}

export interface SemanticFloorPlanDefaultsV1 {
  wallThickness: number;
  wallHeight: number;
  wallKind: SemanticWallKind;
}

export interface SemanticImageCalibrationV1 {
  imageWidth: number;
  imageHeight: number;
  referenceLinePx: [[number, number], [number, number]];
  referenceLengthM: number;
  rotationRad?: number;
  originWorld?: SemanticVec2;
}

export interface SemanticCoordinateSystemV1 {
  unit: 'meter';
  imageCalibration?: SemanticImageCalibrationV1;
}

export interface SemanticWallV1 {
  start: SemanticVec2;
  end: SemanticVec2;
  thickness?: number;
  height?: number;
  kind?: SemanticWallKind;
  isExterior?: boolean;
}

export interface SemanticOpeningV1 {
  type: SemanticOpeningType;
  wallIndex: number;
  offset: number;
  width: number;
  height?: number;
  sillHeight?: number;
  flip?: boolean;
  doorStyle?: SemanticDoorStyle;
}

export interface SemanticRoomLabelV1 {
  text: string;
  language?: SemanticLabelLanguage;
  position: SemanticVec2;
}

export interface SemanticRoomV1 {
  key: string;
  roomType: RoomType;
  name?: string;
  nameZh?: string;
  nameEn?: string;
  polygon: SemanticVec2[];
  area?: number;
  labels?: SemanticRoomLabelV1[];
}

export interface SemanticFixtureSizeV1 {
  width: number;
  depth: number;
  height?: number;
}

export interface SemanticFixtureV1 {
  category: FixtureCategory;
  roomKey?: string;
  position: SemanticVec2;
  rotationDeg?: number;
  size?: SemanticFixtureSizeV1;
  count?: number;
  label?: string;
}

export interface SemanticAnnotationV1 {
  type: SemanticAnnotationType;
  content?: string;
  geometry: SemanticVec2[];
}

/** E1 — 语义化户型交换格式（AI 主输出 / 主标签） */
export interface SemanticFloorPlanV1 {
  schemaVersion: typeof SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION;
  meta: SemanticFloorPlanMetaV1;
  defaults: SemanticFloorPlanDefaultsV1;
  coordinateSystem: SemanticCoordinateSystemV1;
  walls: SemanticWallV1[];
  openings: SemanticOpeningV1[];
  rooms: SemanticRoomV1[];
  fixtures?: SemanticFixtureV1[];
  annotations?: SemanticAnnotationV1[];
}

export const ROOM_TYPES: readonly RoomType[] = [
  'living_room',
  'lounge',
  'bedroom',
  'kitchen',
  'dining',
  'bathroom',
  'corridor',
  'balcony',
  'closet',
  'stairwell',
  'utility',
  'garage',
  'office',
  'unknown',
] as const;

export const FIXTURE_CATEGORIES: readonly FixtureCategory[] = [
  'table',
  'chair',
  'sofa',
  'bed',
  'cabinet',
  'storage_rack',
  'ac_unit',
  'stair',
  'sink',
  'toilet',
  'bathtub',
  'appliance',
  'unknown',
] as const;

export const DEFAULT_SEMANTIC_DEFAULTS: SemanticFloorPlanDefaultsV1 = {
  wallThickness: 0.24,
  wallHeight: 2.8,
  wallKind: 'nonBearing',
};

export function createEmptySemanticFloorPlan(
  source: SemanticFloorPlanSource = 'manual',
): SemanticFloorPlanV1 {
  return {
    schemaVersion: SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION,
    meta: { source },
    defaults: { ...DEFAULT_SEMANTIC_DEFAULTS },
    coordinateSystem: { unit: 'meter' },
    walls: [],
    openings: [],
    rooms: [],
    fixtures: [],
    annotations: [],
  };
}

export function isRoomType(value: string): value is RoomType {
  return (ROOM_TYPES as readonly string[]).includes(value);
}

export function isFixtureCategory(value: string): value is FixtureCategory {
  return (FIXTURE_CATEGORIES as readonly string[]).includes(value);
}
