import { useEditorStore } from '@/stores/editorStore';
import { usePlatformHistoryStore } from '@/stores/platformHistoryStore';
import { useSceneStore } from '@/stores/sceneStore';
import { saveScene } from '@/lib/persistence';

export function PlatformDesignTopBar() {
  const undo = usePlatformHistoryStore((s) => s.undo);
  const redo = usePlatformHistoryStore((s) => s.redo);
  const canUndo = usePlatformHistoryStore((s) => s.past.length > 0);
  const canRedo = usePlatformHistoryStore((s) => s.future.length > 0);

  const platformDesignMode = useEditorStore((s) => s.platformDesignMode);
  const exitPlatformDesignMode = useEditorStore((s) => s.exitPlatformDesignMode);
  const setSaveMessage = useEditorStore((s) => s.setSaveMessage);
  const setPlatformClearConfirmOpen = useEditorStore((s) => s.setPlatformClearConfirmOpen);
  const setPlatformCloseConfirmOpen = useEditorStore((s) => s.setPlatformCloseConfirmOpen);
  const hasUnsavedChanges = useEditorStore((s) => s.hasPlatformDesignUnsavedChanges);

  const roomName = useSceneStore((s) => {
    const id = platformDesignMode?.roomId;
    if (!id) return '';
    return s.document.floorPlan?.rooms[id]?.name ?? '未命名房间';
  });

  const handleSave = async () => {
    exitPlatformDesignMode({ save: true });
    const doc = useSceneStore.getState().document;
    await saveScene(doc);
    setSaveMessage('地台已保存');
    window.setTimeout(() => setSaveMessage(null), 2000);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setPlatformCloseConfirmOpen(true);
      return;
    }
    exitPlatformDesignMode({ save: false });
  };

  if (!platformDesignMode) return null;

  return (
    <header className="platform-design-topbar topbar">
      <div className="platform-design-topbar__left">
        <span className="platform-design-topbar__title">地台设计</span>
        <span className="platform-design-topbar__room">{roomName}</span>
      </div>
      <div className="topbar__actions platform-design-topbar__center">
        <button type="button" disabled={!canUndo} onClick={undo}>
          撤销
        </button>
        <button type="button" disabled={!canRedo} onClick={redo}>
          重做
        </button>
        <button type="button" onClick={() => setPlatformClearConfirmOpen(true)}>
          清空
        </button>
      </div>
      <div className="topbar__actions platform-design-topbar__right">
        <button type="button" title="选择左侧材质后，在画布点击地台即可换材">
          帮助
        </button>
        <button type="button" className="topbar__primary" onClick={() => void handleSave()}>
          保存
        </button>
        <button type="button" onClick={handleClose} aria-label="关闭">
          ×
        </button>
      </div>
    </header>
  );
}
