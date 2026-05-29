import { TopBar } from './TopBar';
import { ModelPanel } from './ModelPanel';
import { PropertyPanel } from './PropertyPanel';
import { TopView } from './TopView';
import { ConfirmDialog } from './ConfirmDialog';
import { FloorPlanToolPanel } from './FloorPlanToolPanel';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { FloorPlanPropertyPanel } from './FloorPlanPropertyPanel';
import { StatusBar } from './StatusBar';
import { SceneViewport } from '@/features/scene/SceneViewport';
import { PreviewViewport } from '@/features/floorPlan/PreviewViewport';
import { MaterialEditorLayout } from '@/features/material/MaterialEditorLayout';
import { useEditorStore } from '@/stores/editorStore';

export function EditorLayout() {
  const materialModeActive = useEditorStore((s) => s.materialMode?.active);
  const editorMode = useEditorStore((s) => s.editorMode);
  const isFloorPlan = editorMode === 'floorPlan';

  return (
    <div className="editor">
      <TopBar />
      {materialModeActive ? (
        <MaterialEditorLayout />
      ) : (
        <>
          <div className="editor__main">
            {isFloorPlan ? <FloorPlanToolPanel /> : <ModelPanel />}
            {isFloorPlan ? <FloorPlanCanvas /> : <SceneViewport />}
            <aside className="editor__right">
              {isFloorPlan ? (
                <>
                  <div className="top-view">
                    <div className="panel-header">3D 预览</div>
                    <PreviewViewport />
                  </div>
                  <FloorPlanPropertyPanel />
                </>
              ) : (
                <>
                  <TopView />
                  <PropertyPanel />
                </>
              )}
            </aside>
          </div>
          <StatusBar />
        </>
      )}
      <ConfirmDialog />
    </div>
  );
}
