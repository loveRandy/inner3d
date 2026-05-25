import { useEditorStore } from '@/stores/editorStore';
import { useHistoryStore } from '@/stores/historyStore';
import { createClearSceneCommand } from '@/lib/commands';

export function ConfirmDialog() {
  const open = useEditorStore((s) => s.clearConfirmOpen);
  const setClearConfirmOpen = useEditorStore((s) => s.setClearConfirmOpen);
  const execute = useHistoryStore((s) => s.execute);

  if (!open) return null;

  const handleConfirm = () => {
    execute(createClearSceneCommand());
    setClearConfirmOpen(false);
  };

  return (
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-labelledby="clear-dialog-title">
        <h2 id="clear-dialog-title">清空画布</h2>
        <p>确定要移除场景中所有物体吗？可通过撤销恢复。</p>
        <div className="dialog__actions">
          <button type="button" onClick={() => setClearConfirmOpen(false)}>
            取消
          </button>
          <button type="button" className="dialog__btn--danger" onClick={handleConfirm}>
            确定清空
          </button>
        </div>
      </div>
    </div>
  );
}
