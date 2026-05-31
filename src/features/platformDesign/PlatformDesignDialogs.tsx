import { useEditorStore } from '@/stores/editorStore';
import {
  createResetFloorMaterialCommand,
  usePlatformHistoryStore,
} from '@/stores/platformHistoryStore';

export function PlatformDesignDialogs() {
  const clearOpen = useEditorStore((s) => s.platformClearConfirmOpen);
  const closeOpen = useEditorStore((s) => s.platformCloseConfirmOpen);
  const setPlatformClearConfirmOpen = useEditorStore((s) => s.setPlatformClearConfirmOpen);
  const setPlatformCloseConfirmOpen = useEditorStore((s) => s.setPlatformCloseConfirmOpen);
  const exitPlatformDesignMode = useEditorStore((s) => s.exitPlatformDesignMode);
  const setDraftFloorPresetId = useEditorStore((s) => s.setDraftFloorPresetId);
  const platformDesignMode = useEditorStore((s) => s.platformDesignMode);
  const execute = usePlatformHistoryStore((s) => s.execute);

  if (!clearOpen && !closeOpen) return null;

  const handleClearConfirm = () => {
    if (!platformDesignMode) return;
    execute(
      createResetFloorMaterialCommand(
        platformDesignMode.draftPresetId,
        platformDesignMode.snapshotPresetId,
        setDraftFloorPresetId,
      ),
    );
    setPlatformClearConfirmOpen(false);
  };

  const handleCloseConfirm = () => {
    setPlatformCloseConfirmOpen(false);
    exitPlatformDesignMode({ save: false });
  };

  return (
    <div className="dialog-overlay" role="presentation">
      {clearOpen && (
        <div className="dialog" role="dialog">
          <h2>清空地台材质</h2>
          <p>将地台材质恢复为进入编辑前的状态，是否继续？</p>
          <div className="dialog__actions">
            <button type="button" onClick={() => setPlatformClearConfirmOpen(false)}>
              取消
            </button>
            <button type="button" className="dialog__btn--danger" onClick={handleClearConfirm}>
              确定
            </button>
          </div>
        </div>
      )}
      {closeOpen && (
        <div className="dialog" role="dialog">
          <h2>关闭地台设计</h2>
          <p>当前修改尚未保存，确定要关闭吗？</p>
          <div className="dialog__actions">
            <button type="button" onClick={() => setPlatformCloseConfirmOpen(false)}>
              取消
            </button>
            <button type="button" className="dialog__btn--danger" onClick={handleCloseConfirm}>
              不保存并关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
