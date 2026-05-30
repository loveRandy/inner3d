import { useMemo } from 'react';
import * as THREE from 'three';
import type { FloorPlan, Vec2 } from '@/types/floorPlan';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import {
  FLOOR_PLANK_WORLD_H,
  FLOOR_PLANK_WORLD_W,
  getWoodFloorTexture,
} from '@/lib/floorPlan/woodFloorTexture';

const FLOOR_Y = 0.03;

function polygonSignedAreaXZ(points: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].z - points[j].x * points[i].z;
  }
  return sum * 0.5;
}

/** 在 XZ 平面生成地板几何（Shape 在 XY 上绘制后映射到 world XZ） */
function createFloorGeometry(points: Vec2[]): THREE.BufferGeometry {
  const ordered = polygonSignedAreaXZ(points) < 0 ? [...points].reverse() : points;

  const shape = new THREE.Shape();
  shape.moveTo(ordered[0].x, ordered[0].z);
  for (let i = 1; i < ordered.length; i++) {
    shape.lineTo(ordered[i].x, ordered[i].z);
  }
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const uvs = new Float32Array(pos.count * 2);
  const uScale = 1 / FLOOR_PLANK_WORLD_W;
  const vScale = 1 / FLOOR_PLANK_WORLD_H;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    pos.setXYZ(i, x, FLOOR_Y, z);
    uvs[i * 2] = x * uScale;
    uvs[i * 2 + 1] = z * vScale;
  }
  pos.needsUpdate = true;
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function RoomFloorMesh({ points }: { points: Vec2[] }) {
  const geometry = useMemo(() => createFloorGeometry(points), [points]);
  const woodTexture = useMemo(() => getWoodFloorTexture(), []);

  return (
    <mesh geometry={geometry} receiveShadow renderOrder={5}>
      <meshStandardMaterial
        map={woodTexture}
        color="#ffffff"
        roughness={0.88}
        metalness={0.02}
        side={THREE.DoubleSide}
        depthWrite
      />
    </mesh>
  );
}

export function RoomFloorMeshLayer({
  floorPlan,
}: {
  floorPlan: FloorPlan;
}) {
  const meshes = useMemo(() => {
    return floorPlan.roomIds
      .map((id) => {
        const room = floorPlan.rooms[id];
        if (!room) return null;
        const polygon = getRoomFloorPolygon(floorPlan, room);
        if (polygon.length < 3) return null;
        return { id, polygon };
      })
      .filter(Boolean) as { id: string; polygon: Vec2[] }[];
  }, [floorPlan]);

  if (meshes.length === 0) return null;

  return (
    <>
      {meshes.map(({ id, polygon }) => (
        <RoomFloorMesh key={id} points={polygon} />
      ))}
    </>
  );
}
