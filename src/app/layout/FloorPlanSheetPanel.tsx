import { FloorPlanSheetCanvas } from '@/features/floorPlan/FloorPlanSheetCanvas';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

export function FloorPlanSheetPanel() {
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);

  const hasWalls = floorPlan && floorPlan.wallIds.length > 0;

  return (
    <div className="floor-plan-sheet">
      <div className="panel-header">户型平面图</div>
      {hasWalls ? (
        <FloorPlanSheetCanvas />
      ) : (
        <div className="floor-plan-sheet__empty">
          <p className="floor-plan-sheet__empty-text">请先在画户型模式中绘制墙体</p>
          <button
            type="button"
            className="floor-plan-sheet__empty-btn"
            onClick={() => setEditorMode('floorPlan')}
          >
            前往画户型
          </button>
        </div>
      )}
    </div>
  );
}
