import type { OpeningLayout3D } from './openingLayout3D';
import { getMountLocalZ } from './openingLayout3D';

export function facePushSign(faceLocalZ: number): number {
  return faceLocalZ === 0 ? 1 : Math.sign(faceLocalZ);
}

/** 内外墙面挂载位置 + 贯穿墙厚的深度 */
export function getThroughWallMounts(layout: OpeningLayout3D, frameDepth: number) {
  const inner = getMountLocalZ(layout.innerFaceLocalZ, frameDepth);
  const outer = getMountLocalZ(layout.outerFaceLocalZ, frameDepth);
  const innerPush = facePushSign(layout.innerFaceLocalZ);
  const outerPush = facePushSign(layout.outerFaceLocalZ);
  const mid = (inner + outer) / 2;
  const span = Math.abs(outer - inner) + frameDepth;
  return { inner, outer, innerPush, outerPush, mid, span };
}
