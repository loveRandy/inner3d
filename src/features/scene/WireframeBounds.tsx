import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, Vector3, type Group, type Object3D } from 'three';
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from 'three-stdlib';

const BOX_EDGES: [number, number][] = [
  [0, 1],
  [1, 3],
  [3, 2],
  [2, 0],
  [4, 5],
  [5, 7],
  [7, 6],
  [6, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

const UNIT_CORNERS: [number, number, number][] = [
  [-0.5, -0.5, -0.5],
  [0.5, -0.5, -0.5],
  [-0.5, -0.5, 0.5],
  [0.5, -0.5, 0.5],
  [-0.5, 0.5, -0.5],
  [0.5, 0.5, -0.5],
  [-0.5, 0.5, 0.5],
  [0.5, 0.5, 0.5],
];

interface ThickBoxWireframeProps {
  target?: Object3D | null | undefined;
  targets?: (Object3D | null | undefined)[];
  color?: string;
  lineWidth?: number;
}

function ThickBoxWireframe({
  target,
  targets,
  color = '#2563eb',
  lineWidth = 4,
}: ThickBoxWireframeProps) {
  const groupRef = useRef<Group>(null);
  const line2 = useMemo(() => new LineSegments2(), []);
  const box = useMemo(() => new Box3(), []);
  const tempBox = useMemo(() => new Box3(), []);
  const center = useMemo(() => new Vector3(), []);
  const size = useMemo(() => new Vector3(), []);
  const corner = useMemo(() => new Vector3(), []);
  const viewport = useThree((s) => s.size);

  const geometry = useMemo(() => new LineSegmentsGeometry(), []);
  const material = useMemo(() => {
    const mat = new LineMaterial({
      linewidth: lineWidth,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 1,
    });
    mat.color.set(color);
    return mat;
  }, [color, lineWidth]);

  useEffect(() => {
    line2.geometry = geometry;
    line2.material = material;
  }, [line2, geometry, material]);

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

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    box.makeEmpty();
    if (targets?.length) {
      for (const item of targets) {
        if (!item) continue;
        tempBox.setFromObject(item);
        if (!tempBox.isEmpty()) box.union(tempBox);
      }
    } else if (target) {
      box.setFromObject(target);
    }

    if (box.isEmpty()) {
      group.visible = false;
      return;
    }

    box.getCenter(center);
    box.getSize(size);
    const sx = Math.max(size.x, 0.02);
    const sy = Math.max(size.y, 0.02);
    const sz = Math.max(size.z, 0.02);

    const positions: number[] = [];
    for (const [a, b] of BOX_EDGES) {
      const ca = UNIT_CORNERS[a];
      const cb = UNIT_CORNERS[b];
      corner.set(center.x + ca[0] * sx, center.y + ca[1] * sy, center.z + ca[2] * sz);
      positions.push(corner.x, corner.y, corner.z);
      corner.set(center.x + cb[0] * sx, center.y + cb[1] * sy, center.z + cb[2] * sz);
      positions.push(corner.x, corner.y, corner.z);
    }

    geometry.setPositions(positions);
    line2.computeLineDistances();
    group.visible = true;
  });

  const hasTarget = Boolean(target) || Boolean(targets?.length);
  if (!hasTarget) return null;

  return (
    <group ref={groupRef} raycast={() => null}>
      <primitive object={line2} frustumCulled={false} />
    </group>
  );
}

interface WireframeBoundsProps {
  target: Object3D | null | undefined;
  color?: string;
  lineWidth?: number;
}

/** 纯线框包围盒（粗线） */
export function WireframeBounds({
  target,
  color = '#2563eb',
  lineWidth = 4,
}: WireframeBoundsProps) {
  return <ThickBoxWireframe target={target} color={color} lineWidth={lineWidth} />;
}

interface CombinedWireframeBoundsProps {
  targets: (Object3D | null | undefined)[];
  color?: string;
  lineWidth?: number;
}

/** 多选物体的合并包围盒线框 */
export function CombinedWireframeBounds({
  targets,
  color = '#ea580c',
  lineWidth = 4.5,
}: CombinedWireframeBoundsProps) {
  return <ThickBoxWireframe targets={targets} color={color} lineWidth={lineWidth} />;
}
