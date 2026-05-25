import { useMemo, useState } from 'react';
import { getMaterialCategories, getMaterialManifest } from '@/features/materials';
import { useEditorStore } from '@/stores/editorStore';

export function MaterialLibraryPanel() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const applyDraftMaterial = useEditorStore((s) => s.applyDraftMaterial);
  const selectedMeshKey = useEditorStore((s) => s.materialMode?.selectedMeshKey);
  const selectedPresetId = useEditorStore((s) => s.materialMode?.selectedPresetId);

  const categories = useMemo(() => getMaterialCategories(), []);
  const materials = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getMaterialManifest().filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, query]);

  const handleSelect = (presetId: string) => {
    if (!selectedMeshKey) {
      useEditorStore.getState().setSaveMessage('请先在模型树中选择部件');
      window.setTimeout(() => useEditorStore.getState().setSaveMessage(null), 2000);
      return;
    }
    applyDraftMaterial(presetId);
  };

  return (
    <aside className="material-library">
      <div className="panel-header">材质库</div>
      <div className="material-library__toolbar">
        <input
          type="search"
          placeholder="搜索材质"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="material-library__tabs">
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.id ? 'is-active' : ''}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="material-library__grid">
        {materials.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`material-card${selectedPresetId === item.id ? ' material-card--active' : ''}`}
            onClick={() => handleSelect(item.id)}
          >
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" className="material-card__thumb" />
            ) : (
              <span
                className="material-card__swatch"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="material-card__name">{item.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
