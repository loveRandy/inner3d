import { getFixtureCategoryForAssetId } from '@/lib/aiExchange/taxonomy/fixtureAssetMap';
import type { SemanticFixtureV1 } from '@/lib/aiExchange/types/semanticFloorPlan';
import { getEntityFootprintCorners } from '@/lib/floorPlan/modelPick';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import { footprintCenter } from '@/lib/scene/modelFootprint';
import { pointInPolygon } from '@/lib/scene/modelFootprint';
import type { FloorPlan } from '@/types/floorPlan';
import type { SceneEntity } from '@/types/scene';
import type { ModelFootprint } from '@/lib/scene/modelFootprint';

export function findRoomKeyAtPoint(
  floorPlan: FloorPlan,
  point: { x: number; z: number },
  roomIdToKey: Map<string, string>,
): string | undefined {
  for (const roomId of floorPlan.roomIds) {
    const room = floorPlan.rooms[roomId];
    if (!room) continue;
    const polygon = getRoomFloorPolygon(floorPlan, room);
    if (polygon.length >= 3 && pointInPolygon(point, polygon)) {
      return roomIdToKey.get(roomId);
    }
  }
  return undefined;
}

export function entitiesToFixtures(
  floorPlan: FloorPlan,
  entities: Record<string, SceneEntity>,
  rootIds: string[],
  footprints: Record<string, ModelFootprint | undefined>,
  roomIdToKey: Map<string, string>,
): SemanticFixtureV1[] {
  const fixtures: SemanticFixtureV1[] = [];

  for (const entityId of rootIds) {
    const entity = entities[entityId];
    if (!entity || entity.type !== 'model') continue;

    const corners = getEntityFootprintCorners(
      entityId,
      entities,
      footprints as Record<string, ModelFootprint>,
    );
    const center =
      corners.length >= 3
        ? footprintCenter(corners)
        : { x: entity.transform.position.x, z: entity.transform.position.z };

    fixtures.push({
      category: getFixtureCategoryForAssetId(entity.assetId ?? ''),
      roomKey: findRoomKeyAtPoint(floorPlan, center, roomIdToKey),
      position: { x: center.x, z: center.z },
      rotationDeg: (entity.transform.rotation.y * 180) / Math.PI,
      label: entity.name,
    });
  }

  return fixtures;
}
