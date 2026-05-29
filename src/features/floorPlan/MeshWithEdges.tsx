import { Edges } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { ARCH_COLORS } from './architectureStyle';

type BoxProps = ThreeElements['mesh'] & {
  size: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  edgeColor?: string;
  opacity?: number;
  transparent?: boolean;
};

export function SolidBoxWithEdges({
  size,
  color,
  roughness = 0.75,
  metalness = 0.03,
  edgeColor = ARCH_COLORS.edge,
  opacity,
  transparent,
  ...meshProps
}: BoxProps) {
  return (
    <mesh castShadow receiveShadow {...meshProps}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={transparent}
        opacity={opacity}
      />
      <Edges color={edgeColor} threshold={12} />
    </mesh>
  );
}
