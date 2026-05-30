import type { FloorPlanTool, Vec2 } from '@/types/floorPlan';

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
