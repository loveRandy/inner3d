import { Canvas } from '@react-three/fiber';
import { SceneContent } from './SceneContent';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';

export function SceneViewport() {
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const clearEntitySelection = useSceneStore((s) => s.clearEntitySelection);
  const setSelectedRoomId = useSceneStore((s) => s.setSelectedRoomId);

  const handlePointerMissed = () => {
    setHoveredEntity(null);

    const { isTransformDragging, gizmoPointerActive } = useEditorStore.getState();
    if (isTransformDragging || gizmoPointerActive) return;
    if (placementAssetId) return;

    clearEntitySelection();
    setSelectedRoomId(null);
  };

  return (
    <div className={`scene-viewport${placementAssetId ? ' scene-viewport--placing' : ''}`}>
      <Canvas
        shadows
        camera={{ position: [8, 6, 8], fov: 50 }}
        onPointerMissed={handlePointerMissed}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
