import type { Opening, OpeningType, Vec2, WallSegment } from '@/types/floorPlan';
import {
  getWallQuad,
  pointOnWallAtOffset,
  projectPointOnWall,
  wallInnerNormal,
  wallLength,
} from './wallGeometry';
import { clampOpeningOffset, defaultOpeningSize } from './openingPlacement';

export function getOpeningsOnWall(
  openings: Record<string, Opening>,
  openingIds: string[],
  wallId: string,
): Opening[] {
  return openingIds
    .map((id) => openings[id])
    .filter((o): o is Opening => !!o && o.wallId === wallId)
    .sort((a, b) => a.offset - b.offset);
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

function quadSlice(
  quad: [Vec2, Vec2, Vec2, Vec2],
  t0: number,
  t1: number,
): [Vec2, Vec2, Vec2, Vec2] {
  const [p0, p1, p2, p3] = quad;
  return [
    lerpVec2(p0, p1, t0),
    lerpVec2(p0, p1, t1),
    lerpVec2(p3, p2, t1),
    lerpVec2(p3, p2, t0),
  ];
}

import { getWallCutOpenings } from './wallSolidParts';

/** 墙体扣除门洞/窗洞后的实心四边形列表（2D 用） */
export function getWallSolidQuads(
  wall: WallSegment,
  openings: Opening[],
): [Vec2, Vec2, Vec2, Vec2][] {
  return getWallSolidQuadsForCut(wall, getWallCutOpenings(openings));
}

function getWallSolidQuadsForCut(
  wall: WallSegment,
  cutOpenings: Opening[],
): [Vec2, Vec2, Vec2, Vec2][] {
  const len = wallLength(wall);
  if (len < 1e-6) return [];

  const quad = getWallQuad(wall);
  const gaps = cutOpenings
    .map((o) => ({
      t0: Math.max(0, o.offset / len),
      t1: Math.min(1, (o.offset + o.width) / len),
    }))
    .filter((g) => g.t1 > g.t0 + 0.001)
    .sort((a, b) => a.t0 - b.t0);

  const solids: { t0: number; t1: number }[] = [];
  let cursor = 0;
  for (const g of gaps) {
    if (g.t0 > cursor + 0.001) solids.push({ t0: cursor, t1: g.t0 });
    cursor = Math.max(cursor, g.t1);
  }
  if (cursor < 1 - 0.001) solids.push({ t0: cursor, t1: 1 });

  if (solids.length === 0) return [quad];
  return solids.map((s) => quadSlice(quad, s.t0, s.t1));
}

export function buildPreviewOpening(
  wall: WallSegment,
  type: OpeningType,
  pickPoint: Vec2,
): Opening {
  const defaults = defaultOpeningSize(type);
  const len = wallLength(wall);
  const proj = projectPointOnWall(wall, pickPoint);
  const offset = clampOpeningOffset(len, defaults.width, proj.offset);

  return {
    id: '__preview__',
    type,
    wallId: wall.id,
    offset,
    width: defaults.width,
    height: defaults.height,
    sillHeight: defaults.sillHeight,
    flip: false,
  };
}

export interface DoorSymbol2D {
  hinge: Vec2;
  leafEnd: Vec2;
  frameEnd: Vec2;
  arcPath: string;
  leafLine: [Vec2, Vec2];
}

export function getDoorSymbol2D(wall: WallSegment, opening: Opening): DoorSymbol2D {
  const hinge = pointOnWallAtOffset(wall, opening.offset);
  const frameEnd = pointOnWallAtOffset(wall, opening.offset + opening.width);
  const normal = wallInnerNormal(wall);
  const sign = opening.flip ? -1 : 1;
  const nx = normal.x * sign;
  const nz = normal.z * sign;

  const leafEnd: Vec2 = {
    x: hinge.x + nx * opening.width,
    z: hinge.z + nz * opening.width,
  };

  const radius = opening.width;
  const startAngle = Math.atan2(leafEnd.z - hinge.z, leafEnd.x - hinge.x);
  const endAngle = Math.atan2(frameEnd.z - hinge.z, frameEnd.x - hinge.x);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;

  const arcPath = [
    `M ${leafEnd.x} ${leafEnd.z}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${frameEnd.x} ${frameEnd.z}`,
  ].join(' ');

  return {
    hinge,
    leafEnd,
    frameEnd,
    arcPath,
    leafLine: [hinge, leafEnd],
  };
}

export interface WindowSymbol2D {
  corners: [Vec2, Vec2, Vec2, Vec2];
}

export function getWindowSymbol2D(wall: WallSegment, opening: Opening): WindowSymbol2D {
  const p0 = pointOnWallAtOffset(wall, opening.offset);
  const p1 = pointOnWallAtOffset(wall, opening.offset + opening.width);
  const normal = wallInnerNormal(wall);
  const depth = wall.thickness * 0.35;
  const n = { x: normal.x * depth, z: normal.z * depth };
  return {
    corners: [
      p0,
      p1,
      { x: p1.x + n.x, z: p1.z + n.z },
      { x: p0.x + n.x, z: p0.z + n.z },
    ],
  };
}

export interface OpeningDimensions {
  leftMm: number;
  rightMm: number;
  widthMm: number;
  hinge: Vec2;
  openingStart: Vec2;
  openingEnd: Vec2;
  wallStart: Vec2;
  wallEnd: Vec2;
}

export function getOpeningDimensions(
  wall: WallSegment,
  opening: Opening,
): OpeningDimensions {
  const len = wallLength(wall);
  return {
    leftMm: Math.round(opening.offset * 1000),
    rightMm: Math.round((len - opening.offset - opening.width) * 1000),
    widthMm: Math.round(opening.width * 1000),
    hinge: pointOnWallAtOffset(wall, opening.offset),
    openingStart: pointOnWallAtOffset(wall, opening.offset),
    openingEnd: pointOnWallAtOffset(wall, opening.offset + opening.width),
    wallStart: wall.start,
    wallEnd: wall.end,
  };
}

