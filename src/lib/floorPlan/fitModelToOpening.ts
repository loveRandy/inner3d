import { Box3, Object3D, Vector3 } from 'three';

/** 将 GLTF 根节点缩放到目标尺寸，并使底面中心落在局部原点 */
export function fitModelToOpening(
  root: Object3D,
  width: number,
  height: number,
  depth: number,
): Object3D {
  const box = new Box3().setFromObject(root);
  const size = new Vector3();
  box.getSize(size);

  const sx = size.x > 1e-6 ? width / size.x : 1;
  const sy = size.y > 1e-6 ? height / size.y : 1;
  const sz = size.z > 1e-6 ? depth / size.z : 1;
  root.scale.set(sx, sy, sz);
  root.updateMatrixWorld(true);

  const fitted = new Box3().setFromObject(root);
  const center = new Vector3();
  fitted.getCenter(center);
  root.position.set(-center.x, -fitted.min.y, -center.z);
  return root;
}
