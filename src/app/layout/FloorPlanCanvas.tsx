import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import {
  createAddOpeningCommand,
  createAddRectWallsCommand,
  createAddWallCommand,
  createUpdateOpeningCommand,
  createUpdateTransformCommand,
  createUpdateWallEndpointCommand,
} from '@/lib/commands';
import {
  buildVisibleGridLines,
  createDefaultViewState,
  formatLengthMm,
  panViewByScreenDelta,
  screenToWorld,
  worldToScreen,
  zoomViewAtScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';
import { findWallAtPoint, pickOpeningAtPoint, resolveOpeningOffsetFromPoint } from '@/lib/floorPlan/openingPlacement';
import {
  buildPreviewOpening,
  getOpeningsOnWall,
  getWallSolidQuads,
} from '@/lib/floorPlan/openingRender';
import { OpeningSymbol2D } from '@/features/floorPlan/OpeningSymbol2D';
import { ModelSymbol2D } from '@/features/floorPlan/ModelSymbol2D';
import { WallAnnotations2D } from '@/features/floorPlan/WallAnnotations2D';
import { pickEntityAtPoint } from '@/lib/floorPlan/modelPick';
import { cloneTransform } from '@/lib/transform/worldTransform';
import {
  shouldShowWallAnnotations,
} from '@/lib/floorPlan/floorPlanToolState';
import type { Opening } from '@/types/floorPlan';
import { applyOrtho, dist2d, getWallQuad, projectPointOnWall } from '@/lib/floorPlan/wallGeometry';
import { snapFloorPlanPoint, snapToGrid2d } from '@/lib/floorPlan/snap';
import {
  alignThresholdWorld,
  applyAlignSnap,
  buildScreenGuideLines,
  collectAlignRefPoints,
  type AlignSnapResult,
} from '@/lib/floorPlan/alignGuides';
import type { FloorPlanSelectionKind, FloorPlanSettings, Vec2, WallSegment } from '@/types/floorPlan';
import type { Transform } from '@/types/scene';
import { useModelFootprintStore } from '@/stores/modelFootprintStore';

const MIN_WALL_LENGTH = 0.05;
const WHEEL_ZOOM_SENSITIVITY = 0.001;
const OPENING_LONG_PRESS_MS = 450;
const OPENING_LONG_PRESS_MOVE_TOLERANCE = 8;

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
  const [panDrag, setPanDrag] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanZ: number;
  } | null>(null);
  const [openingDrag, setOpeningDrag] = useState<{
    openingId: string;
    pointerId: number;
    startOffset: number;
  } | null>(null);
  const [openingDragOffset, setOpeningDragOffset] = useState<number | null>(null);
  const openingLongPressRef = useRef<{
    openingId: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);
  const openingLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entityDrag, setEntityDrag] = useState<{
    entityId: string;
    pointerId: number;
    startPoint: Vec2;
    startTransform: Transform;
  } | null>(null);
  const [entityDragPreview, setEntityDragPreview] = useState<Transform | null>(null);

  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const entities = useSceneStore((s) => s.document.entities);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const setSelection = useSceneStore((s) => s.setSelection);
  const toggleSelection = useSceneStore((s) => s.toggleSelection);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const hoveredEntityId = useSceneStore((s) => s.hoveredEntityId);
  const footprints = useModelFootprintStore((s) => s.footprints);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const gridVisible = useSceneStore((s) => s.document.settings.gridVisible);
  const floorPlanSelection = useSceneStore((s) => s.floorPlanSelection);
  const setFloorPlanSelection = useSceneStore((s) => s.setFloorPlanSelection);
  const hoveredFloorPlanId = useSceneStore((s) => s.hoveredFloorPlanId);
  const setHoveredFloorPlan = useSceneStore((s) => s.setHoveredFloorPlan);

  const floorPlanTool = useEditorStore((s) => s.floorPlanTool);
  const floorPlanZoom = useEditorStore((s) => s.floorPlanZoom);
  const floorPlanPanX = useEditorStore((s) => s.floorPlanPanX);
  const floorPlanPanZ = useEditorStore((s) => s.floorPlanPanZ);
  const setFloorPlanPan = useEditorStore((s) => s.setFloorPlanPan);
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
      panX: floorPlanPanX,
      panZ: floorPlanPanZ,
    }),
    [size.width, size.height, floorPlanZoom, floorPlanPanX, floorPlanPanZ],
  );

  useEffect(() => {
    return () => {
      if (openingLongPressTimerRef.current) {
        clearTimeout(openingLongPressTimerRef.current);
      }
    };
  }, []);

  const clearOpeningLongPress = useCallback(() => {
    if (openingLongPressTimerRef.current) {
      clearTimeout(openingLongPressTimerRef.current);
      openingLongPressTimerRef.current = null;
    }
    openingLongPressRef.current = null;
  }, []);

  const resolveRawPoint = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, z: 0 };
      return screenToWorld(clientX - rect.left, clientY - rect.top, view);
    },
    [view],
  );

  const startOpeningLongPress = useCallback(
    (openingId: string, pointerId: number, clientX: number, clientY: number) => {
      clearOpeningLongPress();
      openingLongPressRef.current = {
        openingId,
        pointerId,
        startClientX: clientX,
        startClientY: clientY,
      };
      openingLongPressTimerRef.current = setTimeout(() => {
        openingLongPressTimerRef.current = null;
        openingLongPressRef.current = null;
        const opening = useSceneStore.getState().document.floorPlan?.openings[openingId];
        if (!opening) return;
        setOpeningDrag({ openingId, pointerId, startOffset: opening.offset });
        setOpeningDragOffset(opening.offset);
      }, OPENING_LONG_PRESS_MS);
    },
    [clearOpeningLongPress],
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { floorPlanZoom, floorPlanPanX, floorPlanPanZ, setFloorPlanView: applyView } =
        useEditorStore.getState();

      const currentView: CanvasViewState = {
        ...createDefaultViewState(el.clientWidth, el.clientHeight),
        zoom: floorPlanZoom,
        panX: floorPlanPanX,
        panZ: floorPlanPanZ,
      };
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
      const next = zoomViewAtScreen(
        currentView,
        floorPlanPanX,
        floorPlanPanZ,
        floorPlanZoom,
        sx,
        sy,
        floorPlanZoom * factor,
      );
      applyView(next.zoom, next.panX, next.panZ);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
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

      const opening = pickOpeningAtPoint(floorPlan, point);
      if (opening) return { kind: 'opening', id: opening.id };

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

    if (e.button === 2) {
      if (floorPlanTool === 'wall' && wallDrawStart) {
        resetFloorPlanDrawState();
        setAlignGuides(null);
        return;
      }
      e.preventDefault();
      setPanDrag({
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: floorPlanPanX,
        startPanZ: floorPlanPanZ,
      });
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    const rawPoint = resolveRawPoint(e.clientX, e.clientY);
    const point = resolvePoint(e.clientX, e.clientY);

    if (floorPlanTool === 'wall') {
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
      const pickedOpening = pickOpeningAtPoint(floorPlan, rawPoint);
      if (pickedOpening) {
        setFloorPlanSelection([{ kind: 'opening', id: pickedOpening.id }]);
        setOpeningPreview(null);
        if (e.button === 0) {
          startOpeningLongPress(pickedOpening.id, e.pointerId, e.clientX, e.clientY);
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }
        return;
      }
      const hit = findWallAtPoint(floorPlan, point);
      if (hit) {
        execute(createAddOpeningCommand(hit.wallId, floorPlanTool, point));
        setOpeningPreview(null);
      }
      return;
    }

    if (floorPlanTool === 'select' && e.button === 0) {
      const pickedEntity = pickEntityAtPoint(rawPoint, rootIds, entities, footprints);
      if (pickedEntity) {
        const entity = entities[pickedEntity];
        if (e.shiftKey) {
          toggleSelection(pickedEntity, true);
        } else {
          setSelection([pickedEntity]);
        }
        setFloorPlanSelection([]);
        if (entity && !entity.locked) {
          setEntityDrag({
            entityId: pickedEntity,
            pointerId: e.pointerId,
            startPoint: rawPoint,
            startTransform: cloneTransform(entity.transform),
          });
          setEntityDragPreview(null);
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }
        return;
      }
    }

    const picked = pickAt(rawPoint);

    if (picked?.kind === 'opening' && floorPlanTool === 'select' && e.button === 0) {
      setFloorPlanSelection([picked]);
      startOpeningLongPress(picked.id, e.pointerId, e.clientX, e.clientY);
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

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
    if (!picked) {
      setSelection([]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!floorPlan) return;

    if (panDrag && panDrag.pointerId === e.pointerId) {
      const next = panViewByScreenDelta(
        panDrag.startPanX,
        panDrag.startPanZ,
        view,
        e.clientX - panDrag.startX,
        e.clientY - panDrag.startY,
      );
      setFloorPlanPan(next.panX, next.panZ);
      return;
    }

    const longPress = openingLongPressRef.current;
    if (longPress && longPress.pointerId === e.pointerId && !openingDrag) {
      const dx = e.clientX - longPress.startClientX;
      const dy = e.clientY - longPress.startClientY;
      if (Math.hypot(dx, dy) > OPENING_LONG_PRESS_MOVE_TOLERANCE) {
        clearOpeningLongPress();
      }
    }

    if (openingDrag && openingDrag.pointerId === e.pointerId) {
      const opening = floorPlan.openings[openingDrag.openingId];
      const wall = opening ? floorPlan.walls[opening.wallId] : null;
      if (opening && wall) {
        const offset = resolveOpeningOffsetFromPoint(
          wall,
          opening,
          resolveRawPoint(e.clientX, e.clientY),
        );
        setOpeningDragOffset(offset);
      }
      return;
    }

    if (entityDrag && entityDrag.pointerId === e.pointerId) {
      const raw = resolveRawPoint(e.clientX, e.clientY);
      const dx = raw.x - entityDrag.startPoint.x;
      const dz = raw.z - entityDrag.startPoint.z;
      const snapped = snapToGrid2d(
        {
          x: entityDrag.startTransform.position.x + dx,
          z: entityDrag.startTransform.position.z + dz,
        },
        gridSize,
      );
      setEntityDragPreview({
        ...entityDrag.startTransform,
        position: {
          ...entityDrag.startTransform.position,
          x: snapped.x,
          z: snapped.z,
        },
      });
      return;
    }

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
    } else if (floorPlanTool === 'select') {
      setOpeningPreview(null);
      const raw = resolveRawPoint(e.clientX, e.clientY);
      const hoveredEntity = pickEntityAtPoint(raw, rootIds, entities, footprints);
      if (hoveredEntity) {
        setHoveredEntity(hoveredEntity);
        setHoveredFloorPlan(null);
      } else {
        setHoveredEntity(null);
        setHoveredFloorPlan(pickAt(raw));
      }
    } else {
      setOpeningPreview(null);
      setHoveredEntity(null);
      const hovered = pickAt(resolveRawPoint(e.clientX, e.clientY));
      setHoveredFloorPlan(hovered);
    }
  };

  const endPanDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panDrag || panDrag.pointerId !== e.pointerId) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setPanDrag(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    endPanDrag(e);
    if (openingDrag && openingDrag.pointerId === e.pointerId) {
      setOpeningDrag(null);
      setOpeningDragOffset(null);
    }
    if (openingLongPressRef.current?.pointerId === e.pointerId) {
      clearOpeningLongPress();
    }
    if (entityDrag && entityDrag.pointerId === e.pointerId) {
      setEntityDrag(null);
      setEntityDragPreview(null);
    }
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (panDrag && panDrag.pointerId === e.pointerId) {
      endPanDrag(e);
      return;
    }

    if (openingDrag && openingDrag.pointerId === e.pointerId) {
      const opening = floorPlan?.openings[openingDrag.openingId];
      if (
        opening &&
        openingDragOffset !== null &&
        openingDragOffset !== openingDrag.startOffset
      ) {
        execute(
          createUpdateOpeningCommand(
            openingDrag.openingId,
            { offset: openingDragOffset },
            { offset: openingDrag.startOffset },
          ),
        );
      }
      setOpeningDrag(null);
      setOpeningDragOffset(null);
      clearOpeningLongPress();
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      return;
    }

    if (openingLongPressRef.current?.pointerId === e.pointerId) {
      clearOpeningLongPress();
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    }

    if (entityDrag && entityDrag.pointerId === e.pointerId) {
      const entity = entities[entityDrag.entityId];
      if (
        entity &&
        entityDragPreview &&
        (entityDragPreview.position.x !== entityDrag.startTransform.position.x ||
          entityDragPreview.position.z !== entityDrag.startTransform.position.z)
      ) {
        execute(
          createUpdateTransformCommand(
            entityDrag.entityId,
            entityDragPreview,
            entity.transform,
          ),
        );
      }
      setEntityDrag(null);
      setEntityDragPreview(null);
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      return;
    }

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

  const gridLines = gridVisible ? buildVisibleGridLines(view, gridSize) : [];
  const isPanning = panDrag !== null;
  const showWallAnnotations = shouldShowWallAnnotations(floorPlanTool, {
    wallDrawStart,
    rectDrawStart,
    dragEndpoint: dragEndpoint !== null,
  });
  const isOpeningDragging = openingDrag !== null;
  const isEntityDragging = entityDrag !== null;
  const selectedEntitySet = new Set(selectedIds);

  return (
    <div ref={containerRef} className="floor-plan-canvas">
      <svg
        width={size.width}
        height={size.height}
        className={`floor-plan-canvas__svg${isWallDrawing ? ' floor-plan-canvas__svg--drawing-wall' : ''}${isPanning ? ' floor-plan-canvas__svg--panning' : ''}${isOpeningDragging ? ' floor-plan-canvas__svg--dragging-opening' : ''}${isEntityDragging ? ' floor-plan-canvas__svg--dragging-entity' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => {
          e.preventDefault();
          if (floorPlanTool === 'wall' && wallDrawStart) {
            resetFloorPlanDrawState();
            setAlignGuides(null);
          }
        }}
      >
        <rect width="100%" height="100%" fill="#eef2f7" />

        {gridLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.major ? '#94a3b8' : '#cbd5e1'}
            strokeWidth={line.major ? 1 : 0.5}
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
          const wallOpenings = getOpeningsOnWall(floorPlan.openings, floorPlan.openingIds, id).map(
            (opening) =>
              openingDrag?.openingId === opening.id && openingDragOffset !== null
                ? { ...opening, offset: openingDragOffset }
                : opening,
          );
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

        {showWallAnnotations && (
          <WallAnnotations2D floorPlan={floorPlan} view={view} />
        )}

        {floorPlan.openingIds.map((id) => {
          const opening = floorPlan.openings[id];
          const wall = floorPlan.walls[opening.wallId];
          if (!wall) return null;
          if (openingDrag?.openingId === id) return null;
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

        {openingDrag && openingDragOffset !== null && (() => {
          const opening = floorPlan.openings[openingDrag.openingId];
          const wall = opening ? floorPlan.walls[opening.wallId] : null;
          if (!opening || !wall) return null;
          return (
            <OpeningSymbol2D
              key="opening-drag-preview"
              wall={wall}
              opening={{ ...opening, offset: openingDragOffset }}
              view={view}
              isPreview
              showDimensions
            />
          );
        })()}

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
              showDimensions
            />
          );
        })()}

        {rootIds.map((id) => {
          const entity = entities[id];
          if (!entity || entity.visible === false) return null;
          const isDraggingThis = entityDrag?.entityId === id;
          const previewTransform =
            isDraggingThis && entityDragPreview ? entityDragPreview : undefined;
          return (
            <ModelSymbol2D
              key={id}
              entityId={id}
              entity={entity}
              view={view}
              transformOverride={previewTransform}
              isSelected={selectedEntitySet.has(id)}
              isHovered={hoveredEntityId === id}
              isPreview={isDraggingThis}
            />
          );
        })}

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
