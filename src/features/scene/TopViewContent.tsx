import { Grid } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { WallMeshLayer } from '@/features/floorPlan/WallMeshLayer';
import { RoomFloorMeshLayer } from '@/features/floorPlan/RoomFloorMeshLayer';
import { useSceneStore } from '@/stores/sceneStore';
import { SceneObject } from './SceneObject';
import { FixedTopDownCamera } from './FixedTopDownCamera';

const TOP_VIEW_WORLD_SPAN = 16;

export function TopViewContent() {
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const entities = useSceneStore((s) => s.document.entities);
  const gridVisible = useSceneStore((s) => s.document.settings.gridVisible);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const ambientIntensity = useSceneStore((s) => s.document.settings.ambientIntensity);
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const floorPlanSelection = useSceneStore((s) => s.floorPlanSelection);
  const setSelection = useSceneStore((s) => s.setSelection);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);

  const handleMiss = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setSelection([]);
    setHoveredEntity(null);
  };

  return (
    <>
      <color attach="background" args={['#eef2f7']} />
      <FixedTopDownCamera worldSpan={TOP_VIEW_WORLD_SPAN} />

      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[0, 20, 0]} intensity={0.9} />

      {gridVisible && (
        <Grid
          args={[TOP_VIEW_WORLD_SPAN, TOP_VIEW_WORLD_SPAN]}
          cellSize={gridSize}
          cellThickness={0.5}
          cellColor="#cbd5e1"
          sectionSize={gridSize * 5}
          sectionThickness={0.8}
          sectionColor="#94a3b8"
          fadeDistance={TOP_VIEW_WORLD_SPAN}
          infiniteGrid={false}
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onPointerDown={handleMiss}>
        <planeGeometry args={[TOP_VIEW_WORLD_SPAN, TOP_VIEW_WORLD_SPAN]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {floorPlan && (
        <>
          <RoomFloorMeshLayer floorPlan={floorPlan} />
          <WallMeshLayer
            walls={floorPlan.walls}
            wallIds={floorPlan.wallIds}
            openings={floorPlan.openings}
            openingIds={floorPlan.openingIds}
            selection={floorPlanSelection}
          />
        </>
      )}

      {rootIds.map((id) => {
        const entity = entities[id];
        if (!entity) return null;
        return <SceneObject key={id} entityId={id} registerSceneRef={false} />;
      })}
    </>
  );
}
