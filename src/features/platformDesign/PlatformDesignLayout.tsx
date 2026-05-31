import { PlatformDesignTopBar } from './PlatformDesignTopBar';
import { PlatformMaterialPanel } from './PlatformMaterialPanel';
import { PlatformDesignCanvas } from './PlatformDesignCanvas';
import { PlatformPreviewViewport } from './PlatformPreviewViewport';
import { PlatformDesignDialogs } from './PlatformDesignDialogs';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { getFloorMaterialPresetById } from '@/features/platformDesign/floorMaterials';

export function PlatformDesignLayout() {
  const platformDesignMode = useEditorStore((s) => s.platformDesignMode);
  const canvasView = platformDesignMode?.canvasView;
  const roomId = platformDesignMode?.roomId;

  const roomName = useSceneStore((s) =>
    roomId ? (s.document.floorPlan?.rooms[roomId]?.name ?? '未命名房间') : '',
  );

  if (!platformDesignMode) return null;

  const presetName = getFloorMaterialPresetById(platformDesignMode.draftPresetId)?.name ?? '默认';

  return (
    <div className="platform-design">
      <PlatformDesignTopBar />
      <div className="platform-design__main">
        <PlatformMaterialPanel />
        <PlatformDesignCanvas />
        <aside className="platform-design__right">
          <div className="panel-header">房间选择</div>
          <div className="platform-design__room-name">{roomName}</div>
          <div className="top-view platform-design__preview">
            <div className="panel-header">3D 预览</div>
            <PlatformPreviewViewport />
          </div>
        </aside>
      </div>
      <footer className="status-bar platform-design__status">
        <span>缩放 {Math.round((canvasView?.zoom ?? 1) * 100)}%</span>
        <span>当前材质：{presetName}</span>
        <span>右键平移 · 滚轮缩放 · 双击适应窗口</span>
      </footer>
      <PlatformDesignDialogs />
    </div>
  );
}
