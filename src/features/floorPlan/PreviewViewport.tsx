import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSceneStore } from '@/stores/sceneStore';
import { SceneObject } from '@/features/scene/SceneObject';
import { WallMeshLayer } from './WallMeshLayer';

export function PreviewViewport() {
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const entities = useSceneStore((s) => s.document.entities);
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const floorPlanSelection = useSceneStore((s) => s.floorPlanSelection);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const ambientIntensity = useSceneStore((s) => s.document.settings.ambientIntensity);

  if (!floorPlan) return null;

  return (
    <div className="preview-viewport">
      <Canvas shadows camera={{ position: [8, 10, 8], fov: 45 }}>
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={Math.max(ambientIntensity, 0.65)} />
        <directionalLight position={[12, 18, 8]} intensity={0.95} castShadow />
        <directionalLight position={[-6, 10, -4]} intensity={0.35} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>

        <gridHelper args={[30, Math.round(30 / gridSize), '#cbd5e1', '#e2e8f0']} />

        <WallMeshLayer
          walls={floorPlan.walls}
          wallIds={floorPlan.wallIds}
          openings={floorPlan.openings}
          openingIds={floorPlan.openingIds}
          selection={floorPlanSelection}
        />

        {rootIds.map((id) => {
          const entity = entities[id];
          if (!entity) return null;
          return <SceneObject key={id} entityId={id} registerSceneRef={false} />;
        })}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
    </div>
  );
}