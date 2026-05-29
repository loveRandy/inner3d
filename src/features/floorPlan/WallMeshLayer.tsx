import { useMemo } from 'react';
import type { FloorPlanSelection } from '@/types/floorPlan';
import type { Opening, WallSegment } from '@/types/floorPlan';
import { getWallQuad, wallAngleDeg, wallLength } from '@/lib/floorPlan/wallGeometry';
import { getOpeningsOnWall } from '@/lib/floorPlan/openingRender';
import { ARCH_COLORS } from './architectureStyle';
import { SolidBoxWithEdges } from './MeshWithEdges';
import {
  DoorMesh3D,
  OpeningPassageMesh3D,
  WindowMesh3D,
} from './ArchitectureMeshes3D';
import { WallSelectionOutline } from './WallSelectionOutline';

const BASEBOARD_H = 0.08;

function wallColor(kind: WallSegment['kind']) {
  return kind === 'bearing' ? ARCH_COLORS.wallBearing : ARCH_COLORS.wall;
}

/** 踢脚线：与墙段同变换，贴地放置 */
function WallBaseboard({ wall, t0, t1 }: { wall: WallSegment; t0: number; t1: number }) {
  const layout = useMemo(() => {
    const len = wallLength(wall);
    const quad = getWallQuad(wall);
    const [p0, p1, p2, p3] = quad;
    const lerp = (a: { x: number; z: number }, b: { x: number; z: number }, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
    });
    const q0 = lerp(p0, p1, t0);
    const q1 = lerp(p0, p1, t1);
    const q2 = lerp(p3, p2, t1);
    const q3 = lerp(p3, p2, t0);
    const cx = (q0.x + q1.x + q2.x + q3.x) / 4;
    const cz = (q0.z + q1.z + q2.z + q3.z) / 4;
    const angle = wallAngleDeg(wall) * (Math.PI / 180);
    const segLen = (t1 - t0) * len;

    return {
      position: [cx, BASEBOARD_H / 2, cz] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      size: [Math.max(segLen, 0.01), BASEBOARD_H, wall.thickness] as [number, number, number],
    };
  }, [wall, t0, t1]);

  return (
    <SolidBoxWithEdges
      size={layout.size}
      color={ARCH_COLORS.baseboard}
      roughness={0.88}
      position={layout.position}
      rotation={layout.rotation}
    />
  );
}

function WallBodyMesh({ wall, t0, t1 }: { wall: WallSegment; t0: number; t1: number }) {
  const layout = useMemo(() => {
    const len = wallLength(wall);
    const quad = getWallQuad(wall);
    const [p0, p1, p2, p3] = quad;
    const lerp = (a: { x: number; z: number }, b: { x: number; z: number }, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
    });
    const q0 = lerp(p0, p1, t0);
    const q1 = lerp(p0, p1, t1);
    const q2 = lerp(p3, p2, t1);
    const q3 = lerp(p3, p2, t0);
    const cx = (q0.x + q1.x + q2.x + q3.x) / 4;
    const cz = (q0.z + q1.z + q2.z + q3.z) / 4;
    const angle = wallAngleDeg(wall) * (Math.PI / 180);
    const segLen = (t1 - t0) * len;
    const mainH = Math.max(wall.height - BASEBOARD_H, 0.01);

    return {
      position: [cx, BASEBOARD_H + mainH / 2, cz] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      size: [Math.max(segLen, 0.01), mainH, wall.thickness] as [number, number, number],
      color: wallColor(wall.kind),
    };
  }, [wall, t0, t1]);

  return (
    <SolidBoxWithEdges
      size={layout.size}
      color={layout.color}
      roughness={0.82}
      position={layout.position}
      rotation={layout.rotation}
    />
  );
}

export function WallMesh({
  wall,
  openings,
  selected,
}: {
  wall: WallSegment;
  openings: Opening[];
  selected?: boolean;
}) {
  const len = wallLength(wall);

  const segments = useMemo(() => {
    if (openings.length === 0) return [{ t0: 0, t1: 1 }];
    const gaps = openings
      .map((o) => ({ t0: o.offset / len, t1: (o.offset + o.width) / len }))
      .sort((a, b) => a.t0 - b.t0);
    const solids: { t0: number; t1: number }[] = [];
    let cursor = 0;
    for (const g of gaps) {
      if (g.t0 > cursor + 0.001) solids.push({ t0: cursor, t1: g.t0 });
      cursor = Math.max(cursor, g.t1);
    }
    if (cursor < 1 - 0.001) solids.push({ t0: cursor, t1: 1 });
    return solids;
  }, [openings, len]);

  return (
    <>
      {segments.map((s, i) => (
        <group key={i}>
          <WallBodyMesh wall={wall} t0={s.t0} t1={s.t1} />
          <WallBaseboard wall={wall} t0={s.t0} t1={s.t1} />
        </group>
      ))}
      {selected && <WallSelectionOutline wall={wall} />}
    </>
  );
}

export function OpeningMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  if (opening.type === 'door') return <DoorMesh3D wall={wall} opening={opening} />;
  if (opening.type === 'window') return <WindowMesh3D wall={wall} opening={opening} />;
  if (opening.type === 'opening') return <OpeningPassageMesh3D wall={wall} opening={opening} />;
  return null;
}

export function WallMeshLayer({
  walls,
  wallIds,
  openings,
  openingIds,
  selection = [],
}: {
  walls: Record<string, WallSegment>;
  wallIds: string[];
  openings: Record<string, Opening>;
  openingIds: string[];
  selection?: FloorPlanSelection[];
}) {
  const selectedWalls = useMemo(
    () => new Set(selection.filter((s) => s.kind === 'wall').map((s) => s.id)),
    [selection],
  );

  return (
    <>
      {wallIds.map((id) => {
        const wall = walls[id];
        if (!wall) return null;
        const wallOpenings = getOpeningsOnWall(openings, openingIds, id);
        return (
          <WallMesh
            key={id}
            wall={wall}
            openings={wallOpenings}
            selected={selectedWalls.has(id)}
          />
        );
      })}
      {openingIds.map((id) => {
        const opening = openings[id];
        if (!opening) return null;
        const wall = walls[opening.wallId];
        if (!wall) return null;
        return <OpeningMesh3D key={id} wall={wall} opening={opening} />;
      })}
    </>
  );
}
