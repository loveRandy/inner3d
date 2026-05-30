import type { FloorPlan } from '@/types/floorPlan';
import {
  formatLengthMm,
  worldToScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';
import { buildWallDimensionSpecs } from '@/lib/floorPlan/wallDimensions';

const TICK_LENGTH = 6;

function perpendicularUnit(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 1 };
  return { x: -dy / len, y: dx / len };
}

export function WallAnnotations2D({
  floorPlan,
  view,
}: {
  floorPlan: FloorPlan;
  view: CanvasViewState;
}) {
  const specs = buildWallDimensionSpecs(floorPlan);

  return (
    <g className="floor-plan-canvas__wall-dims" pointerEvents="none">
      {specs.map((spec) => {
        const start = worldToScreen(spec.start, view);
        const end = worldToScreen(spec.end, view);
        const perp = perpendicularUnit(start, end);
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const label = formatLengthMm(spec.lengthM);

        return (
          <g key={spec.key} className="floor-plan-canvas__wall-dim">
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className="floor-plan-canvas__wall-dim-line"
            />
            <line
              x1={start.x - perp.x * TICK_LENGTH}
              y1={start.y - perp.y * TICK_LENGTH}
              x2={start.x + perp.x * TICK_LENGTH}
              y2={start.y + perp.y * TICK_LENGTH}
              className="floor-plan-canvas__wall-dim-tick"
            />
            <line
              x1={end.x - perp.x * TICK_LENGTH}
              y1={end.y - perp.y * TICK_LENGTH}
              x2={end.x + perp.x * TICK_LENGTH}
              y2={end.y + perp.y * TICK_LENGTH}
              className="floor-plan-canvas__wall-dim-tick"
            />
            <text
              x={mid.x}
              y={mid.y - 6}
              textAnchor="middle"
              className="floor-plan-canvas__wall-dim-label"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
