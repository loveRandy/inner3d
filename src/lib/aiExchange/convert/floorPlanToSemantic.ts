import { SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION } from '@/lib/aiExchange/constants';
import { allocateRoomKey } from '@/lib/aiExchange/convert/roomKey';
import { getRoomDisplayName, ROOM_TYPE_LABELS } from '@/lib/aiExchange/taxonomy/roomTypeLabels';
import type {
  SemanticFloorPlanSource,
  SemanticFloorPlanV1,
  SemanticFixtureV1,
} from '@/lib/aiExchange/types/semanticFloorPlan';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import type { FloorPlan, RoomType } from '@/types/floorPlan';

export interface FloorPlanToSemanticOptions {
  source?: SemanticFloorPlanSource;
  title?: string;
  floorLevelLabel?: string;
  fixtures?: SemanticFixtureV1[];
}

export interface FloorPlanToSemanticResult {
  plan: SemanticFloorPlanV1;
  roomIdToKey: Map<string, string>;
}

export function floorPlanToSemantic(
  floorPlan: FloorPlan,
  options: FloorPlanToSemanticOptions = {},
): FloorPlanToSemanticResult {
  const wallIdToIndex = new Map<string, number>();
  const walls = floorPlan.wallIds.map((id, index) => {
    wallIdToIndex.set(id, index);
    const wall = floorPlan.walls[id];
    if (!wall) {
      throw new Error(`墙体 "${id}" 不存在`);
    }
    return {
      start: { x: wall.start.x, z: wall.start.z },
      end: { x: wall.end.x, z: wall.end.z },
      thickness: wall.thickness,
      height: wall.height,
      kind: wall.kind,
    };
  });

  const openings = floorPlan.openingIds
    .map((id) => {
      const opening = floorPlan.openings[id];
      if (!opening) return null;
      const wallIndex = wallIdToIndex.get(opening.wallId);
      if (wallIndex === undefined) return null;
      return {
        type: opening.type,
        wallIndex,
        offset: opening.offset,
        width: opening.width,
        height: opening.height,
        sillHeight: opening.sillHeight,
        flip: opening.flip,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  const keyCounters = new Map<string, number>();
  const roomIdToKey = new Map<string, string>();
  const rooms = floorPlan.roomIds.map((id) => {
    const room = floorPlan.rooms[id];
    if (!room) {
      throw new Error(`房间 "${id}" 不存在`);
    }
    const roomType: RoomType = room.roomType ?? 'unknown';
    const key = allocateRoomKey(roomType, keyCounters);
    roomIdToKey.set(id, key);
    const polygon = getRoomFloorPolygon(floorPlan, room);
    const labels = ROOM_TYPE_LABELS[roomType];
    return {
      key,
      roomType,
      name: room.name,
      nameZh: room.name || labels.nameZh,
      nameEn: labels.nameEn,
      polygon: polygon.map((p) => ({ x: p.x, z: p.z })),
      area: room.area,
    };
  });

  return {
    plan: {
      schemaVersion: SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION,
      meta: {
        title: options.title ?? floorPlan.settings.name,
        floorLevelLabel: options.floorLevelLabel,
        source: options.source ?? 'editor_export',
        locale: 'zh-CN',
        createdAt: new Date().toISOString(),
      },
      defaults: {
        wallThickness: floorPlan.settings.defaultWallThickness,
        wallHeight: floorPlan.settings.floorHeight,
        wallKind: 'nonBearing',
      },
      coordinateSystem: { unit: 'meter' },
      walls,
      openings,
      rooms,
      fixtures: options.fixtures,
    },
    roomIdToKey,
  };
}

export function buildRoomIdToKeyMap(floorPlan: FloorPlan): Map<string, string> {
  const keyCounters = new Map<string, number>();
  const map = new Map<string, string>();
  for (const id of floorPlan.roomIds) {
    const room = floorPlan.rooms[id];
    if (!room) continue;
    map.set(id, allocateRoomKey(room.roomType ?? 'unknown', keyCounters));
  }
  return map;
}

export function resolveRoomDisplayNameFromSemantic(
  roomType: RoomType,
  name?: string,
  nameZh?: string,
  nameEn?: string,
): string {
  return getRoomDisplayName(roomType, 'zh-CN', { name, nameZh, nameEn });
}
