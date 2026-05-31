import { useMemo, useState } from 'react';
import {
  getFloorMaterialCategories,
  getFloorMaterialManifest,
} from '@/features/platformDesign/floorMaterials';
import { getFloorMaterialThumbnailUrl } from '@/lib/platformDesign/floorMaterialTextures';
import type { FloorMaterialCategory } from '@/types/platformDesign';
import { useEditorStore } from '@/stores/editorStore';

export function PlatformMaterialPanel() {
  const [category, setCategory] = useState<FloorMaterialCategory>('wood');
  const [query, setQuery] = useState('');
  const activePresetId = useEditorStore((s) => s.platformDesignMode?.activePresetId);
  const setActiveFloorMaterialPreset = useEditorStore((s) => s.setActiveFloorMaterialPreset);

  const categories = useMemo(() => getFloorMaterialCategories(), []);
  const materials = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getFloorMaterialManifest().filter((item) => {
      if (item.category !== category) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, query]);

  return (
    <aside className="platform-material-panel material-library">
      <div className="material-library__toolbar">
        <input
          type="search"
          placeholder="在类目下搜索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="platform-material-panel__body">
        <nav className="platform-material-panel__categories">
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
        </nav>
        <div className="material-library__grid platform-material-panel__grid">
          {materials.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`material-card${activePresetId === item.id ? ' material-card--active' : ''}`}
              onClick={() => setActiveFloorMaterialPreset(item.id)}
            >
              <img
                src={getFloorMaterialThumbnailUrl(item.id)}
                alt=""
                className="material-card__thumb"
              />
              <span className="material-card__name">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
