import { resolveRoomDisplayNameFromSemantic } from '@/lib/aiExchange/convert/floorPlanToSemantic';
import type {
  SemanticFloorPlanV1,
  SemanticOpeningV1,
  SemanticRoomV1,
  SemanticWallV1,
} from '@/lib/aiExchange/types/semanticFloorPlan';
import {
  clampOpeningOffset,
  defaultOpeningSize,
} from '@/lib/floorPlan/openingPlacement';
import { mergeNodes, regenerateRooms } from '@/lib/floorPlan/roomDetection';
import { dist2d, wallLength } from '@/lib/floorPlan/wallGeometry';
import { randomUUID } from '@/lib/id/randomUUID';
import {
  createEmptyFloorPlan,
  createWallSegment,
  type FloorPlan,
  type FloorPlanSettings,
  type Opening,
  type Vec2,
} from '@/types/floorPlan';

const MIN_WALL_LENGTH_M = 0.1;
const ROOM_MATCH_MAX_DIST_M = 3;

function polygonCentroid(points: Vec2[]): Vec2 {
  let cx = 0;
  let cz = 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].z - points[j].x * points[i].z;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cz += (points[i].z + points[j].z) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const avg = points.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
    return { x: avg.x / points.length, z: avg.z / points.length };
  }
  return { x: cx / (6 * area), z: cz / (6 * area) };
}

function addWallFromSemantic(
  floorPlan: FloorPlan,
  wall: SemanticWallV1,
  defaults: SemanticFloorPlanV1['defaults'],
): string | null {
  const len = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  if (len < MIN_WALL_LENGTH_M) return null;

  const startNodeId = mergeNodes(floorPlan, wall.start, null);
  const endNodeId = mergeNodes(floorPlan, wall.end, null);
  if (startNodeId === endNodeId) return null;

  const segment = createWallSegment(
    floorPlan.nodes[startNodeId],
    floorPlan.nodes[endNodeId],
    floorPlan.settings,
    startNodeId,
    endNodeId,
  );

  segment.thickness = wall.thickness ?? defaults.wallThickness;
  segment.height = wall.height ?? defaults.wallHeight;
  segment.kind = wall.kind ?? defaults.wallKind;

  floorPlan.walls[segment.id] = segment;
  floorPlan.wallIds.push(segment.id);
  return segment.id;
}

function addOpeningFromSemantic(
  floorPlan: FloorPlan,
  wallId: string,
  opening: SemanticOpeningV1,
): Opening | null {
  const wall = floorPlan.walls[wallId];
  if (!wall) return null;

  const defaults = defaultOpeningSize(opening.type);
  const width = opening.width ?? defaults.width;
  const height = opening.height ?? defaults.height;
  const sillHeight = opening.sillHeight ?? defaults.sillHeight;
  const len = wallLength(wall);
  const offset = clampOpeningOffset(len, width, opening.offset + width / 2);

  const entity: Opening = {
    id: randomUUID(),
    type: opening.type,
    wallId,
    offset,
    width,
    height,
    sillHeight,
    flip: opening.flip ?? false,
  };

  floorPlan.openings[entity.id] = entity;
  floorPlan.openingIds.push(entity.id);
  return entity;
}

function applySemanticRoomMetadata(floorPlan: FloorPlan, semanticRooms: SemanticRoomV1[]): void {
  if (semanticRooms.length === 0 || floorPlan.roomIds.length === 0) return;

  const detected = floorPlan.roomIds
    .map((id) => floorPlan.rooms[id])
    .filter((r): r is NonNullable<typeof r> => !!r);

  const assigned = new Set<string>();

  for (const sr of semanticRooms) {
    const targetCentroid =
      sr.polygon.length >= 3
        ? polygonCentroid(sr.polygon.map((p) => ({ x: p.x, z: p.z })))
        : null;

    let bestId: string | null = null;
    let bestDist = Infinity;

    for (const room of detected) {
      if (assigned.has(room.id)) continue;
      const dist = targetCentroid
        ? dist2d(room.centroid, targetCentroid)
        : dist2d(room.centroid, { x: 0, z: 0 });
      if (dist < bestDist) {
        bestDist = dist;
        bestId = room.id;
      }
    }

    if (!bestId || (targetCentroid && bestDist > ROOM_MATCH_MAX_DIST_M)) continue;

    assigned.add(bestId);
    const room = floorPlan.rooms[bestId];
    if (!room) continue;

    room.roomType = sr.roomType;
    room.name = resolveRoomDisplayNameFromSemantic(sr.roomType, sr.name, sr.nameZh, sr.nameEn);
  }
}

/**
 * 将 SemanticFloorPlanV1 转为编辑器 FloorPlan（生成新 UUID）。
 */
export function semanticToFloorPlan(
  semantic: SemanticFloorPlanV1,
  baseSettings?: Partial<FloorPlanSettings>,
): FloorPlan {
  const floorPlan = createEmptyFloorPlan();

  if (baseSettings) {
    Object.assign(floorPlan.settings, baseSettings);
  }

  floorPlan.settings.name = semantic.meta.title ?? floorPlan.settings.name;
  floorPlan.settings.defaultWallThickness = semantic.defaults.wallThickness;
  floorPlan.settings.floorHeight = semantic.defaults.wallHeight;
  floorPlan.settings.autoRoom = true;

  const wallIdsByIndex: string[] = [];

  for (const wall of semantic.walls) {
    const wallId = addWallFromSemantic(floorPlan, wall, semantic.defaults);
    wallIdsByIndex.push(wallId ?? '');
  }

  for (const opening of semantic.openings) {
    const wallId = wallIdsByIndex[opening.wallIndex];
    if (!wallId) continue;
    addOpeningFromSemantic(floorPlan, wallId, opening);
  }

  if (floorPlan.settings.autoRoom) {
    const { rooms, roomIds } = regenerateRooms(floorPlan);
    floorPlan.rooms = rooms;
    floorPlan.roomIds = roomIds;
  }

  applySemanticRoomMetadata(floorPlan, semantic.rooms);

  return floorPlan;
}
