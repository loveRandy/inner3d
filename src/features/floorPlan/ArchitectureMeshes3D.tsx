import { useMemo } from 'react';
import type { Opening, WallSegment } from '@/types/floorPlan';
import { ARCH_COLORS } from './architectureStyle';
import { getOpeningLayout3D } from './openingLayout3D';
import { getThroughWallMounts } from './openingMounts3D';
import { OverlayMesh, SolidBoxWithEdges } from './MeshWithEdges';

const RO = 10;

/** 门：套线贯穿墙厚，门头线内外各一层，门扇仅开向侧 */
function DoorAssembly3D({
  width,
  height,
  inner,
  outer,
  innerPush,
  outerPush,
  mid,
  span,
  leafOnInner,
}: {
  width: number;
  height: number;
  inner: number;
  outer: number;
  innerPush: number;
  outerPush: number;
  mid: number;
  span: number;
  leafOnInner: boolean;
}) {
  const trim = 0.06;
  const frameW = width + trim * 2;
  const frameH = height + trim;
  const fd = 0.055;
  const headH = 0.06;
  const headW = frameW + 0.06;
  const jambW = trim;
  const casing = { doubleSided: true as const, renderOrder: RO };

  const leafFace = leafOnInner ? inner : outer;
  const leafPush = leafOnInner ? innerPush : outerPush;
  const panelW = width * 0.9;
  const panelH = height * 0.94;
  const panelThick = 0.04;
  const panelZ = leafFace + leafPush * (fd * 0.4 + panelThick / 2);

  return (
    <group>
      {/* 左/右/上/下套线 — 贯穿墙厚 */}
      <SolidBoxWithEdges
        size={[jambW, frameH, span]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.55}
        position={[-width / 2 - jambW / 2, 0, mid]}
        {...casing}
      />
      <SolidBoxWithEdges
        size={[jambW, frameH, span]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.55}
        position={[width / 2 + jambW / 2, 0, mid]}
        {...casing}
      />
      <SolidBoxWithEdges
        size={[frameW, trim, span]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.55}
        position={[0, height / 2 + trim / 2, mid]}
        {...casing}
      />
      <SolidBoxWithEdges
        size={[frameW, trim * 0.85, span]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.55}
        position={[0, -height / 2 - trim * 0.42, mid]}
        {...casing}
      />

      {/* 内外门头线 */}
      <SolidBoxWithEdges
        size={[headW, headH, fd]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.5}
        position={[0, height / 2 + trim + headH / 2, inner + innerPush * fd * 0.55]}
        {...casing}
      />
      <SolidBoxWithEdges
        size={[headW, headH, fd]}
        color={ARCH_COLORS.doorFrame}
        roughness={0.5}
        position={[0, height / 2 + trim + headH / 2, outer + outerPush * fd * 0.55]}
        {...casing}
      />

      {/* 门扇 + 执手 */}
      <SolidBoxWithEdges
        size={[panelW, panelH, panelThick]}
        color={ARCH_COLORS.doorPanel}
        roughness={0.5}
        position={[0, -height * 0.02, panelZ]}
        doubleSided
        renderOrder={RO}
      />
      <OverlayMesh
        position={[0, panelH * 0.22, panelZ + leafPush * panelThick * 0.52]}
        color={ARCH_COLORS.doorPanelRecess}
        roughness={0.65}
        doubleSided
        renderOrder={RO}
      >
        <boxGeometry args={[panelW * 0.78, panelH * 0.38, 0.008]} />
      </OverlayMesh>
      <OverlayMesh
        position={[0, -panelH * 0.2, panelZ + leafPush * panelThick * 0.52]}
        color={ARCH_COLORS.doorPanelRecess}
        roughness={0.65}
        doubleSided
        renderOrder={RO}
      >
        <boxGeometry args={[panelW * 0.78, panelH * 0.28, 0.008]} />
      </OverlayMesh>
      <OverlayMesh
        position={[panelW * 0.32, 0, panelZ + leafPush * (panelThick / 2 + 0.04)]}
        color={ARCH_COLORS.handle}
        roughness={0.3}
        metalness={0.7}
        renderOrder={RO}
      >
        <boxGeometry args={[0.1, 0.035, 0.03]} />
      </OverlayMesh>
      <OverlayMesh
        position={[panelW * 0.32, 0, panelZ + leafPush * (panelThick / 2 + 0.075)]}
        color={ARCH_COLORS.handle}
        roughness={0.25}
        metalness={0.75}
        renderOrder={RO}
      >
        <boxGeometry args={[0.018, 0.12, 0.018]} />
      </OverlayMesh>
    </group>
  );
}

/** 窗：厚黑外框 + 双扇内框 + 竖梃 + 半透明玻璃（对齐参考图） */
function WindowPane3D({
  centerX,
  paneW,
  innerH,
  mid,
  innerDepth,
  glassDepth,
}: {
  centerX: number;
  paneW: number;
  innerH: number;
  mid: number;
  innerDepth: number;
  glassDepth: number;
}) {
  const innerFt = 0.032;
  const glassW = paneW - innerFt * 2;
  const glassH = innerH - innerFt * 2;
  const frame = {
    color: ARCH_COLORS.windowInnerFrame,
    roughness: 0.38,
    metalness: 0.12,
    hideEdges: true,
    renderOrder: RO,
  } as const;

  return (
    <group>
      <SolidBoxWithEdges
        size={[innerFt, innerH, innerDepth]}
        position={[centerX - paneW / 2 + innerFt / 2, 0, mid]}
        {...frame}
      />
      <SolidBoxWithEdges
        size={[innerFt, innerH, innerDepth]}
        position={[centerX + paneW / 2 - innerFt / 2, 0, mid]}
        {...frame}
      />
      <SolidBoxWithEdges
        size={[paneW, innerFt, innerDepth]}
        position={[centerX, innerH / 2 - innerFt / 2, mid]}
        {...frame}
      />
      <SolidBoxWithEdges
        size={[paneW, innerFt, innerDepth]}
        position={[centerX, -innerH / 2 + innerFt / 2, mid]}
        {...frame}
      />
      <mesh position={[centerX, 0, mid]} renderOrder={RO + 1}>
        <boxGeometry args={[glassW, glassH, glassDepth]} />
        <meshStandardMaterial
          color={ARCH_COLORS.windowGlass}
          roughness={0.06}
          metalness={0.04}
          transparent
          opacity={ARCH_COLORS.windowGlassOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function WindowAssembly3D({
  width,
  height,
  mid,
  span,
}: {
  width: number;
  height: number;
  mid: number;
  span: number;
}) {
  const outerFt = 0.09;
  const mullionW = 0.05;
  const innerW = width - outerFt * 2;
  const innerH = height - outerFt * 2;
  const paneW = (innerW - mullionW) / 2;
  const leftX = -(mullionW / 2 + paneW / 2);
  const rightX = mullionW / 2 + paneW / 2;
  const outerFrame = {
    color: ARCH_COLORS.windowFrame,
    roughness: 0.32,
    metalness: 0.15,
    hideEdges: true,
    renderOrder: RO,
  } as const;
  const innerDepth = span * 0.78;
  const glassDepth = span * 0.14;

  return (
    <group>
      {/* 外框：左 / 右 / 上 / 下 */}
      <SolidBoxWithEdges
        size={[outerFt, height, span]}
        position={[-width / 2 + outerFt / 2, 0, mid]}
        {...outerFrame}
      />
      <SolidBoxWithEdges
        size={[outerFt, height, span]}
        position={[width / 2 - outerFt / 2, 0, mid]}
        {...outerFrame}
      />
      <SolidBoxWithEdges
        size={[width, outerFt, span]}
        position={[0, height / 2 - outerFt / 2, mid]}
        {...outerFrame}
      />
      <SolidBoxWithEdges
        size={[width, outerFt, span]}
        position={[0, -height / 2 + outerFt / 2, mid]}
        {...outerFrame}
      />
      {/* 中梃 */}
      <SolidBoxWithEdges
        size={[mullionW, innerH, span * 0.82]}
        color={ARCH_COLORS.windowFrame}
        roughness={0.32}
        metalness={0.15}
        hideEdges
        position={[0, 0, mid]}
        renderOrder={RO}
      />
      {/* 双扇内框 + 玻璃 */}
      <WindowPane3D
        centerX={leftX}
        paneW={paneW}
        innerH={innerH}
        mid={mid}
        innerDepth={innerDepth}
        glassDepth={glassDepth}
      />
      <WindowPane3D
        centerX={rightX}
        paneW={paneW}
        innerH={innerH}
        mid={mid}
        innerDepth={innerDepth}
        glassDepth={glassDepth}
      />
    </group>
  );
}

function OpeningPassageReveal({
  width,
  height,
  thickness,
}: {
  width: number;
  height: number;
  thickness: number;
}) {
  const jamb = 0.045;
  const topH = 0.045;
  const sillH = 0.035;

  return (
    <group>
      <SolidBoxWithEdges
        size={[jamb, height, thickness]}
        color={ARCH_COLORS.jamb}
        position={[-width / 2 + jamb / 2, 0, 0]}
        renderOrder={RO}
      />
      <SolidBoxWithEdges
        size={[jamb, height, thickness]}
        color={ARCH_COLORS.jamb}
        position={[width / 2 - jamb / 2, 0, 0]}
        renderOrder={RO}
      />
      <SolidBoxWithEdges
        size={[width, topH, thickness]}
        color={ARCH_COLORS.jamb}
        position={[0, height / 2 - topH / 2, 0]}
        renderOrder={RO}
      />
      <OverlayMesh
        position={[0, -height / 2 + sillH / 2, thickness * 0.18]}
        color={ARCH_COLORS.threshold}
        roughness={0.75}
        metalness={0.05}
        renderOrder={RO}
      >
        <boxGeometry args={[width, sillH, thickness * 0.72]} />
      </OverlayMesh>
    </group>
  );
}

export function DoorMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const layout = useMemo(() => getOpeningLayout3D(wall, opening), [wall, opening]);
  const mounts = useMemo(() => getThroughWallMounts(layout, 0.055), [layout]);
  const leafOnInner = !opening.flip;

  return (
    <group position={layout.position} rotation={layout.rotation} renderOrder={RO}>
      <DoorAssembly3D
        width={layout.width}
        height={layout.height}
        leafOnInner={leafOnInner}
        {...mounts}
      />
    </group>
  );
}

export function WindowMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const layout = useMemo(() => getOpeningLayout3D(wall, opening), [wall, opening]);
  const { mid, span } = useMemo(() => getThroughWallMounts(layout, 0.055), [layout]);

  return (
    <group position={layout.position} rotation={layout.rotation} renderOrder={RO}>
      <WindowAssembly3D width={layout.width} height={layout.height} mid={mid} span={span} />
    </group>
  );
}

export function OpeningPassageMesh3D({ wall, opening }: { wall: WallSegment; opening: Opening }) {
  const layout = useMemo(() => getOpeningLayout3D(wall, opening), [wall, opening]);

  return (
    <group position={layout.position} rotation={layout.rotation} renderOrder={RO}>
      <OpeningPassageReveal
        width={layout.width}
        height={layout.height}
        thickness={layout.thickness}
      />
    </group>
  );
}
