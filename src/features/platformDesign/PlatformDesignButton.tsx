import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import type { FloorPlan } from '@/types/floorPlan';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

function PlatformDesignButtonInner({ roomId }: { roomId: string }) {
  const enterPlatformDesignMode = useEditorStore((s) => s.enterPlatformDesignMode);

  const handleActivate = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    enterPlatformDesignMode(roomId);
  };

  return (
    <button
      type="button"
      className="platform-design-button"
      onPointerDown={handleActivate}
    >
      地台设计 &gt;
    </button>
  );
}

function RoomPlatformButton({
  floorPlan,
  roomId,
}: {
  floorPlan: FloorPlan;
  roomId: string;
}) {
  const position = useMemo(() => {
    const room = floorPlan.rooms[roomId];
    if (!room) return [0, 0.35, 0] as [number, number, number];
    return [room.centroid.x, 0.35, room.centroid.z] as [number, number, number];
  }, [floorPlan, roomId]);

  return (
    <Html
      center
      position={position}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'auto' }}
      wrapperClass="platform-design-button-wrapper"
    >
      <PlatformDesignButtonInner roomId={roomId} />
    </Html>
  );
}

export function PlatformDesignButton() {
  const selectedRoomId = useSceneStore((s) => s.selectedRoomId);
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const materialMode = useEditorStore((s) => s.materialMode);
  const platformDesignMode = useEditorStore((s) => s.platformDesignMode);
  const editorMode = useEditorStore((s) => s.editorMode);

  if (
    !selectedRoomId ||
    !floorPlan ||
    placementAssetId ||
    materialMode?.active ||
    platformDesignMode?.active ||
    editorMode !== 'furniture'
  ) {
    return null;
  }

  if (!floorPlan.rooms[selectedRoomId]) return null;

  return <RoomPlatformButton floorPlan={floorPlan} roomId={selectedRoomId} />;
}
