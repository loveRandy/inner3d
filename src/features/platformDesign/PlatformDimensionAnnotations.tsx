import type { Vec2 } from '@/types/floorPlan';
import {
  formatLengthMm,
  worldToScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';

const OFFSET = 28;
const TICK = 6;

function getAabb(points: Vec2[]) {
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
  return { minX, maxX, minZ, maxZ };
}

export function PlatformDimensionAnnotations({
  polygon,
  view,
}: {
  polygon: Vec2[];
  view: CanvasViewState;
}) {
  if (polygon.length < 3) return null;

  const { minX, maxX, minZ, maxZ } = getAabb(polygon);
  const widthM = maxX - minX;
  const depthM = maxZ - minZ;

  const topLeft = worldToScreen({ x: minX, z: minZ }, view);
  const topRight = worldToScreen({ x: maxX, z: minZ }, view);
  const bottomLeft = worldToScreen({ x: minX, z: maxZ }, view);
  const bottomRight = worldToScreen({ x: maxX, z: maxZ }, view);

  const topY = Math.min(topLeft.y, topRight.y) - OFFSET;
  const bottomY = Math.max(bottomLeft.y, bottomRight.y) + OFFSET;
  const leftX = Math.min(topLeft.x, bottomLeft.x) - OFFSET;
  const rightX = Math.max(topRight.x, bottomRight.x) + OFFSET;

  return (
    <g className="platform-design-canvas__dims" pointerEvents="none">
      <g>
        <line
          x1={topLeft.x}
          y1={topY}
          x2={topRight.x}
          y2={topY}
          className="platform-design-canvas__dim-line"
        />
        <line x1={topLeft.x} y1={topY - TICK} x2={topLeft.x} y2={topY + TICK} className="platform-design-canvas__dim-tick" />
        <line x1={topRight.x} y1={topY - TICK} x2={topRight.x} y2={topY + TICK} className="platform-design-canvas__dim-tick" />
        <text x={(topLeft.x + topRight.x) / 2} y={topY - 8} textAnchor="middle" className="platform-design-canvas__dim-label">
          {formatLengthMm(widthM)}
        </text>
      </g>
      <g>
        <line
          x1={leftX}
          y1={topLeft.y}
          x2={leftX}
          y2={bottomLeft.y}
          className="platform-design-canvas__dim-line"
        />
        <line x1={leftX - TICK} y1={topLeft.y} x2={leftX + TICK} y2={topLeft.y} className="platform-design-canvas__dim-tick" />
        <line x1={leftX - TICK} y1={bottomLeft.y} x2={leftX + TICK} y2={bottomLeft.y} className="platform-design-canvas__dim-tick" />
        <text
          x={leftX - 10}
          y={(topLeft.y + bottomLeft.y) / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${leftX - 10} ${(topLeft.y + bottomLeft.y) / 2})`}
          className="platform-design-canvas__dim-label"
        >
          {formatLengthMm(depthM)}
        </text>
      </g>
      <g>
        <line
          x1={bottomLeft.x}
          y1={bottomY}
          x2={bottomRight.x}
          y2={bottomY}
          className="platform-design-canvas__dim-line"
        />
        <line x1={bottomLeft.x} y1={bottomY - TICK} x2={bottomLeft.x} y2={bottomY + TICK} className="platform-design-canvas__dim-tick" />
        <line x1={bottomRight.x} y1={bottomY - TICK} x2={bottomRight.x} y2={bottomY + TICK} className="platform-design-canvas__dim-tick" />
        <text x={(bottomLeft.x + bottomRight.x) / 2} y={bottomY + 16} textAnchor="middle" className="platform-design-canvas__dim-label">
          {formatLengthMm(widthM)}
        </text>
      </g>
      <g>
        <line
          x1={rightX}
          y1={topRight.y}
          x2={rightX}
          y2={bottomRight.y}
          className="platform-design-canvas__dim-line"
        />
        <line x1={rightX - TICK} y1={topRight.y} x2={rightX + TICK} y2={topRight.y} className="platform-design-canvas__dim-tick" />
        <line x1={rightX - TICK} y1={bottomRight.y} x2={rightX + TICK} y2={bottomRight.y} className="platform-design-canvas__dim-tick" />
        <text
          x={rightX + 10}
          y={(topRight.y + bottomRight.y) / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${rightX + 10} ${(topRight.y + bottomRight.y) / 2})`}
          className="platform-design-canvas__dim-label"
        >
          {formatLengthMm(depthM)}
        </text>
      </g>
    </g>
  );
}
