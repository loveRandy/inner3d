import { Bounds, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { WallMeshLayer } from '@/features/floorPlan/WallMeshLayer';
import { RoomFloorMeshLayer } from '@/features/floorPlan/RoomFloorMeshLayer';

export function PlatformPreviewViewport() {
  const platformDesignMode = useEditorStore((s) => s.platformDesignMode);
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const ambientIntensity = useSceneStore((s) => s.document.settings.ambientIntensity);

  const roomId = platformDesignMode?.roomId;
  const room = roomId && floorPlan ? floorPlan.rooms[roomId] : null;

  const roomFilter = useMemo(() => {
    if (!roomId) return undefined;
    return new Set([roomId]);
  }, [roomId]);

  const wallFilter = useMemo(() => {
    if (!room) return new Set<string>();
    return new Set(room.wallLoop);
  }, [room]);

  const presetOverrides = useMemo(() => {
    if (!roomId || !platformDesignMode) return undefined;
    return { [roomId]: platformDesignMode.draftPresetId };
  }, [roomId, platformDesignMode]);

  const filteredWallIds = useMemo(() => {
    if (!floorPlan) return [];
    return floorPlan.wallIds.filter((id) => wallFilter.has(id));
  }, [floorPlan, wallFilter]);

  if (!floorPlan || !room || !platformDesignMode) return null;

  return (
    <div className="platform-preview-viewport">
      <Canvas
        shadows
        camera={{ fov: 42, near: 0.1, far: 200 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={Math.max(ambientIntensity, 0.85)} />
        <directionalLight position={[12, 18, 8]} intensity={0.75} castShadow />
        <directionalLight position={[-8, 12, -6]} intensity={0.45} />
        <hemisphereLight args={['#ffffff', '#e2e8f0', 0.5]} />

        <Bounds fit clip observe margin={1.35}>
          <group>
            <RoomFloorMeshLayer
              floorPlan={floorPlan}
              presetOverrides={presetOverrides}
              roomFilter={roomFilter}
            />
            <WallMeshLayer
              walls={floorPlan.walls}
              wallIds={filteredWallIds}
              openings={floorPlan.openings}
              openingIds={floorPlan.openingIds}
              selection={[]}
            />
          </group>
        </Bounds>

        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.05}
          enablePan={false}
          minDistance={0.5}
          maxDistance={80}
        />
      </Canvas>
    </div>
  );
}
