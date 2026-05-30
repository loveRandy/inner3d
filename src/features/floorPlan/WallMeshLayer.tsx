import { useMemo } from 'react';
import type { FloorPlanSelection, Opening, WallSegment } from '@/types/floorPlan';
import { getWallQuad, wallAngleDeg, wallLength } from '@/lib/floorPlan/wallGeometry';
import { getOpeningsOnWall } from '@/lib/floorPlan/openingRender';
import {
  BASEBOARD_H,
  getWallCutOpenings,
  getWallSolidParts,
} from '@/lib/floorPlan/wallSolidParts';
import { ARCH_COLORS } from './architectureStyle';
import { SolidBoxWithEdges } from './MeshWithEdges';
import {
  DoorMesh3D,
  OpeningPassageMesh3D,
  WindowMesh3D,
} from './ArchitectureMeshes3D';
import { WallSelectionOutline } from './WallSelectionOutline';

function wallColor(kind: WallSegment['kind']) {
  return kind === 'bearing' ? ARCH_COLORS.wallBearing : ARCH_COLORS.wall;
}

function useWallPartLayout(
  wall: WallSegment,
  t0: number,
  t1: number,
  y0: number,
  y1: number,
) {
  return useMemo(() => {
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
    const partH = Math.max(y1 - y0, 0.01);

    return {
      position: [cx, y0 + partH / 2, cz] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      size: [Math.max(segLen, 0.01), partH, wall.thickness] as [number, number, number],
    };
  }, [wall, t0, t1, y0, y1]);
}

function WallPartMesh({
  wall,
  t0,
  t1,
  y0,
  y1,
  color,
}: {
  wall: WallSegment;
  t0: number;
  t1: number;
  y0: number;
  y1: number;
  color: string;
}) {
  const layout = useWallPartLayout(wall, t0, t1, y0, y1);
  const isBaseboard = y1 <= BASEBOARD_H + 0.001;

  return (
    <SolidBoxWithEdges
      size={layout.size}
      color={color}
      roughness={isBaseboard ? 0.88 : 0.78}
      position={layout.position}
      rotation={layout.rotation}
      renderOrder={0}
      overlay={!isBaseboard}
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
  const cutOpenings = useMemo(() => getWallCutOpenings(openings), [openings]);
  const parts = useMemo(
    () => getWallSolidParts(wall, cutOpenings),
    [wall, cutOpenings],
  );
  const color = wallColor(wall.kind);
  const baseColor = ARCH_COLORS.baseboard;

  return (
    <>
      {parts.map((part, i) => (
        <WallPartMesh
          key={i}
          wall={wall}
          t0={part.t0}
          t1={part.t1}
          y0={part.y0}
          y1={part.y1}
          color={part.y1 <= BASEBOARD_H + 0.001 ? baseColor : color}
        />
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
