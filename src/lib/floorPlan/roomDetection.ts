import type { FloorPlan, Room, Vec2, WallSegment } from '@/types/floorPlan';
import { randomUUID } from '@/lib/id/randomUUID';
import { dist2d } from './wallGeometry';

function polygonArea(points: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].z - points[j].x * points[i].z;
  }
  return Math.abs(sum) / 2;
}

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
    const avg = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }),
      { x: 0, z: 0 },
    );
    return { x: avg.x / points.length, z: avg.z / points.length };
  }
  return { x: cx / (6 * area), z: cz / (6 * area) };
}

function sortEdgesAtNode(
  nodeId: string,
  walls: WallSegment[],
  nodes: Record<string, Vec2>,
): { wall: WallSegment; angle: number; otherNodeId: string }[] {
  const node = nodes[nodeId];
  if (!node) return [];
  const edges: { wall: WallSegment; angle: number; otherNodeId: string }[] = [];
  for (const wall of walls) {
    let otherNodeId: string | null = null;
    if (wall.startNodeId === nodeId) otherNodeId = wall.endNodeId;
    else if (wall.endNodeId === nodeId) otherNodeId = wall.startNodeId;
    if (!otherNodeId) continue;
    const other = nodes[otherNodeId];
    if (!other) continue;
    const angle = Math.atan2(other.z - node.z, other.x - node.x);
    edges.push({ wall, angle, otherNodeId });
  }
  edges.sort((a, b) => a.angle - b.angle);
  return edges;
}

function findNextWall(
  currentWall: WallSegment,
  atNodeId: string,
  walls: WallSegment[],
  nodes: Record<string, Vec2>,
): WallSegment | null {
  const edges = sortEdgesAtNode(atNodeId, walls, nodes);
  if (edges.length < 2) return null;

  const incomingIdx = edges.findIndex((e) => e.wall.id === currentWall.id);
  if (incomingIdx < 0) return null;

  const nextIdx = (incomingIdx - 1 + edges.length) % edges.length;
  return edges[nextIdx].wall;
}

function walkFace(
  startWall: WallSegment,
  startNodeId: string,
  walls: WallSegment[],
  nodes: Record<string, Vec2>,
): { wallIds: string[]; points: Vec2[] } | null {
  const wallIds: string[] = [];
  const points: Vec2[] = [];
  let currentWall = startWall;
  let atNode = startNodeId;
  const maxSteps = walls.length + 2;

  for (let step = 0; step < maxSteps; step++) {
    wallIds.push(currentWall.id);
    points.push(nodes[atNode] ?? currentWall.start);

    const nextNodeId =
      currentWall.startNodeId === atNode ? currentWall.endNodeId : currentWall.startNodeId;
    const nextWall = findNextWall(currentWall, nextNodeId, walls, nodes);
    if (!nextWall) return null;

    if (nextWall.id === startWall.id && nextNodeId === startNodeId) {
      return { wallIds, points };
    }

    atNode = nextNodeId;
    currentWall = nextWall;
  }
  return null;
}

function faceKey(wallIds: string[]): string {
  return [...wallIds].sort().join('|');
}

export function detectRooms(floorPlan: FloorPlan): Room[] {
  const walls = floorPlan.wallIds
    .map((id) => floorPlan.walls[id])
    .filter(Boolean) as WallSegment[];
  if (walls.length < 3) return [];

  const seen = new Set<string>();
  const rooms: Room[] = [];

  for (const wall of walls) {
    for (const startNodeId of [wall.startNodeId, wall.endNodeId]) {
      const face = walkFace(wall, startNodeId, walls, floorPlan.nodes);
      if (!face || face.wallIds.length < 3) continue;

      const area = polygonArea(face.points);
      if (area < 0.5) continue;

      const key = faceKey(face.wallIds);
      if (seen.has(key)) continue;
      seen.add(key);

      const existingName = findExistingRoomName(floorPlan, face.wallIds);
      rooms.push({
        id: randomUUID(),
        name: existingName ?? `房间 ${rooms.length + 1}`,
        wallLoop: face.wallIds,
        area,
        centroid: polygonCentroid(face.points),
      });
    }
  }

  return rooms.sort((a, b) => b.area - a.area);
}

function findExistingRoomName(floorPlan: FloorPlan, wallLoop: string[]): string | null {
  const key = faceKey(wallLoop);
  for (const room of Object.values(floorPlan.rooms)) {
    if (faceKey(room.wallLoop) === key) return room.name;
  }
  return null;
}

export function regenerateRooms(floorPlan: FloorPlan): Pick<FloorPlan, 'rooms' | 'roomIds'> {
  if (!floorPlan.settings.autoRoom) {
    return { rooms: {}, roomIds: [] };
  }
  const detected = detectRooms(floorPlan);
  const rooms: Record<string, Room> = {};
  const roomIds: string[] = [];
  for (const room of detected) {
    rooms[room.id] = room;
    roomIds.push(room.id);
  }
  return { rooms, roomIds };
}

export function removeOrphansFromOpenings(floorPlan: FloorPlan): void {
  for (const id of [...floorPlan.openingIds]) {
    const opening = floorPlan.openings[id];
    if (!opening || !floorPlan.walls[opening.wallId]) {
      delete floorPlan.openings[id];
      floorPlan.openingIds = floorPlan.openingIds.filter((x) => x !== id);
    }
  }
}

export function mergeNodes(
  floorPlan: FloorPlan,
  point: Vec2,
  existingNodeId: string | null,
): string {
  if (existingNodeId && floorPlan.nodes[existingNodeId]) {
    floorPlan.nodes[existingNodeId] = { ...point };
    return existingNodeId;
  }

  const nearest = Object.entries(floorPlan.nodes).find(
    ([, pos]) => dist2d(pos, point) < 0.001,
  );
  if (nearest) return nearest[0];

  const id = randomUUID();
  floorPlan.nodes[id] = { ...point };
  return id;
}
