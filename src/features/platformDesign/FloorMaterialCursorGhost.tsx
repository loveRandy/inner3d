import { getFloorMaterialThumbnailUrl } from '@/lib/platformDesign/floorMaterialTextures';

export function FloorMaterialCursorGhost({
  presetId,
  x,
  y,
  visible,
}: {
  presetId: string;
  x: number;
  y: number;
  visible: boolean;
}) {
  if (!visible) return null;

  const thumb = getFloorMaterialThumbnailUrl(presetId);

  return (
    <div
      className="floor-material-cursor-ghost"
      style={{ left: x + 12, top: y + 12, backgroundImage: `url(${thumb})` }}
      aria-hidden
    />
  );
}
