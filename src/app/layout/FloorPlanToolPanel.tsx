import { useEditorStore } from '@/stores/editorStore';
import type { FloorPlanTool } from '@/types/floorPlan';

const TOOL_LABELS: Record<FloorPlanTool, string> = {
  select: '选择 (V)',
  wall: '直墙 (B)',
  rectWall: '矩形墙 (F)',
  door: '门 (D)',
  window: '窗 (W)',
  opening: '门洞 (N)',
};

export function FloorPlanToolPanel() {
  const floorPlanTool = useEditorStore((s) => s.floorPlanTool);
  const setFloorPlanTool = useEditorStore((s) => s.setFloorPlanTool);
  const setSaveMessage = useEditorStore((s) => s.setSaveMessage);

  const handleImportPlaceholder = () => {
    setSaveMessage('导入 CAD/JPG 功能即将推出');
    window.setTimeout(() => setSaveMessage(null), 2500);
  };

  return (
    <aside className="floor-plan-panel">
      <div className="panel-header">画户型</div>

      <div className="floor-plan-panel__section">
        <div className="floor-plan-panel__section-title">导入户型</div>
        <button type="button" className="floor-plan-panel__disabled" onClick={handleImportPlaceholder}>
          导入 CAD / JPG（即将推出）
        </button>
      </div>

      <div className="floor-plan-panel__section">
        <div className="floor-plan-panel__section-title">画房间</div>
        <div className="floor-plan-panel__tools">
          {(['select', 'wall', 'rectWall'] as FloorPlanTool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              className={`floor-plan-panel__tool${floorPlanTool === tool ? ' is-active' : ''}`}
              onClick={() => setFloorPlanTool(tool)}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
        </div>
      </div>

      <div className="floor-plan-panel__section">
        <div className="floor-plan-panel__section-title">放门窗</div>
        <div className="floor-plan-panel__tools">
          {(['door', 'window', 'opening'] as FloorPlanTool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              className={`floor-plan-panel__tool${floorPlanTool === tool ? ' is-active' : ''}`}
              onClick={() => setFloorPlanTool(tool)}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
