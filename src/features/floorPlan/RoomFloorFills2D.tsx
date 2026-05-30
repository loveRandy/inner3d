import { useId, useMemo } from 'react';
import type { FloorPlan, Vec2 } from '@/types/floorPlan';
import { getViewScale, worldToScreen, type CanvasViewState } from '@/lib/floorPlan/canvasView';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';

const PLANK_WORLD_W = 1.15;
const PLANK_WORLD_H = 0.16;

function pointsToSvg(points: Vec2[], view: CanvasViewState): string {
  return points
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
}

function FloorWoodPatternDefs({
  patternId,
  view,
}: {
  patternId: string;
  view: CanvasViewState;
}) {
  const scale = getViewScale(view);
  const pw = PLANK_WORLD_W * scale;
  const ph = PLANK_WORLD_H * scale;

  return (
    <pattern
      id={patternId}
      patternUnits="userSpaceOnUse"
      width={pw}
      height={ph}
    >
      <rect width={pw} height={ph} fill="#e8dcc8" />
      <rect x={0} y={0} width={pw * 0.42} height={ph} fill="#dcc9a8" />
      <rect x={pw * 0.46} y={0} width={pw * 0.32} height={ph} fill="#d4bf9a" />
      <rect x={pw * 0.82} y={0} width={pw * 0.18} height={ph} fill="#e2d0b4" />
      <line x1={0} y1={ph - 0.5} x2={pw} y2={ph - 0.5} stroke="#b8a078" strokeWidth={0.6} />
      <line x1={pw * 0.42} y1={0} x2={pw * 0.42} y2={ph} stroke="#c4ad88" strokeWidth={0.4} opacity={0.55} />
      <line x1={pw * 0.78} y1={0} x2={pw * 0.78} y2={ph} stroke="#c4ad88" strokeWidth={0.4} opacity={0.45} />
    </pattern>
  );
}

export function RoomFloorFills2D({
  floorPlan,
  view,
  selectedRoomIds,
}: {
  floorPlan: FloorPlan;
  view: CanvasViewState;
  selectedRoomIds: Set<string>;
}) {
  const rawId = useId();
  const patternId = `floor-wood-${rawId.replace(/:/g, '')}`;

  const fills = useMemo(() => {
    return floorPlan.roomIds
      .map((id) => {
        const room = floorPlan.rooms[id];
        if (!room) return null;
        const polygon = getRoomFloorPolygon(floorPlan, room);
        if (polygon.length < 3) return null;
        return { id, polygon, selected: selectedRoomIds.has(id) };
      })
      .filter(Boolean) as { id: string; polygon: Vec2[]; selected: boolean }[];
  }, [floorPlan, selectedRoomIds]);

  if (fills.length === 0) return null;

  return (
    <>
      <defs>
        <FloorWoodPatternDefs patternId={patternId} view={view} />
      </defs>
      <g className="floor-plan-canvas__room-floors" pointerEvents="none">
        {fills.map(({ id, polygon, selected }) => (
          <polygon
            key={id}
            points={pointsToSvg(polygon, view)}
            className={`floor-plan-canvas__room-floor${selected ? ' is-selected' : ''}`}
            fill={`url(#${patternId})`}
          />
        ))}
      </g>
    </>
  );
}
