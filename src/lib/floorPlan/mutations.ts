import type { FloorPlan, FloorPlanSettings, Vec2, WallSegment } from '@/types/floorPlan';
import { createWallSegment } from '@/types/floorPlan';
import { mergeNodes, regenerateRooms, removeOrphansFromOpenings } from './roomDetection';
import { snapFloorPlanPoint } from './snap';

export function addWallSegmentToPlan(
  floorPlan: FloorPlan,
  start: Vec2,
  end: Vec2,
  gridSize: number,
): WallSegment | null {
  if (Math.hypot(end.x - start.x, end.z - start.z) < 0.05) return null;

  const startSnap = snapFloorPlanPoint(
    floorPlan,
    start,
    gridSize,
    floorPlan.settings.autoJoin,
  );
  const endSnap = snapFloorPlanPoint(floorPlan, end, gridSize, floorPlan.settings.autoJoin);

  const startNodeId = mergeNodes(floorPlan, startSnap.point, startSnap.nodeId);
  const endNodeId = mergeNodes(floorPlan, endSnap.point, endSnap.nodeId);
  if (startNodeId === endNodeId) return null;

  const wall = createWallSegment(
    floorPlan.nodes[startNodeId],
    floorPlan.nodes[endNodeId],
    floorPlan.settings,
    startNodeId,
    endNodeId,
  );

  floorPlan.walls[wall.id] = wall;
  floorPlan.wallIds.push(wall.id);

  if (floorPlan.settings.autoRoom) {
    Object.assign(floorPlan, regenerateRooms(floorPlan));
  }
  return wall;
}

export function addRectWallsToPlan(
  floorPlan: FloorPlan,
  cornerA: Vec2,
  cornerB: Vec2,
  gridSize: number,
): WallSegment[] {
  const minX = Math.min(cornerA.x, cornerB.x);
  const maxX = Math.max(cornerA.x, cornerB.x);
  const minZ = Math.min(cornerA.z, cornerB.z);
  const maxZ = Math.max(cornerA.z, cornerB.z);

  const corners: Vec2[] = [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];

  const walls: WallSegment[] = [];
  for (let i = 0; i < 4; i++) {
    const wall = addWallSegmentToPlan(floorPlan, corners[i], corners[(i + 1) % 4], gridSize);
    if (wall) walls.push(wall);
  }
  return walls;
}

export function updateWallEndpointInPlan(
  floorPlan: FloorPlan,
  wallId: string,
  end: 'start' | 'end',
  point: Vec2,
  gridSize: number,
): void {
  const wall = floorPlan.walls[wallId];
  if (!wall) return;

  const snap = snapFloorPlanPoint(floorPlan, point, gridSize, floorPlan.settings.autoJoin);
  const nodeId = mergeNodes(floorPlan, snap.point, snap.nodeId);

  if (end === 'start') {
    wall.startNodeId = nodeId;
    wall.start = { ...floorPlan.nodes[nodeId] };
  } else {
    wall.endNodeId = nodeId;
    wall.end = { ...floorPlan.nodes[nodeId] };
  }

  if (wall.startNodeId === wall.endNodeId) {
    delete floorPlan.walls[wallId];
    floorPlan.wallIds = floorPlan.wallIds.filter((id) => id !== wallId);
  }

  if (floorPlan.settings.autoRoom) {
    Object.assign(floorPlan, regenerateRooms(floorPlan));
  }
  removeOrphansFromOpenings(floorPlan);
}

export function removeFloorPlanSelection(
  floorPlan: FloorPlan,
  selection: { kind: 'wall' | 'opening' | 'room'; id: string }[],
): void {
  const wallIds = new Set(selection.filter((s) => s.kind === 'wall').map((s) => s.id));
  const openingIds = new Set(selection.filter((s) => s.kind === 'opening').map((s) => s.id));
  const roomIds = new Set(selection.filter((s) => s.kind === 'room').map((s) => s.id));

  for (const id of openingIds) {
    delete floorPlan.openings[id];
    floorPlan.openingIds = floorPlan.openingIds.filter((x) => x !== id);
  }

  for (const id of roomIds) {
    delete floorPlan.rooms[id];
    floorPlan.roomIds = floorPlan.roomIds.filter((x) => x !== id);
  }

  for (const id of wallIds) {
    delete floorPlan.walls[id];
    floorPlan.wallIds = floorPlan.wallIds.filter((x) => x !== id);
  }

  cleanupUnusedNodes(floorPlan);
  if (floorPlan.settings.autoRoom) {
    Object.assign(floorPlan, regenerateRooms(floorPlan));
  }
  removeOrphansFromOpenings(floorPlan);
}

function cleanupUnusedNodes(floorPlan: FloorPlan): void {
  const used = new Set<string>();
  for (const wall of Object.values(floorPlan.walls)) {
    used.add(wall.startNodeId);
    used.add(wall.endNodeId);
  }
  for (const nodeId of Object.keys(floorPlan.nodes)) {
    if (!used.has(nodeId)) delete floorPlan.nodes[nodeId];
  }
}

export function patchFloorPlanSettings(
  floorPlan: FloorPlan,
  patch: Partial<FloorPlanSettings>,
): void {
  Object.assign(floorPlan.settings, patch);
  if (floorPlan.settings.autoRoom) {
    Object.assign(floorPlan, regenerateRooms(floorPlan));
  }
}
