import { Canvas } from '@react-three/fiber';
import { MaterialPreviewContent } from './MaterialPreviewContent';

export function MaterialPreviewViewport() {
  return (
    <div className="material-preview">
      <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
        <MaterialPreviewContent />
      </Canvas>
    </div>
  );
}
