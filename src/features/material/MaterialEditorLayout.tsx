import { MaterialLibraryPanel } from './MaterialLibraryPanel';
import { MaterialPreviewViewport } from './MaterialPreviewViewport';
import { MaterialPartTree } from './MaterialPartTree';
import { MaterialPartProperties } from './MaterialPartProperties';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

export function MaterialEditorLayout() {
  const materialMode = useEditorStore((s) => s.materialMode);
  const entity = useSceneStore((s) =>
    materialMode ? s.document.entities[materialMode.entityId] : undefined,
  );

  if (!materialMode) return null;

  return (
    <div className="material-editor">
      <MaterialLibraryPanel />
      <MaterialPreviewViewport />
      <aside className="material-editor__right">
        <div className="panel-header">
          {entity?.name ?? '模型属性'}
        </div>
        <MaterialPartTree root={materialMode.partTree} />
        <MaterialPartProperties />
      </aside>
    </div>
  );
}
