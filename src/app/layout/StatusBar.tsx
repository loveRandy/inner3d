import { useEditorStore } from '@/stores/editorStore';
import type { FloorPlanTool } from '@/types/floorPlan';

const TOOL_NAMES: Record<FloorPlanTool, string> = {
  select: '选择',
  wall: '直墙',
  rectWall: '矩形墙',
  door: '门',
  window: '窗',
  opening: '门洞',
};

export function StatusBar() {
  const editorMode = useEditorStore((s) => s.editorMode);
  const floorPlanTool = useEditorStore((s) => s.floorPlanTool);
  const floorPlanZoom = useEditorStore((s) => s.floorPlanZoom);
  const setFloorPlanZoom = useEditorStore((s) => s.setFloorPlanZoom);

  const isFloorPlan = editorMode === 'floorPlan';

  return (
    <footer className="status-bar">
      <span className="status-bar__item">
        {isFloorPlan ? '2D 画户型' : '3D 摆家具'}
      </span>
      {isFloorPlan && (
        <span className="status-bar__item">工具：{TOOL_NAMES[floorPlanTool]}</span>
      )}
      {isFloorPlan && (
        <span className="status-bar__item">吸附：开</span>
      )}
      {isFloorPlan && (
        <span className="status-bar__item status-bar__zoom">
          缩放
          <button type="button" onClick={() => setFloorPlanZoom(floorPlanZoom - 0.1)} aria-label="缩小">
            −
          </button>
          {Math.round(floorPlanZoom * 100)}%
          <button type="button" onClick={() => setFloorPlanZoom(floorPlanZoom + 0.1)} aria-label="放大">
            +
          </button>
        </span>
      )}
      {isFloorPlan && (
        <span className="status-bar__hint">
          左键落点 · 滚轮缩放 · 右键拖动画布 · 选择工具下点击选中门窗 · Delete 删除 · 长按拖动门窗 · Shift 正交 · 空格 切换定位线
        </span>
      )}
    </footer>
  );
}
