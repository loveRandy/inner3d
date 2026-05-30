import { Edges } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { ARCH_COLORS } from './architectureStyle';

type BoxProps = ThreeElements['mesh'] & {
  size: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  edgeColor?: string;
  opacity?: number;
  transparent?: boolean;
  hideEdges?: boolean;
  /** 叠加在墙面上时使用，避免深度冲突 */
  overlay?: boolean;
  /** 双面渲染，确保内外墙都能看到 */
  doubleSided?: boolean;
  renderOrder?: number;
};

export function SolidBoxWithEdges({
  size,
  color,
  roughness = 0.75,
  metalness = 0.03,
  edgeColor = ARCH_COLORS.edge,
  opacity,
  transparent,
  overlay = false,
  doubleSided = false,
  hideEdges = false,
  renderOrder,
  ...meshProps
}: BoxProps) {
  return (
    <mesh castShadow={!overlay} receiveShadow={!overlay} renderOrder={renderOrder} {...meshProps}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={transparent}
        opacity={opacity}
        side={doubleSided ? DoubleSide : undefined}
        polygonOffset={overlay}
        polygonOffsetFactor={overlay ? -2 : 0}
        polygonOffsetUnits={overlay ? -2 : 0}
        depthWrite={!transparent}
      />
      {!hideEdges && (
        <Edges color={edgeColor} threshold={12} renderOrder={(renderOrder ?? 0) + 1} />
      )}
    </mesh>
  );
}

type OverlayMeshProps = ThreeElements['mesh'] & {
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  transparent?: boolean;
  doubleSided?: boolean;
  renderOrder?: number;
};

/** 非 box 的墙面叠加网格 */
export function OverlayMesh({
  color,
  roughness = 0.75,
  metalness = 0.03,
  opacity,
  transparent,
  doubleSided = false,
  renderOrder = 10,
  children,
  ...meshProps
}: OverlayMeshProps) {
  return (
    <mesh castShadow renderOrder={renderOrder} {...meshProps}>
      {children}
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={transparent}
        opacity={opacity}
        side={doubleSided ? DoubleSide : undefined}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        depthWrite={!transparent}
      />
    </mesh>
  );
}
