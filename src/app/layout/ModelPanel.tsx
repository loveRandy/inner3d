import { useRef, useState } from 'react';
import { getAssetManifest } from '@/features/assets';
import { getAssetMeshCount, useCustomAssetStore } from '@/stores/customAssetStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

function getMeshBadgeLabel(asset: ReturnType<typeof getAssetManifest>[number]): string | null {
  const meshCount = getAssetMeshCount(asset) ?? asset.meshCount;
  if (meshCount == null) return null;
  return `${meshCount} 部件`;
}

export function ModelPanel() {
  const [keyword, setKeyword] = useState('');
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const manifest = getAssetManifest();
  const customReady = useCustomAssetStore((s) => s.ready);
  const importGltfFile = useCustomAssetStore((s) => s.importGltfFile);
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const setPlacementAsset = useSceneStore((s) => s.setPlacementAsset);
  const setSaveMessage = useEditorStore((s) => s.setSaveMessage);

  const filtered = manifest.filter((asset) =>
    asset.name.toLowerCase().includes(keyword.trim().toLowerCase()),
  );

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const { asset, summaryMessage } = await importGltfFile(file);
      setSaveMessage(`已导入「${asset.name}」：${summaryMessage}`);
      setPlacementAsset(asset.id);
      window.setTimeout(() => setSaveMessage(null), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入失败';
      setSaveMessage(message);
      window.setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setImporting(false);
    }
  };

  return (
    <aside className="model-panel">
      <div className="panel-header">模型库</div>
      {placementAssetId && (
        <p className="model-panel__hint">点击编辑区地面放置模型</p>
      )}
      <div className="model-panel__toolbar">
        <input
          type="search"
          placeholder="搜索模型..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button
          type="button"
          className="model-panel__import"
          disabled={!customReady || importing}
          onClick={() => importInputRef.current?.click()}
        >
          {importing ? '导入中…' : '导入 GLTF'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".gltf,.glb,model/gltf+json,model/gltf-binary"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            e.target.value = '';
          }}
        />
      </div>
      <div className="model-panel__list">
        {filtered.map((asset) => {
          const badge = getMeshBadgeLabel(asset);

          return (
            <button
              key={asset.id}
              type="button"
              className={`model-card${placementAssetId === asset.id ? ' model-card--active' : ''}`}
              onClick={() =>
                setPlacementAsset(placementAssetId === asset.id ? null : asset.id)
              }
            >
              <div className="model-card__thumb">
                <img src={asset.thumbnail} alt={asset.name} />
                {badge && <span className="model-card__badge">{badge}</span>}
              </div>
              <span className="model-card__name">{asset.name}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
