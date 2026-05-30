import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import {
  createAddOpeningCommand,
  createAddRectWallsCommand,
  createAddWallCommand,
  createUpdateWallEndpointCommand,
} from '@/lib/commands';
import {
  createDefaultViewState,
  formatLengthMm,
  screenToWorld,
  worldToScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';
import { findWallAtPoint } from '@/lib/floorPlan/openingPlacement';
import {
  buildPreviewOpening,
  getOpeningsOnWall,
  getWallSolidQuads,
} from '@/lib/floorPlan/openingRender';
import { OpeningSymbol2D } from '@/features/floorPlan/OpeningSymbol2D';
import type { Opening } from '@/types/floorPlan';
import { applyOrtho, dist2d, getWallQuad, projectPointOnWall, wallLength } from '@/lib/floorPlan/wallGeometry';
import { snapFloorPlanPoint, snapToGrid2d } from '@/lib/floorPlan/snap';
import {
  alignThresholdWorld,
  applyAlignSnap,
  buildScreenGuideLines,
  collectAlignRefPoints,
  type AlignSnapResult,
} from '@/lib/floorPlan/alignGuides';
import type { FloorPlanSelectionKind, FloorPlanSettings, Vec2, WallSegment } from '@/types/floorPlan';

const MIN_WALL_LENGTH = 0.05;

function buildPreviewWall(
  start: Vec2,
  end: Vec2,
  settings: FloorPlanSettings,
): WallSegment {
  return {
    id: '__preview__',
    start,
    end,
    thickness: settings.defaultWallThickness,
    height: settings.floorHeight,
    align: settings.defaultAlign,
    kind: 'nonBearing',
    startNodeId: '',
    endNodeId: '',
  };
}

function pointsToSvg(points: Vec2[], view: CanvasViewState): string {
  return points
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
}

function hitWall(wall: WallSegment, point: Vec2, threshold = 0.2): boolean {
  const proj = projectPointOnWall(wall, point);
  return proj.distance <= threshold;
}

export function FloorPlanCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [shiftDown, setShiftDown] = useState(false);
  const [dragEndpoint, setDragEndpoint] = useState<{
    wallId: string;
    end: 'start' | 'end';
  } | null>(null);
  const [alignGuides, setAlignGuides] = useState<AlignSnapResult | null>(null);
  const [openingPreview, setOpeningPreview] = useState<{
    wallId: string;
    opening: Opening;
  } | null>(null);

  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const gridVisible = useSceneStore((s) => s.document.settings.gridVisible);
  const floorPlanSelection = useSceneStore((s) => s.floorPlanSelection);
  const setFloorPlanSelection = useSceneStore((s) => s.setFloorPlanSelection);
  const hoveredFloorPlanId = useSceneStore((s) => s.hoveredFloorPlanId);
  const setHoveredFloorPlan = useSceneStore((s) => s.setHoveredFloorPlan);

  const floorPlanTool = useEditorStore((s) => s.floorPlanTool);
  const floorPlanZoom = useEditorStore((s) => s.floorPlanZoom);
  const wallDrawStart = useEditorStore((s) => s.wallDrawStart);
  const wallDrawPreview = useEditorStore((s) => s.wallDrawPreview);
  const rectDrawStart = useEditorStore((s) => s.rectDrawStart);
  const rectDrawPreview = useEditorStore((s) => s.rectDrawPreview);
  const setWallDrawStart = useEditorStore((s) => s.setWallDrawStart);
  const setWallDrawPreview = useEditorStore((s) => s.setWallDrawPreview);
  const setRectDrawStart = useEditorStore((s) => s.setRectDrawStart);
  const setRectDrawPreview = useEditorStore((s) => s.setRectDrawPreview);
  const resetFloorPlanDrawState = useEditorStore((s) => s.resetFloorPlanDrawState);
  const settings = floorPlan?.settings;

  const execute = useHistoryStore((s) => s.execute);

  const view = useMemo(
    () => ({
      ...createDefaultViewState(size.width, size.height),
      zoom: floorPlanZoom,
    }),
    [size.width, size.height, floorPlanZoom],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => setShiftDown(e.shiftKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  const resolvePoint = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !floorPlan) return { x: 0, z: 0 };
      const raw = screenToWorld(clientX - rect.left, clientY - rect.top, view);
      const snapped = snapFloorPlanPoint(
        floorPlan,
        raw,
        gridSize,
        floorPlan.settings.autoJoin,
      );
      return snapped.point;
    },
    [floorPlan, gridSize, view],
  );

  const applyOrthoIfNeeded = useCallback(
    (start: Vec2, end: Vec2): Vec2 => {
      if (shiftDown || settings?.orthoLocked) return applyOrtho(start, end);
      return end;
    },
    [shiftDown, settings?.orthoLocked],
  );

  /** 画墙时：网格 → 直角吸附线 → 正交 → 端点吸附 */
  const resolveWallDrawPoint = useCallback(
    (clientX: number, clientY: number, chainStart: Vec2): { point: Vec2; align: AlignSnapResult } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !floorPlan) {
        const zero = { x: 0, z: 0 };
        return { point: zero, align: { point: zero, verticalGuides: [], horizontalGuides: [], intersection: null } };
      }

      const raw = screenToWorld(clientX - rect.left, clientY - rect.top, view);
      const gridSnapped = snapToGrid2d(raw, gridSize);
      const refs = collectAlignRefPoints(floorPlan, chainStart);
      const threshold = alignThresholdWorld(view);
      const align = applyAlignSnap(gridSnapped, refs, threshold, chainStart);
      const ortho = applyOrthoIfNeeded(chainStart, align.point);
      const joined = snapFloorPlanPoint(floorPlan, ortho, gridSize, floorPlan.settings.autoJoin);

      return { point: joined.point, align };
    },
    [floorPlan, gridSize, view, applyOrthoIfNeeded],
  );

  const pickAt = useCallback(
    (point: Vec2): { kind: FloorPlanSelectionKind; id: string } | null => {
      if (!floorPlan) return null;

      for (const id of floorPlan.openingIds) {
        const opening = floorPlan.openings[id];
        const wall = floorPlan.walls[opening.wallId];
        if (!wall) continue;
        const center = {
          x:
            wall.start.x +
            (wall.end.x - wall.start.x) * ((opening.offset + opening.width / 2) / wallLength(wall)),
          z:
            wall.start.z +
            (wall.end.z - wall.start.z) * ((opening.offset + opening.width / 2) / wallLength(wall)),
        };
        if (dist2d(point, center) < 0.25) return { kind: 'opening', id };
      }

      for (const id of floorPlan.roomIds) {
        const room = floorPlan.rooms[id];
        if (dist2d(point, room.centroid) < 0.6) return { kind: 'room', id };
      }

      for (const id of floorPlan.wallIds) {
        const wall = floorPlan.walls[id];
        if (wall && hitWall(wall, point)) return { kind: 'wall', id };
      }
      return null;
    },
    [floorPlan],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!floorPlan) return;
    const point = resolvePoint(e.clientX, e.clientY);

    if (floorPlanTool === 'wall') {
      if (e.button === 2) {
        if (wallDrawStart) {
          resetFloorPlanDrawState();
          setAlignGuides(null);
        }
        return;
      }
      if (e.button !== 0) return;

      if (!wallDrawStart) {
        const p = resolvePoint(e.clientX, e.clientY);
        setWallDrawStart(p);
        setWallDrawPreview(p);
        setAlignGuides(null);
        setFloorPlanSelection([]);
      } else {
        const { point: end, align } = resolveWallDrawPoint(e.clientX, e.clientY, wallDrawStart);
        setAlignGuides(align);
        if (dist2d(wallDrawStart, end) >= MIN_WALL_LENGTH) {
          execute(createAddWallCommand(wallDrawStart, end, gridSize));
        }
        setWallDrawStart(end);
        setWallDrawPreview(end);
      }
      return;
    }

    if (floorPlanTool === 'rectWall') {
      setRectDrawStart(point);
      setRectDrawPreview(point);
      return;
    }

    if (
      floorPlanTool === 'door' ||
      floorPlanTool === 'window' ||
      floorPlanTool === 'opening'
    ) {
      const hit = findWallAtPoint(floorPlan, point);
      if (hit) {
        execute(createAddOpeningCommand(hit.wallId, floorPlanTool, point));
        setOpeningPreview(null);
      }
      return;
    }

    const picked = pickAt(point);
    if (picked?.kind === 'wall') {
      const wall = floorPlan.walls[picked.id];
      if (wall) {
        const startDist = dist2d(point, wall.start);
        const endDist = dist2d(point, wall.end);
        if (startDist < 0.2 || endDist < 0.2) {
          setDragEndpoint({
            wallId: picked.id,
            end: startDist <= endDist ? 'start' : 'end',
          });
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }
      }
    }
    setFloorPlanSelection(picked ? [picked] : []);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!floorPlan) return;
    const point = resolvePoint(e.clientX, e.clientY);

    if (dragEndpoint) {
      setWallDrawPreview(null);
      return;
    }

    if (floorPlanTool === 'wall' && wallDrawStart) {
      const { point: end, align } = resolveWallDrawPoint(e.clientX, e.clientY, wallDrawStart);
      setWallDrawPreview(end);
      setAlignGuides(align);
      setOpeningPreview(null);
    } else if (floorPlanTool === 'rectWall' && rectDrawStart) {
      setRectDrawPreview(point);
      setOpeningPreview(null);
    } else if (
      floorPlanTool === 'door' ||
      floorPlanTool === 'window' ||
      floorPlanTool === 'opening'
    ) {
      const hit = findWallAtPoint(floorPlan, point);
      if (hit) {
        const wall = floorPlan.walls[hit.wallId];
        if (wall) {
          setOpeningPreview({
            wallId: hit.wallId,
            opening: buildPreviewOpening(wall, floorPlanTool, point),
          });
        }
      } else {
        setOpeningPreview(null);
      }
      setHoveredFloorPlan(null);
    } else {
      setOpeningPreview(null);
      const hovered = pickAt(point);
      setHoveredFloorPlan(hovered);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!floorPlan) return;
    const point = resolvePoint(e.clientX, e.clientY);

    if (dragEndpoint) {
      execute(
        createUpdateWallEndpointCommand(
          dragEndpoint.wallId,
          dragEndpoint.end,
          point,
          gridSize,
        ),
      );
      setDragEndpoint(null);
      return;
    }

    if (floorPlanTool === 'rectWall' && rectDrawStart && rectDrawPreview) {
      execute(createAddRectWallsCommand(rectDrawStart, rectDrawPreview, gridSize));
      resetFloorPlanDrawState();
    }
  };

  if (!floorPlan) return null;

  const selectedSet = new Set(floorPlanSelection.map((s) => `${s.kind}:${s.id}`));
  const isSelected = (kind: FloorPlanSelectionKind, id: string) =>
    selectedSet.has(`${kind}:${id}`);

  const previewEnd = wallDrawPreview;
  const previewWallSegment =
    wallDrawStart && previewEnd && dist2d(wallDrawStart, previewEnd) >= MIN_WALL_LENGTH
      ? buildPreviewWall(wallDrawStart, previewEnd, floorPlan.settings)
      : null;
  const isWallDrawing = floorPlanTool === 'wall' && wallDrawStart !== null;

  const snapGuideLines =
    isWallDrawing && alignGuides
      ? buildScreenGuideLines(alignGuides, view)
      : [];

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (gridVisible) {
    const span = view.worldSpan / 2;
    for (let i = -span; i <= span; i += gridSize) {
      const a = worldToScreen({ x: i, z: -span }, view);
      const b = worldToScreen({ x: i, z: span }, view);
      const c = worldToScreen({ x: -span, z: i }, view);
      const d = worldToScreen({ x: span, z: i }, view);
      gridLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      gridLines.push({ x1: c.x, y1: c.y, x2: d.x, y2: d.y });
    }
  }

  return (
    <div ref={containerRef} className="floor-plan-canvas">
      <svg
        width={size.width}
        height={size.height}
        className={`floor-plan-canvas__svg${isWallDrawing ? ' floor-plan-canvas__svg--drawing-wall' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          if (floorPlanTool === 'wall' && wallDrawStart) {
            e.preventDefault();
            resetFloorPlanDrawState();
            setAlignGuides(null);
          }
        }}
      >
        <rect width="100%" height="100%" fill="#eef2f7" />

        {gridLines.map((line, i) => (
          <line
            key={i}
            {...line}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        ))}

        {floorPlan.roomIds.map((id) => {
          const room = floorPlan.rooms[id];
          const c = worldToScreen(room.centroid, view);
          return (
            <g key={id}>
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`floor-plan-canvas__room-label${isSelected('room', id) ? ' is-selected' : ''}`}
              >
                {room.name}
              </text>
              <text x={c.x} y={c.y + 14} textAnchor="middle" className="floor-plan-canvas__room-area">
                {room.area.toFixed(1)} m²
              </text>
            </g>
          );
        })}

        {floorPlan.wallIds.map((id) => {
          const wall = floorPlan.walls[id];
          if (!wall) return null;
          const wallOpenings = getOpeningsOnWall(floorPlan.openings, floorPlan.openingIds, id);
          const previewOnWall =
            openingPreview?.wallId === id &&
            (openingPreview.opening.type === 'opening' || openingPreview.opening.type === 'window')
              ? openingPreview.opening
              : null;
          const quads = getWallSolidQuads(
            wall,
            previewOnWall ? [...wallOpenings, previewOnWall] : wallOpenings,
          );
          const selected = isSelected('wall', id);
          const hovered = hoveredFloorPlanId?.kind === 'wall' && hoveredFloorPlanId.id === id;
          return (
            <g key={id}>
              {quads.map((quad, qi) => (
                <polygon
                  key={qi}
                  points={pointsToSvg(quad, view)}
                  className={`floor-plan-canvas__wall${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}`}
                />
              ))}
            </g>
          );
        })}

        {floorPlan.openingIds.map((id) => {
          const opening = floorPlan.openings[id];
          const wall = floorPlan.walls[opening.wallId];
          if (!wall) return null;
          return (
            <OpeningSymbol2D
              key={id}
              wall={wall}
              opening={opening}
              view={view}
              isSelected={isSelected('opening', id)}
            />
          );
        })}

        {openingPreview && (() => {
          const wall = floorPlan.walls[openingPreview.wallId];
          if (!wall) return null;
          return (
            <OpeningSymbol2D
              key="opening-preview"
              wall={wall}
              opening={openingPreview.opening}
              view={view}
              isPreview
            />
          );
        })()}

        {snapGuideLines.map((line, i) => (
          <line
            key={`snap-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className="floor-plan-canvas__snap-guide"
          />
        ))}

        {alignGuides?.intersection && previewEnd && (
          <g
            className="floor-plan-canvas__snap-cross"
            transform={`translate(${worldToScreen(alignGuides.intersection, view).x}, ${worldToScreen(alignGuides.intersection, view).y})`}
            pointerEvents="none"
          >
            <line x1={-6} y1={-6} x2={6} y2={6} />
            <line x1={-6} y1={6} x2={6} y2={-6} />
          </g>
        )}

        {previewWallSegment && (
          <>
            <line
              x1={worldToScreen(previewWallSegment.start, view).x}
              y1={worldToScreen(previewWallSegment.start, view).y}
              x2={worldToScreen(previewWallSegment.end, view).x}
              y2={worldToScreen(previewWallSegment.end, view).y}
              className="floor-plan-canvas__centerline"
            />
            <polygon
              points={pointsToSvg(getWallQuad(previewWallSegment), view)}
              className="floor-plan-canvas__wall floor-plan-canvas__wall--preview"
            />
            <circle
              cx={worldToScreen(previewWallSegment.end, view).x}
              cy={worldToScreen(previewWallSegment.end, view).y}
              r={5}
              className="floor-plan-canvas__endpoint"
            />
            {wallDrawStart && (
              <circle
                cx={worldToScreen(wallDrawStart, view).x}
                cy={worldToScreen(wallDrawStart, view).y}
                r={4}
                className="floor-plan-canvas__endpoint floor-plan-canvas__endpoint--start"
              />
            )}
          </>
        )}

        {rectDrawStart && rectDrawPreview && (
          <rect
            x={worldToScreen(
              {
                x: Math.min(rectDrawStart.x, rectDrawPreview.x),
                z: Math.min(rectDrawStart.z, rectDrawPreview.z),
              },
              view,
            ).x}
            y={worldToScreen(
              {
                x: Math.min(rectDrawStart.x, rectDrawPreview.x),
                z: Math.min(rectDrawStart.z, rectDrawPreview.z),
              },
              view,
            ).y}
            width={Math.abs(worldToScreen(rectDrawPreview, view).x - worldToScreen(rectDrawStart, view).x)}
            height={Math.abs(worldToScreen(rectDrawPreview, view).y - worldToScreen(rectDrawStart, view).y)}
            className="floor-plan-canvas__rect-preview"
          />
        )}

        {previewWallSegment && (() => {
          const s0 = worldToScreen(previewWallSegment.start, view);
          const s1 = worldToScreen(previewWallSegment.end, view);
          const mx = (s0.x + s1.x) / 2;
          const my = (s0.y + s1.y) / 2 + 18;
          const label = `${formatLengthMm(dist2d(previewWallSegment.start, previewWallSegment.end))} mm`;
          const boxW = label.length * 7 + 16;
          return (
            <g className="floor-plan-canvas__dim-group" pointerEvents="none">
              <rect
                x={mx - boxW / 2}
                y={my - 12}
                width={boxW}
                height={22}
                rx={3}
                className="floor-plan-canvas__dim-box"
              />
              <text x={mx} y={my + 4} textAnchor="middle" className="floor-plan-canvas__dim">
                {label}
              </text>
            </g>
          );
        })()}

        {floorPlanSelection
          .filter((s) => s.kind === 'wall')
          .map(({ id }) => {
            const wall = floorPlan.walls[id];
            if (!wall) return null;
            const s = worldToScreen(wall.start, view);
            const e = worldToScreen(wall.end, view);
            return (
              <g key={`handles-${id}`}>
                <circle cx={s.x} cy={s.y} r={6} className="floor-plan-canvas__handle" />
                <circle cx={e.x} cy={e.y} r={6} className="floor-plan-canvas__handle" />
              </g>
            );
          })}
      </svg>
    </div>
  );
}
