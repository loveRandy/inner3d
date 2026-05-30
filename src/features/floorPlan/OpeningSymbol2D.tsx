import type { Opening, WallSegment } from '@/types/floorPlan';
import {
  getDoorSymbol2D,
  getOpeningDimensions,
  getWindowSymbol2D,
} from '@/lib/floorPlan/openingRender';
import { pointOnWallAtOffset } from '@/lib/floorPlan/wallGeometry';
import {
  formatLengthMm,
  worldToScreen,
  type CanvasViewState,
} from '@/lib/floorPlan/canvasView';

function pointsToSvg(
  points: { x: number; z: number }[],
  view: CanvasViewState,
): string {
  return points
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
}

function DimLabel({
  x,
  y,
  text,
  highlight,
}: {
  x: number;
  y: number;
  text: string;
  highlight?: boolean;
}) {
  const label = `${text}`;
  const boxW = label.length * 7 + 14;
  return (
    <g pointerEvents="none">
      <rect
        x={x - boxW / 2}
        y={y - 11}
        width={boxW}
        height={20}
        rx={2}
        className={`floor-plan-canvas__dim-box${highlight ? ' floor-plan-canvas__dim-box--active' : ''}`}
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        className={`floor-plan-canvas__dim${highlight ? ' floor-plan-canvas__dim--active' : ''}`}
      >
        {label}
      </text>
    </g>
  );
}

function DimensionLines({
  wall,
  opening,
  view,
  isPreview,
}: {
  wall: WallSegment;
  opening: Opening;
  view: CanvasViewState;
  isPreview?: boolean;
}) {
  const dim = getOpeningDimensions(wall, opening);
  const ws = worldToScreen(dim.wallStart, view);
  const we = worldToScreen(dim.wallEnd, view);
  const os = worldToScreen(dim.openingStart, view);
  const oe = worldToScreen(dim.openingEnd, view);
  const midOpening = { x: (os.x + oe.x) / 2, y: (os.y + oe.y) / 2 };

  const offsetY = -22;

  return (
    <g className="floor-plan-canvas__opening-dims" pointerEvents="none">
      <line x1={ws.x} y1={ws.y + offsetY} x2={os.x} y2={os.y + offsetY} className="floor-plan-canvas__dim-line" />
      <line x1={oe.x} y1={oe.y + offsetY} x2={we.x} y2={we.y + offsetY} className="floor-plan-canvas__dim-line" />
      <line x1={os.x} y1={os.y} x2={os.x} y2={os.y + offsetY} className="floor-plan-canvas__dim-line" />
      <line x1={oe.x} y1={oe.y} x2={oe.x} y2={oe.y + offsetY} className="floor-plan-canvas__dim-line" />

      <DimLabel
        x={(ws.x + os.x) / 2}
        y={os.y + offsetY}
        text={formatLengthMm(dim.leftMm / 1000)}
        highlight={isPreview}
      />
      <DimLabel x={midOpening.x} y={midOpening.y + offsetY - 14} text={formatLengthMm(opening.width)} />
      <DimLabel
        x={(oe.x + we.x) / 2}
        y={oe.y + offsetY}
        text={formatLengthMm(dim.rightMm / 1000)}
      />
    </g>
  );
}

export function OpeningSymbol2D({
  wall,
  opening,
  view,
  isPreview,
  isSelected,
  showDimensions = false,
}: {
  wall: WallSegment;
  opening: Opening;
  view: CanvasViewState;
  isPreview?: boolean;
  isSelected?: boolean;
  /** 放置/拖动预览时展示标尺 */
  showDimensions?: boolean;
}) {
  const classSuffix = `${isPreview ? ' is-preview' : ''}${isSelected ? ' is-selected' : ''}`;
  const dimsActive = isPreview || showDimensions;
  const dims = dimsActive ? (
    <DimensionLines wall={wall} opening={opening} view={view} isPreview={dimsActive} />
  ) : null;

  if (opening.type === 'window') {
    const win = getWindowSymbol2D(wall, opening);
    return (
      <g className={`floor-plan-canvas__opening-symbol${classSuffix}`}>
        <polygon
          points={pointsToSvg(win.corners, view)}
          className="floor-plan-canvas__window-symbol"
        />
        <line
          x1={worldToScreen(win.corners[0], view).x}
          y1={worldToScreen(win.corners[0], view).y}
          x2={worldToScreen(win.corners[2], view).x}
          y2={worldToScreen(win.corners[2], view).y}
          className="floor-plan-canvas__window-cross"
        />
        <line
          x1={worldToScreen(win.corners[1], view).x}
          y1={worldToScreen(win.corners[1], view).y}
          x2={worldToScreen(win.corners[3], view).x}
          y2={worldToScreen(win.corners[3], view).y}
          className="floor-plan-canvas__window-cross"
        />
        {dims}
      </g>
    );
  }

  if (opening.type === 'opening') {
    const os = worldToScreen(pointOnWallAtOffset(wall, opening.offset), view);
    const oe = worldToScreen(
      pointOnWallAtOffset(wall, opening.offset + opening.width),
      view,
    );
    return (
      <g className={`floor-plan-canvas__opening-symbol${classSuffix}`}>
        <line
          x1={os.x}
          y1={os.y}
          x2={oe.x}
          y2={oe.y}
          className="floor-plan-canvas__opening-hole"
          strokeWidth={6}
        />
        {dims}
      </g>
    );
  }

  const door = getDoorSymbol2D(wall, opening);
  const hingeS = worldToScreen(door.hinge, view);
  const leafS = worldToScreen(door.leafEnd, view);
  const frameS = worldToScreen(door.frameEnd, view);

  const r = Math.hypot(leafS.x - hingeS.x, leafS.y - hingeS.y);
  const arcScreenPath = `M ${leafS.x} ${leafS.y} A ${r} ${r} 0 0 1 ${frameS.x} ${frameS.y}`;

  return (
    <g className={`floor-plan-canvas__opening-symbol floor-plan-canvas__opening-symbol--door${classSuffix}`}>
      <path d={arcScreenPath} className="floor-plan-canvas__door-arc" fill="none" />
      <line
        x1={hingeS.x}
        y1={hingeS.y}
        x2={leafS.x}
        y2={leafS.y}
        className="floor-plan-canvas__door-leaf"
      />
      <line
        x1={hingeS.x}
        y1={hingeS.y}
        x2={frameS.x}
        y2={frameS.y}
        className="floor-plan-canvas__door-frame-line"
      />
      <circle cx={hingeS.x} cy={hingeS.y} r={3} className="floor-plan-canvas__door-hinge" />
      {dims}
    </g>
  );
}
