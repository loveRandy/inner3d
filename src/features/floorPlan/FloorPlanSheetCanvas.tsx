import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OpeningSymbol2D } from '@/features/floorPlan/OpeningSymbol2D';
import { ModelSymbol2D } from '@/features/floorPlan/ModelSymbol2D';
import { FLOOR_PLAN_SHEET } from '@/features/floorPlan/floorPlanSheetStyle';
import {
  buildVisibleGridLines,
  createDefaultViewState,
  fitViewToFloorPlanBounds,
  panViewByScreenDelta,
  worldToScreen,
  zoomViewAtScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';
import { getOpeningsOnWall, getWallSolidQuads } from '@/lib/floorPlan/openingRender';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import type { FloorPlan, Vec2 } from '@/types/floorPlan';

const RIGHT_DRAG_THRESHOLD = 4;
const WHEEL_ZOOM_SENSITIVITY = 0.0012;

function pointsToSvg(points: Vec2[], view: CanvasViewState): string {
  return points
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
}

export function FloorPlanSheetCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 200 });
  const [isPanning, setIsPanning] = useState(false);

  const rightPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panning: boolean;
  } | null>(null);
  const [panDrag, setPanDrag] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanZ: number;
  } | null>(null);

  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const entities = useSceneStore((s) => s.document.entities);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);

  const sheetView = useEditorStore((s) => s.floorPlanSheetView);
  const setFloorPlanSheetView = useEditorStore((s) => s.setFloorPlanSheetView);

  const view = useMemo((): CanvasViewState => {
    const base = sheetView ?? createDefaultViewState(size.width, size.height);
    return { ...base, width: size.width, height: size.height };
  }, [sheetView, size.width, size.height]);

  const gridLines = useMemo(
    () => buildVisibleGridLines(view, gridSize),
    [view, gridSize],
  );

  const roomFills = useMemo(() => {
    if (!floorPlan) return [];
    return floorPlan.roomIds
      .map((id) => {
        const room = floorPlan.rooms[id];
        if (!room) return null;
        const polygon = getRoomFloorPolygon(floorPlan, room);
        if (polygon.length < 3) return null;
        return { id, room, polygon };
      })
      .filter(Boolean) as { id: string; room: FloorPlan['rooms'][string]; polygon: Vec2[] }[];
  }, [floorPlan]);

  const fitToFloorPlan = useCallback(() => {
    if (!floorPlan || floorPlan.wallIds.length === 0) return;
    const fit = fitViewToFloorPlanBounds(floorPlan);
    setFloorPlanSheetView({ ...fit, width: size.width, height: size.height });
  }, [floorPlan, setFloorPlanSheetView, size.width, size.height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      setSize({ width, height });
      setFloorPlanSheetView({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setFloorPlanSheetView]);

  useEffect(() => {
    if (!floorPlan || floorPlan.wallIds.length === 0) return;
    const fit = fitViewToFloorPlanBounds(floorPlan);
    setFloorPlanSheetView({
      ...fit,
      width: containerRef.current?.clientWidth ?? size.width,
      height: containerRef.current?.clientHeight ?? size.height,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit when wall count changes
  }, [floorPlan?.wallIds.length, setFloorPlanSheetView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const current = useEditorStore.getState().floorPlanSheetView;
      if (!current) return;
      const currentView: CanvasViewState = { ...current, width: el.clientWidth, height: el.clientHeight };
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
      const next = zoomViewAtScreen(
        currentView,
        current.panX,
        current.panZ,
        current.zoom,
        sx,
        sy,
        current.zoom * factor,
      );
      setFloorPlanSheetView(next);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setFloorPlanSheetView]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      rightPointerRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        panning: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rp = rightPointerRef.current;
    if (rp && rp.pointerId === e.pointerId) {
      const dx = e.clientX - rp.startX;
      const dy = e.clientY - rp.startY;
      if (!rp.panning && Math.hypot(dx, dy) >= RIGHT_DRAG_THRESHOLD) {
        rp.panning = true;
        setIsPanning(true);
        const current = useEditorStore.getState().floorPlanSheetView;
        if (current) {
          setPanDrag({
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startPanX: current.panX,
            startPanZ: current.panZ,
          });
        }
      }
    }

    if (panDrag && panDrag.pointerId === e.pointerId) {
      const current = useEditorStore.getState().floorPlanSheetView;
      if (!current) return;
      const currentView: CanvasViewState = {
        ...current,
        width: containerRef.current?.clientWidth ?? size.width,
        height: containerRef.current?.clientHeight ?? size.height,
      };
      const next = panViewByScreenDelta(
        panDrag.startPanX,
        panDrag.startPanZ,
        currentView,
        e.clientX - panDrag.startX,
        e.clientY - panDrag.startY,
      );
      setFloorPlanSheetView(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (rightPointerRef.current?.pointerId === e.pointerId) {
      rightPointerRef.current = null;
      setIsPanning(false);
    }
    if (panDrag?.pointerId === e.pointerId) {
      setPanDrag(null);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleDoubleClick = () => {
    fitToFloorPlan();
  };

  if (!floorPlan || floorPlan.wallIds.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="floor-plan-sheet__canvas">
      <svg
        width={size.width}
        height={size.height}
        className={`floor-plan-sheet__svg${isPanning ? ' floor-plan-sheet__svg--panning' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <rect width="100%" height="100%" fill={FLOOR_PLAN_SHEET.background} />

        {gridLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.major ? FLOOR_PLAN_SHEET.gridMajor : FLOOR_PLAN_SHEET.gridMinor}
            strokeWidth={line.major ? 1 : 0.5}
          />
        ))}

        <g className="floor-plan-sheet__rooms" pointerEvents="none">
          {roomFills.map(({ id, polygon }) => (
            <polygon
              key={id}
              points={pointsToSvg(polygon, view)}
              className="floor-plan-sheet__room-fill"
              fill={FLOOR_PLAN_SHEET.roomFill}
              stroke={FLOOR_PLAN_SHEET.roomStroke}
              strokeWidth={1}
            />
          ))}
        </g>

        {floorPlan.wallIds.map((id) => {
          const wall = floorPlan.walls[id];
          if (!wall) return null;
          const wallOpenings = getOpeningsOnWall(floorPlan.openings, floorPlan.openingIds, id);
          const quads = getWallSolidQuads(wall, wallOpenings);
          return (
            <g key={id} pointerEvents="none">
              {quads.map((quad, qi) => (
                <polygon
                  key={qi}
                  points={pointsToSvg(quad, view)}
                  className="floor-plan-sheet__wall"
                  fill={FLOOR_PLAN_SHEET.wallFill}
                  stroke={FLOOR_PLAN_SHEET.wallStroke}
                  strokeWidth={1}
                />
              ))}
            </g>
          );
        })}

        {floorPlan.roomIds.map((id) => {
          const room = floorPlan.rooms[id];
          if (!room) return null;
          const c = worldToScreen(room.centroid, view);
          const label = room.name || `房间 ${floorPlan.roomIds.indexOf(id) + 1}`;
          return (
            <g key={id} pointerEvents="none">
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="floor-plan-sheet__room-label"
              >
                {label}
              </text>
              {room.area > 0 && (
                <text x={c.x} y={c.y + 13} textAnchor="middle" className="floor-plan-sheet__room-area">
                  {room.area.toFixed(1)} m²
                </text>
              )}
            </g>
          );
        })}

        {floorPlan.openingIds.map((id) => {
          const opening = floorPlan.openings[id];
          const wall = floorPlan.walls[opening.wallId];
          if (!wall) return null;
          return (
            <OpeningSymbol2D key={id} wall={wall} opening={opening} view={view} />
          );
        })}

        <g className="floor-plan-sheet__models" pointerEvents="none">
          {rootIds.map((id) => {
            const entity = entities[id];
            if (!entity || entity.type !== 'model') return null;
            return (
              <ModelSymbol2D
                key={id}
                entityId={id}
                entity={entity}
                view={view}
                isSelected={false}
                isHovered={false}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
