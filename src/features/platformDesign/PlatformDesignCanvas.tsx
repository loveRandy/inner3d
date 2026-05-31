import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import {
  createSetFloorMaterialCommand,
  usePlatformHistoryStore,
} from '@/stores/platformHistoryStore';
import {
  createDefaultViewState,
  fitViewToPolygon,
  panViewByScreenDelta,
  screenToWorld,
  zoomViewAtScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';
import { getRoomFloorPolygon } from '@/lib/floorPlan/roomFloorPolygon';
import { pointInPolygon } from '@/lib/scene/modelFootprint';
import { RoomFloorFill2D } from './RoomFloorFill2D';
import { PlatformDimensionAnnotations } from './PlatformDimensionAnnotations';
import { FloorMaterialCursorGhost } from './FloorMaterialCursorGhost';

const RIGHT_DRAG_THRESHOLD = 4;
const WHEEL_ZOOM_SENSITIVITY = 0.0012;

export function PlatformDesignCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [floorHovered, setFloorHovered] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [ghostVisible, setGhostVisible] = useState(false);

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

  const platformDesignMode = useEditorStore((s) => s.platformDesignMode);
  const setPlatformCanvasView = useEditorStore((s) => s.setPlatformCanvasView);
  const setDraftFloorPresetId = useEditorStore((s) => s.setDraftFloorPresetId);
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const execute = usePlatformHistoryStore((s) => s.execute);

  const roomId = platformDesignMode?.roomId;
  const room = roomId && floorPlan ? floorPlan.rooms[roomId] : null;

  const polygon = useMemo(() => {
    if (!floorPlan || !room) return [];
    return getRoomFloorPolygon(floorPlan, room);
  }, [floorPlan, room]);

  const view = useMemo((): CanvasViewState => {
    const base = platformDesignMode?.canvasView ?? createDefaultViewState(size.width, size.height);
    return { ...base, width: size.width, height: size.height };
  }, [platformDesignMode?.canvasView, size.width, size.height]);

  const resolvePoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, z: 0 };
      const rect = el.getBoundingClientRect();
      return screenToWorld(clientX - rect.left, clientY - rect.top, view);
    },
    [view],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      setSize({ width, height });
      setPlatformCanvasView({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setPlatformCanvasView]);

  useEffect(() => {
    if (!polygon.length) return;
    const fit = fitViewToPolygon(polygon);
    setPlatformCanvasView({ ...fit, width: size.width, height: size.height });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit once on mount / room change
  }, [roomId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !platformDesignMode) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { canvasView } = useEditorStore.getState().platformDesignMode!;
      const currentView: CanvasViewState = { ...canvasView, width: el.clientWidth, height: el.clientHeight };
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
      const next = zoomViewAtScreen(
        currentView,
        canvasView.panX,
        canvasView.panZ,
        canvasView.zoom,
        sx,
        sy,
        canvasView.zoom * factor,
      );
      setPlatformCanvasView(next);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [platformDesignMode, setPlatformCanvasView]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!platformDesignMode) return;

    if (e.button === 2) {
      e.preventDefault();
      rightPointerRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        panning: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    const activePresetId = platformDesignMode.activePresetId;
    if (!activePresetId) return;

    const point = resolvePoint(e.clientX, e.clientY);
    if (!pointInPolygon(point, polygon)) return;

    const oldPresetId = platformDesignMode.draftPresetId;
    if (oldPresetId === activePresetId) return;

    execute(
      createSetFloorMaterialCommand(oldPresetId, activePresetId, setDraftFloorPresetId),
    );
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setGhostVisible(inside && !!platformDesignMode?.activePresetId);
      setGhostPos({ x: e.clientX, y: e.clientY });
    }

    const rightPointer = rightPointerRef.current;
    if (rightPointer && rightPointer.pointerId === e.pointerId && !rightPointer.panning) {
      const dx = e.clientX - rightPointer.startX;
      const dy = e.clientY - rightPointer.startY;
      if (Math.hypot(dx, dy) > RIGHT_DRAG_THRESHOLD) {
        rightPointer.panning = true;
        setIsPanning(true);
        setPanDrag({
          pointerId: e.pointerId,
          startX: rightPointer.startX,
          startY: rightPointer.startY,
          startPanX: view.panX,
          startPanZ: view.panZ,
        });
      }
    }

    if (panDrag && panDrag.pointerId === e.pointerId) {
      const next = panViewByScreenDelta(
        panDrag.startPanX,
        panDrag.startPanZ,
        view,
        e.clientX - panDrag.startX,
        e.clientY - panDrag.startY,
      );
      setPlatformCanvasView(next);
      return;
    }

    if (platformDesignMode?.activePresetId && polygon.length >= 3) {
      const point = resolvePoint(e.clientX, e.clientY);
      setFloorHovered(pointInPolygon(point, polygon));
    } else {
      setFloorHovered(false);
    }
  };

  const endPanDrag = () => {
    setPanDrag(null);
    setIsPanning(false);
    rightPointerRef.current = null;
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (panDrag?.pointerId === e.pointerId || rightPointerRef.current?.pointerId === e.pointerId) {
      endPanDrag();
    }
  };

  const handleDoubleClick = () => {
    if (!polygon.length) return;
    const fit = fitViewToPolygon(polygon);
    setPlatformCanvasView({ ...fit, width: size.width, height: size.height });
  };

  if (!platformDesignMode || !room) return null;

  const cursorClass = platformDesignMode.activePresetId
    ? 'platform-design-canvas__svg--paint'
    : '';

  return (
    <div
      ref={containerRef}
      className="platform-design-canvas"
    >
      <svg
        width={size.width}
        height={size.height}
        className={`platform-design-canvas__svg${isPanning ? ' platform-design-canvas__svg--panning' : ''} ${cursorClass}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <rect width="100%" height="100%" className="platform-design-canvas__bg" />
        <RoomFloorFill2D
          polygon={polygon}
          presetId={platformDesignMode.draftPresetId}
          view={view}
          hovered={floorHovered && !!platformDesignMode.activePresetId}
        />
        <PlatformDimensionAnnotations polygon={polygon} view={view} />
      </svg>
      {platformDesignMode.activePresetId && (
        <FloorMaterialCursorGhost
          presetId={platformDesignMode.activePresetId}
          x={ghostPos.x}
          y={ghostPos.y}
          visible={ghostVisible}
        />
      )}
    </div>
  );
}
