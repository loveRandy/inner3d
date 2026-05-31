import { useMemo } from 'react';
import type { FloorPlan, Vec2 } from '@/types/floorPlan';
import { worldToScreen, type CanvasViewState } from '@/lib/floorPlan/canvasView';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import { DEFAULT_FLOOR_PRESET_ID } from '@/types/platformDesign';
import {
  FloorMaterialTexturePatternDefs,
  floorMaterialPatternDomId,
} from '@/lib/platformDesign/floorMaterialSvgPattern';

function pointsToSvg(points: Vec2[], view: CanvasViewState): string {
  return points
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
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
  const fills = useMemo(() => {
    return floorPlan.roomIds
      .map((id) => {
        const room = floorPlan.rooms[id];
        if (!room) return null;
        const polygon = getRoomFloorPolygon(floorPlan, room);
        if (polygon.length < 3) return null;
        const presetId = room.floorMaterial?.presetId ?? DEFAULT_FLOOR_PRESET_ID;
        return { id, polygon, presetId, selected: selectedRoomIds.has(id) };
      })
      .filter(Boolean) as { id: string; polygon: Vec2[]; presetId: string; selected: boolean }[];
  }, [floorPlan, selectedRoomIds]);

  const presetIds = useMemo(
    () => [...new Set(fills.map((fill) => fill.presetId))],
    [fills],
  );

  if (fills.length === 0) return null;

  return (
    <>
      <defs>
        {presetIds.map((presetId) => (
          <FloorMaterialTexturePatternDefs
            key={presetId}
            patternId={floorMaterialPatternDomId(presetId)}
            presetId={presetId}
            view={view}
          />
        ))}
      </defs>
      <g className="floor-plan-canvas__room-floors" pointerEvents="none">
        {fills.map(({ id, polygon, presetId, selected }) => (
          <polygon
            key={`${id}-${presetId}`}
            points={pointsToSvg(polygon, view)}
            className={`floor-plan-canvas__room-floor${selected ? ' is-selected' : ''}`}
            fill={`url(#${floorMaterialPatternDomId(presetId)})`}
          />
        ))}
      </g>
    </>
  );
}
