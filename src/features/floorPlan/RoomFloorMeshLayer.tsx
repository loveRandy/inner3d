import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line2, LineGeometry, LineMaterial } from 'three-stdlib';
import type { ThreeEvent } from '@react-three/fiber';
import type { FloorPlan, Vec2 } from '@/types/floorPlan';
import { DEFAULT_FLOOR_PRESET_ID } from '@/types/platformDesign';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import {
  getFloorMaterialProps,
  getFloorMaterialRepeat,
} from '@/lib/platformDesign/floorMaterialRender';
import { getFloorMaterialPresetById } from '@/features/platformDesign/floorMaterials';

const FLOOR_Y = 0.03;
const FLOOR_OUTLINE_Y = FLOOR_Y + 0.015;
const FLOOR_OUTLINE_RENDER_ORDER = 9999;

const OUTLINE_STYLE = {
  hover: { color: '#60a5fa', lineWidth: 4 },
  selected: { color: '#38bdf8', lineWidth: 6 },
} as const;

function buildLoopPositions(points: Vec2[]): number[] {
  const positions: number[] = [];
  for (const p of points) {
    positions.push(p.x, FLOOR_OUTLINE_Y, p.z);
  }
  if (points.length > 0) {
    positions.push(points[0].x, FLOOR_OUTLINE_Y, points[0].z);
  }
  return positions;
}

function FloorOutlineHighlight({
  points,
  emphasis,
}: {
  points: Vec2[];
  emphasis: 'hover' | 'selected';
}) {
  const viewport = useThree((s) => s.size);
  const style = OUTLINE_STYLE[emphasis];

  const line2 = useMemo(() => {
    const line = new Line2();
    line.frustumCulled = false;
    line.renderOrder = FLOOR_OUTLINE_RENDER_ORDER;
    return line;
  }, []);

  const geometry = useMemo(() => new LineGeometry(), []);
  const material = useMemo(() => {
    const mat = new LineMaterial({
      linewidth: style.lineWidth,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 1,
    });
    mat.color.set(style.color);
    return mat;
  }, [style.color, style.lineWidth]);

  const positions = useMemo(() => buildLoopPositions(points), [points]);

  useEffect(() => {
    geometry.setPositions(positions);
    line2.geometry = geometry;
    line2.material = material;
    line2.computeLineDistances();
  }, [line2, geometry, material, positions]);

  useEffect(() => {
    material.resolution.set(viewport.width, viewport.height);
  }, [material, viewport.width, viewport.height]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <primitive object={line2} raycast={() => null} />;
}

function polygonSignedAreaXZ(points: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].z - points[j].x * points[i].z;
  }
  return sum * 0.5;
}

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

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of ordered) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    pos.setXYZ(i, x, FLOOR_Y, z);
    uvs[i * 2] = x - minX;
    uvs[i * 2 + 1] = z - minZ;
  }
  pos.needsUpdate = true;
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function RoomFloorMesh({
  points,
  presetId,
  selected,
  hovered,
  interactive,
  onSelect,
  onHover,
  onUnhover,
}: {
  points: Vec2[];
  presetId: string;
  selected?: boolean;
  hovered?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
  onHover?: () => void;
  onUnhover?: () => void;
}) {
  const geometry = useMemo(() => createFloorGeometry(points), [points]);
  const preset = getFloorMaterialPresetById(presetId);
  const materialProps = useMemo(() => getFloorMaterialProps(presetId), [presetId]);
  const repeat = useMemo(() => getFloorMaterialRepeat(preset), [preset]);

  const bbox = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    return { width: Math.max(maxX - minX, 0.1), depth: Math.max(maxZ - minZ, 0.1) };
  }, [points]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: materialProps.map,
      color: materialProps.color,
      roughness: materialProps.roughness,
      metalness: materialProps.metalness,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    if (mat.map) {
      mat.map = mat.map.clone();
      mat.map.wrapS = THREE.RepeatWrapping;
      mat.map.wrapT = THREE.RepeatWrapping;
      mat.map.repeat.set(
        Math.max(bbox.width / repeat.x, 1),
        Math.max(bbox.depth / repeat.z, 1),
      );
      mat.map.needsUpdate = true;
    }
    return mat;
  }, [materialProps, bbox.width, bbox.depth, repeat.x, repeat.z]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || e.button !== 0) return;
    e.stopPropagation();
    onSelect?.();
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    onHover?.();
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    onUnhover?.();
  };

  const showOutline = selected || hovered;
  const outlineEmphasis = selected ? 'selected' : 'hover';

  return (
    <group>
      <mesh
        geometry={geometry}
        receiveShadow
        renderOrder={5}
        onPointerDown={interactive ? handlePointerDown : undefined}
        onPointerEnter={interactive ? handlePointerEnter : undefined}
        onPointerLeave={interactive ? handlePointerLeave : undefined}
      >
        <meshStandardMaterial
          map={material.map}
          color={material.color}
          roughness={material.roughness}
          metalness={material.metalness}
          side={material.side}
          depthWrite={material.depthWrite}
        />
      </mesh>
      {showOutline && (
        <FloorOutlineHighlight points={points} emphasis={outlineEmphasis} />
      )}
    </group>
  );
}

export function RoomFloorMeshLayer({
  floorPlan,
  presetOverrides,
  roomFilter,
  selectedRoomId,
  interactive,
  onSelectRoom,
}: {
  floorPlan: FloorPlan;
  presetOverrides?: Record<string, string>;
  roomFilter?: Set<string>;
  selectedRoomId?: string | null;
  interactive?: boolean;
  onSelectRoom?: (roomId: string) => void;
}) {
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const meshes = useMemo(() => {
    return floorPlan.roomIds
      .map((id) => {
        if (roomFilter && !roomFilter.has(id)) return null;
        const room = floorPlan.rooms[id];
        if (!room) return null;
        const polygon = getRoomFloorPolygon(floorPlan, room);
        if (polygon.length < 3) return null;
        const presetId =
          presetOverrides?.[id] ?? room.floorMaterial?.presetId ?? DEFAULT_FLOOR_PRESET_ID;
        return { id, polygon, presetId };
      })
      .filter(Boolean) as { id: string; polygon: Vec2[]; presetId: string }[];
  }, [floorPlan, presetOverrides, roomFilter]);

  if (meshes.length === 0) return null;

  return (
    <>
      {meshes.map(({ id, polygon, presetId }) => (
        <RoomFloorMesh
          key={`${id}-${presetId}`}
          points={polygon}
          presetId={presetId}
          selected={selectedRoomId === id}
          hovered={hoveredRoomId === id}
          interactive={interactive}
          onSelect={() => onSelectRoom?.(id)}
          onHover={() => setHoveredRoomId(id)}
          onUnhover={() => setHoveredRoomId((current) => (current === id ? null : current))}
        />
      ))}
    </>
  );
}
