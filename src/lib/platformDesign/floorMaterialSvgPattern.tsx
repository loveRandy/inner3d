import { getViewScale, type CanvasViewState } from '@/lib/floorPlan/canvasView';
import {
  getFloorMaterialPatternSizeM,
  getFloorMaterialThumbnailUrl,
} from '@/lib/platformDesign/floorMaterialTextures';

export function floorMaterialPatternDomId(presetId: string): string {
  return `floor-mat-${presetId.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
}

export function FloorMaterialTexturePatternDefs({
  patternId,
  presetId,
  view,
}: {
  patternId: string;
  presetId: string;
  view: CanvasViewState;
}) {
  const scale = getViewScale(view);
  const sizeM = getFloorMaterialPatternSizeM(presetId);
  const pw = Math.max(sizeM.x * scale, 8);
  const ph = Math.max(sizeM.z * scale, 8);
  const thumb = getFloorMaterialThumbnailUrl(presetId);

  return (
    <pattern id={patternId} patternUnits="userSpaceOnUse" width={pw} height={ph}>
      <image href={thumb} x={0} y={0} width={pw} height={ph} preserveAspectRatio="none" />
    </pattern>
  );
}
