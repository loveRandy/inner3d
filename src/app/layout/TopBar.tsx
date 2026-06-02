import { useRef } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { saveScene } from '@/lib/persistence';
import {
  createGroupCommand,
  createImportSemanticFloorPlanCommand,
  createUngroupCommand,
  createUpdateMaterialOverridesCommand,
} from '@/lib/commands';
import { exportSemanticFromDocument } from '@/lib/aiExchange/export/exportSemanticFromDocument';
import { downloadSemanticFloorPlan, readSemanticFloorPlanFile } from '@/lib/aiExchange/semanticFile';
import { useModelFootprintStore } from '@/stores/modelFootprintStore';

export function TopBar() {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const execute = useHistoryStore((s) => s.execute);
  const setClearConfirmOpen = useEditorStore((s) => s.setClearConfirmOpen);
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const setSaveMessage = useEditorStore((s) => s.setSaveMessage);
  const saveMessage = useEditorStore((s) => s.saveMessage);
  const materialMode = useEditorStore((s) => s.materialMode);
  const exitMaterialMode = useEditorStore((s) => s.exitMaterialMode);
  const getDraftOverrides = useEditorStore((s) => s.getDraftOverrides);
  const document = useSceneStore((s) => s.document);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const entities = useSceneStore((s) => s.document.entities);
  const importInputRef = useRef<HTMLInputElement>(null);
  const footprints = useModelFootprintStore((s) => s.footprints);

  const selectedEntity = selectedIds.length === 1 ? entities[selectedIds[0]] : null;
  const canGroup = selectedIds.filter((id) => document.rootIds.includes(id)).length >= 2;
  const canUngroup = selectedEntity?.type === 'group';

  const materialEntity =
    materialMode?.entityId ? entities[materialMode.entityId] : undefined;

  const showStatus = (message: string, isError = false) => {
    setSaveMessage(isError ? `错误：${message}` : message);
    window.setTimeout(() => setSaveMessage(null), isError ? 3500 : 2000);
  };

  const handleSave = async () => {
    await saveScene(document);
    showStatus('已保存');
  };

  const handleExport = () => {
    const plan = exportSemanticFromDocument(document, footprints);
    downloadSemanticFloorPlan(plan, document.settings.name);
    showStatus('已导出');
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const hasWalls = (document.floorPlan?.wallIds.length ?? 0) > 0;
    if (hasWalls) {
      const confirmed = window.confirm('导入语义户型将替换当前墙体与房间数据，是否继续？');
      if (!confirmed) return;
    }

    try {
      const plan = await readSemanticFloorPlanFile(file);
      execute(createImportSemanticFloorPlanCommand(plan));
      await saveScene(useSceneStore.getState().document);
      showStatus('已导入（可撤销）');
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入失败';
      showStatus(message, true);
    }
  };

  const handleMaterialFinish = () => {
    if (!materialMode) return;
    const entityId = materialMode.entityId;
    const entity = entities[entityId];
    if (!entity) {
      exitMaterialMode();
      return;
    }

    const next = getDraftOverrides();
    const prev = { ...(entity.materialOverrides ?? {}) };
    execute(createUpdateMaterialOverridesCommand(entityId, next, prev));
    exitMaterialMode();
    showStatus('材质已应用');
  };

  const handleMaterialCancel = () => {
    exitMaterialMode();
  };

  const handleGroup = () => {
    if (!canGroup) return;
    execute(createGroupCommand(selectedIds));
  };

  const handleUngroup = () => {
    if (!canUngroup || !selectedEntity) return;
    execute(createUngroupCommand(selectedEntity.id));
  };

  if (materialMode?.active) {
    return (
      <header className="top-bar top-bar--material">
        <div className="top-bar__brand">
          材质替换 · {materialEntity?.name ?? '模型'}
        </div>
        <div className="top-bar__actions">
          <button type="button" onClick={handleMaterialCancel}>
            返回
          </button>
          <button type="button" onClick={handleMaterialCancel}>
            取消
          </button>
          <button type="button" className="top-bar__primary" onClick={handleMaterialFinish}>
            完成
          </button>
          {saveMessage && <span className="top-bar__status">{saveMessage}</span>}
        </div>
      </header>
    );
  }

  return (
    <header className="top-bar">
      <div className="top-bar__brand">3D 场景编辑器</div>
      <div className="top-bar__mode">
        <button
          type="button"
          className={editorMode === 'floorPlan' ? 'is-active' : ''}
          onClick={() => setEditorMode('floorPlan')}
        >
          画户型
        </button>
        <button
          type="button"
          className={editorMode === 'furniture' ? 'is-active' : ''}
          onClick={() => setEditorMode('furniture')}
        >
          摆家具
        </button>
      </div>
      <div className="top-bar__actions">
        <button type="button" onClick={handleSave}>
          保存
        </button>
        <button type="button" onClick={handleExport} title="导出语义化户型 JSON">
          导出
        </button>
        <button type="button" onClick={handleImportClick} title="导入语义化户型 JSON">
          导入
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,.sfp.json,application/json"
          className="top-bar__file-input"
          onChange={handleImportFile}
        />
        <button type="button" disabled={!canUndo} onClick={undo}>
          撤销
        </button>
        <button type="button" disabled={!canRedo} onClick={redo}>
          重做
        </button>
        <button type="button" disabled={!canGroup} onClick={handleGroup}>
          组合
        </button>
        <button type="button" disabled={!canUngroup} onClick={handleUngroup}>
          解组
        </button>
        <button type="button" onClick={() => setClearConfirmOpen(true)}>
          清空
        </button>
        {saveMessage && <span className="top-bar__status">{saveMessage}</span>}
      </div>
    </header>
  );
}
