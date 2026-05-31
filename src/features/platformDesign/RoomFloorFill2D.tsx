import { useId, useMemo } from 'react';
import type { Vec2 } from '@/types/floorPlan';
import { worldToScreen, type CanvasViewState } from '@/lib/floorPlan/canvasView';
import { FloorMaterialTexturePatternDefs } from '@/lib/platformDesign/floorMaterialSvgPattern';

function pointsToSvg(points: Vec2[], view: CanvasViewState): string {
  return points
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
}

export function RoomFloorFill2D({
  polygon,
  presetId,
  view,
  hovered,
}: {
  polygon: Vec2[];
  presetId: string;
  view: CanvasViewState;
  hovered?: boolean;
}) {
  const rawId = useId();
  const patternId = `platform-floor-${rawId.replace(/:/g, '')}`;
  const fill = useMemo(() => `url(#${patternId})`, [patternId]);

  if (polygon.length < 3) return null;

  return (
    <>
      <defs>
        <FloorMaterialTexturePatternDefs patternId={patternId} presetId={presetId} view={view} />
      </defs>
      <polygon
        points={pointsToSvg(polygon, view)}
        fill={fill}
        className={`platform-design-canvas__floor${hovered ? ' is-hovered' : ''}`}
      />
    </>
  );
}
