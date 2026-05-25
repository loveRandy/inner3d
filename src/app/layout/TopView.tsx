import { Canvas } from '@react-three/fiber';
import { TopViewContent } from '@/features/scene/TopViewContent';

export function TopView() {
  return (
    <div className="top-view">
      <div className="panel-header">2D视图</div>
      <div className="top-view__viewport">
        <Canvas
          orthographic
          dpr={[1, 2]}
          camera={{ position: [0, 50, 0], near: 0.1, far: 100, zoom: 1 }}
          gl={{ antialias: true, alpha: false }}
        >
          <TopViewContent />
        </Canvas>
      </div>
    </div>
  );
}
