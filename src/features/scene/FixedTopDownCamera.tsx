import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera } from 'three';

/** 固定世界范围的正交俯视相机（始终显示相同区域） */
export function FixedTopDownCamera({
  worldSpan = 16,
  height = 50,
}: {
  worldSpan?: number;
  height?: number;
}) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return;

    const aspect = size.width / Math.max(size.height, 1);
    const half = worldSpan / 2;

    if (aspect >= 1) {
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
    } else {
      camera.left = -half;
      camera.right = half;
      camera.top = half / aspect;
      camera.bottom = -half / aspect;
    }

    camera.position.set(0, height, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.near = 0.1;
    camera.far = height + 20;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, worldSpan, height]);

  return null;
}
