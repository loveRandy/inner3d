import { TopBar } from './TopBar';
import { ModelPanel } from './ModelPanel';
import { PropertyPanel } from './PropertyPanel';
import { TopView } from './TopView';
import { ConfirmDialog } from './ConfirmDialog';
import { SceneViewport } from '@/features/scene/SceneViewport';
import { MaterialEditorLayout } from '@/features/material/MaterialEditorLayout';
import { useEditorStore } from '@/stores/editorStore';

export function EditorLayout() {
  const materialModeActive = useEditorStore((s) => s.materialMode?.active);

  return (
    <div className="editor">
      <TopBar />
      {materialModeActive ? (
        <MaterialEditorLayout />
      ) : (
        <div className="editor__main">
          <ModelPanel />
          <SceneViewport />
          <aside className="editor__right">
            <TopView />
            <PropertyPanel />
          </aside>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
