import type { FloorPlanTool, Vec2 } from '@/types/floorPlan';

export function isFloorPlanDrawingInProgress(state: {
  floorPlanTool: FloorPlanTool;
  wallDrawStart: Vec2 | null;
  rectDrawStart: Vec2 | null;
}): boolean {
  if (state.floorPlanTool === 'wall' && state.wallDrawStart !== null) return true;
  if (state.floorPlanTool === 'rectWall' && state.rectDrawStart !== null) return true;
  return false;
}

/** 选择工具且未在绘制/拖拽端点时展示墙体长度标注 */
export function shouldShowWallAnnotations(
  tool: FloorPlanTool,
  state: {
    wallDrawStart: Vec2 | null;
    rectDrawStart: Vec2 | null;
    dragEndpoint: boolean;
  },
): boolean {
  if (tool !== 'select') return false;
  if (state.wallDrawStart || state.rectDrawStart || state.dragEndpoint) return false;
  return true;
}
