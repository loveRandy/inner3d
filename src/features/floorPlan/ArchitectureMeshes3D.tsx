import { useMemo } from 'react';
import type { Opening, WallSegment } from '@/types/floorPlan';
import { ARCH_COLORS } from './architectureStyle';
import { getOpeningLayout3D } from './openingLayout3D';
import { SolidBoxWithEdges } from './MeshWithEdges';

function DoorMeshContent({
  width,
  height,
  thickness,
  innerSign,
}: {
  width: number;
  height: number;
  thickness: number;
  innerSign: number;
}) {
  const trim = 0.06;
  const frameW = width + trim * 2;
  const frameH = height + trim;
  const frameDepth = 0.055;
  const panelW = width * 0.9;
  const panelH = height * 0.94;
  const panelThick = 0.04;
  const faceZ = innerSign * (thickness * 0.5 + frameDepth * 0.45);

  return (
    <group>
      <SolidBoxWithEdges
        size={[frameW, frameH, frameDepth]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.55}
        position={[0, 0, faceZ]}
      />

      <SolidBoxWithEdges
        size={[panelW, panelH, panelThick]}
        color={ARCH_COLORS.doorPanel}
        roughness={0.5}
        position={[0, -height * 0.02, faceZ + innerSign * frameDepth * 0.35]}
      />

      <mesh
        position={[0, panelH * 0.22, faceZ + innerSign * (frameDepth * 0.35 + panelThick * 0.52)]}
      >
        <boxGeometry args={[panelW * 0.78, panelH * 0.38, 0.008]} />
        <meshStandardMaterial color={ARCH_COLORS.doorPanelRecess} roughness={0.65} />
      </mesh>
      <mesh
        position={[0, -panelH * 0.2, faceZ + innerSign * (frameDepth * 0.35 + panelThick * 0.52)]}
      >
        <boxGeometry args={[panelW * 0.78, panelH * 0.28, 0.008]} />
        <meshStandardMaterial color={ARCH_COLORS.doorPanelRecess} roughness={0.65} />
      </mesh>

      <mesh
        position={[panelW * 0.32, 0, faceZ + innerSign * (frameDepth * 0.35 + panelThick + 0.02)]}
        castShadow
      >
        <boxGeometry args={[0.1, 0.035, 0.03]} />
        <meshStandardMaterial color={ARCH_COLORS.handle} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh
        position={[panelW * 0.32, 0, faceZ + innerSign * (frameDepth * 0.35 + panelThick + 0.055)]}
        castShadow
      >
        <boxGeometry args={[0.018, 0.12, 0.018]} />
        <meshStandardMaterial color={ARCH_COLORS.handle} roughness={0.25} metalness={0.75} />
      </mesh>
    </group>
  );
}

function WindowMeshContent({ width, height, thickness }: { width: number; height: number; thickness: number }) {
  const frameThick = 0.06;
  const sillH = 0.04;
  const sillOut = 0.03;

  return (
    <group>
      <SolidBoxWithEdges
        size={[width, height, thickness]}
        color={ARCH_COLORS.windowFrame}
        roughness={0.45}
        metalness={0.08}
        edgeColor={ARCH_COLORS.windowFrame}
      />

      <mesh>
        <boxGeometry args={[width - frameThick * 2, height - frameThick * 2, thickness * 0.35]} />
        <meshStandardMaterial
          color={ARCH_COLORS.windowGlass}
          roughness={0.08}
          metalness={0.15}
          transparent
          opacity={0.72}
        />
      </mesh>

      <mesh>
        <boxGeometry args={[frameThick * 0.65, height - frameThick * 1.4, thickness * 0.5]} />
        <meshStandardMaterial color={ARCH_COLORS.windowFrame} roughness={0.4} metalness={0.1} />
      </mesh>

      <SolidBoxWithEdges
        size={[width + 0.04, sillH, thickness * 0.55]}
        color={ARCH_COLORS.windowFrame}
        roughness={0.45}
        metalness={0.08}
        edgeColor={ARCH_COLORS.windowFrame}
        position={[0, -height / 2 - sillH / 2, thickness * 0.15 + sillOut]}
      />
    </group>
  );
}

function OpeningPassageContent({ width, height, thickness }: { width: number; height: number; thickness: number }) {
  const jamb = 0.04;
  const topH = 0.05;
  const sillH = 0.035;

  return (
    <group>
      <SolidBoxWithEdges
        size={[jamb, height, thickness]}
        color={ARCH_COLORS.jamb}
        position={[-width / 2 + jamb / 2, 0, 0]}
      />
      <SolidBoxWithEdges
        size={[jamb, height, thickness]}
        color={ARCH_COLORS.jamb}
        position={[width / 2 - jamb / 2, 0, 0]}
      />
      <SolidBoxWithEdges
        size={[width, topH, thickness]}
        color={ARCH_COLORS.jamb}
        position={[0, height / 2 - topH / 2, 0]}
      />
      <mesh position={[0, -height / 2 + sillH / 2, thickness * 0.22]}>
        <boxGeometry args={[width, sillH, thickness * 0.75]} />
        <meshStandardMaterial color={ARCH_COLORS.threshold} roughness={0.75} metalness={0.05} />
      </mesh>
    </group>
  );
}

export function DoorMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const layout = useMemo(() => getOpeningLayout3D(wall, opening), [wall, opening]);

  return (
    <group position={layout.position} rotation={layout.rotation}>
      <DoorMeshContent
        width={layout.width}
        height={layout.height}
        thickness={layout.thickness}
        innerSign={layout.innerSign}
      />
    </group>
  );
}

export function WindowMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const layout = useMemo(() => getOpeningLayout3D(wall, opening), [wall, opening]);

  return (
    <group position={layout.position} rotation={layout.rotation}>
      <WindowMeshContent
        width={layout.width}
        height={layout.height}
        thickness={layout.thickness}
      />
    </group>
  );
}

export function OpeningPassageMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const layout = useMemo(() => getOpeningLayout3D(wall, opening), [wall, opening]);

  return (
    <group position={layout.position} rotation={layout.rotation}>
      <OpeningPassageContent
        width={layout.width}
        height={layout.height}
        thickness={layout.thickness}
      />
    </group>
  );
}
