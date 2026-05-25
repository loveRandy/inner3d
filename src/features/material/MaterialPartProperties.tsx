import { useRef } from 'react';
import { getMaterialPresetById } from '@/features/materials';
import type { ModelPartTreeNode } from '@/lib/scene/meshParts';
import type { MeshPartKey } from '@/types/scene';
import { useEditorStore } from '@/stores/editorStore';

const MAX_TEXTURE_BYTES = 512 * 1024;

function findPartName(node: ModelPartTreeNode, meshKey: MeshPartKey): string | null {
  if (node.meshKey === meshKey) return node.name;
  for (const child of node.children) {
    const found = findPartName(child, meshKey);
    if (found) return found;
  }
  return null;
}

function getOverrideLabel(override: { presetId?: string; customMap?: string }): string {
  if (override.customMap && !override.presetId) return '自定义贴图';
  if (override.presetId) {
    const preset = getMaterialPresetById(override.presetId);
    if (override.customMap) return `${preset?.name ?? override.presetId} + 贴图`;
    return preset?.name ?? override.presetId;
  }
  return '默认';
}

export function MaterialPartProperties() {
  const materialMode = useEditorStore((s) => s.materialMode);
  const clearDraftOverride = useEditorStore((s) => s.clearDraftOverride);
  const applyDraftCustomMap = useEditorStore((s) => s.applyDraftCustomMap);
  const setSaveMessage = useEditorStore((s) => s.setSaveMessage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!materialMode) return null;

  const meshKey = materialMode.selectedMeshKey;

  if (!meshKey) {
    return (
      <div className="material-part-props">
        <p className="material-part-props__hint">请在模型树或预览区选择一个部件</p>
      </div>
    );
  }

  const override = materialMode.draftOverrides[meshKey];
  const partName =
    findPartName(materialMode.partTree, meshKey) ?? meshKey.split('/').pop() ?? meshKey;

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveMessage('请选择图片文件');
      window.setTimeout(() => setSaveMessage(null), 2000);
      return;
    }
    if (file.size > MAX_TEXTURE_BYTES) {
      setSaveMessage('贴图需小于 512KB');
      window.setTimeout(() => setSaveMessage(null), 2000);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    applyDraftCustomMap(dataUrl);
  };

  return (
    <div className="material-part-props">
      <div className="material-part-props__header">部件属性</div>
      <div className="material-part-props__body">
        <div className="material-part-props__row">
          <span className="material-part-props__label">部件</span>
          <span>{partName}</span>
        </div>
        <div className="material-part-props__row">
          <span className="material-part-props__label">当前材质</span>
          <span>{override ? getOverrideLabel(override) : '默认'}</span>
        </div>
        {override?.customMap && (
          <img
            src={override.customMap}
            alt="自定义贴图预览"
            className="material-part-props__map-preview"
          />
        )}
        <div className="material-part-props__actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="material-part-props__upload"
            onClick={() => fileInputRef.current?.click()}
          >
            上传贴图
          </button>
          {override && (
            <button
              type="button"
              className="material-part-props__reset"
              onClick={() => clearDraftOverride(meshKey)}
            >
              恢复默认材质
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
