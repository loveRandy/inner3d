import { Grid, OrbitControls, Sky } from '@react-three/drei';
import { useSceneStore } from '@/stores/sceneStore';
import { SceneObject } from './SceneObject';
import { PlacementPreview } from './PlacementPreview';
import { TransformGizmo } from './TransformGizmo';
import { SceneOutlines } from './SceneOutlines';
import { SceneInteraction } from './SceneInteraction';
import { MaterialModeButton } from '@/features/material/MaterialModeButton';

export function SceneContent() {
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const entities = useSceneStore((s) => s.document.entities);
  const gridVisible = useSceneStore((s) => s.document.settings.gridVisible);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const ambientIntensity = useSceneStore((s) => s.document.settings.ambientIntensity);
  const backgroundColor = useSceneStore((s) => s.document.settings.backgroundColor);
  const placementAssetId = useSceneStore((s) => s.placementAssetId);

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <Sky
        distance={450000}
        sunPosition={[80, 32, 40]}
        inclination={0.52}
        azimuth={0.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
        rayleigh={0.4}
        turbidity={6}
      />

      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <hemisphereLight args={['#dbeafe', '#f8fafc', 0.35]} />

      <SceneInteraction />

      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />

      {gridVisible && (
        <Grid
          args={[20, 20]}
          cellSize={gridSize}
          cellThickness={0.6}
          cellColor="#94a3b8"
          sectionSize={gridSize * 5}
          sectionThickness={1}
          sectionColor="#64748b"
          fadeDistance={40}
          infiniteGrid
        />
      )}

      {rootIds.map((id) => {
        const entity = entities[id];
        if (!entity) return null;
        return <SceneObject key={id} entityId={id} />;
      })}

      {placementAssetId && <PlacementPreview />}
      <SceneOutlines />
      <MaterialModeButton />
      <TransformGizmo />
    </>
  );
}
