import { randomUUID } from '@/lib/id/randomUUID';
import type { RoomType } from '@/lib/aiExchange/types/semanticFloorPlan';

export type { RoomType };

export type WallAlign = 'center' | 'inner' | 'outer';
export type WallKind = 'bearing' | 'nonBearing';
export type OpeningType = 'door' | 'window' | 'opening';
export type FloorPlanTool = 'select' | 'wall' | 'rectWall' | 'door' | 'window' | 'opening';
export type FloorPlanSelectionKind = 'wall' | 'opening' | 'room';

export interface FloorPlanSelection {
  kind: FloorPlanSelectionKind;
  id: string;
}

/** 2D 平面坐标，对应世界 XZ，单位：米 */
export type Vec2 = { x: number; z: number };

export interface WallSegment {
  id: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  align: WallAlign;
  kind: WallKind;
  startNodeId: string;
  endNodeId: string;
}

export interface Opening {
  id: string;
  type: OpeningType;
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
  flip?: boolean;
}

export interface Room {
  id: string;
  name: string;
  wallLoop: string[];
  area: number;
  centroid: Vec2;
  /** 语义房间类型（AI 交换 / 导入导出）；可选 */
  roomType?: RoomType;
  /** 地台材质；undefined 表示使用全局默认 */
  floorMaterial?: import('@/types/platformDesign').RoomFloorMaterial;
}

export interface FloorPlanSettings {
  name: string;
  floorHeight: number;
  defaultWallThickness: number;
  defaultAlign: WallAlign;
  autoRoom: boolean;
  autoJoin: boolean;
  orthoLocked: boolean;
}

export interface FloorPlan {
  settings: FloorPlanSettings;
  walls: Record<string, WallSegment>;
  wallIds: string[];
  openings: Record<string, Opening>;
  openingIds: string[];
  rooms: Record<string, Room>;
  roomIds: string[];
  nodes: Record<string, Vec2>;
}

export const SNAP_ENDPOINT = 0.15;
export const DEFAULT_DOOR_WIDTH = 0.9;
export const DEFAULT_DOOR_HEIGHT = 2.1;
export const DEFAULT_WINDOW_WIDTH = 1.5;
export const DEFAULT_WINDOW_HEIGHT = 1.2;
export const DEFAULT_WINDOW_SILL = 0.9;
export const DEFAULT_OPENING_HEIGHT = 2.1;

export function createEmptyFloorPlan(): FloorPlan {
  return {
    settings: {
      name: '未命名户型',
      floorHeight: 2.8,
      defaultWallThickness: 0.24,
      defaultAlign: 'inner',
      autoRoom: true,
      autoJoin: true,
      orthoLocked: false,
    },
    walls: {},
    wallIds: [],
    openings: {},
    openingIds: [],
    rooms: {},
    roomIds: [],
    nodes: {},
  };
}

export function cloneFloorPlan(fp: FloorPlan): FloorPlan {
  return JSON.parse(JSON.stringify(fp)) as FloorPlan;
}

export function createWallSegment(
  start: Vec2,
  end: Vec2,
  settings: FloorPlanSettings,
  startNodeId: string,
  endNodeId: string,
): WallSegment {
  return {
    id: randomUUID(),
    start: { ...start },
    end: { ...end },
    thickness: settings.defaultWallThickness,
    height: settings.floorHeight,
    align: settings.defaultAlign,
    kind: 'nonBearing',
    startNodeId,
    endNodeId,
  };
}

export const WALL_ALIGN_CYCLE: WallAlign[] = ['inner', 'center', 'outer'];

export function nextWallAlign(current: WallAlign): WallAlign {
  const idx = WALL_ALIGN_CYCLE.indexOf(current);
  return WALL_ALIGN_CYCLE[(idx + 1) % WALL_ALIGN_CYCLE.length];
}
