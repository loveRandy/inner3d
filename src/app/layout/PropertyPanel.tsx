import { useCallback } from 'react';
import type { SceneEntity, SceneSettings } from '@/types/scene';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import {
  createUpdateEntityCommand,
  createUpdateSettingsCommand,
  createUpdateTransformCommand,
} from '@/lib/commands';
import { cloneTransform } from '@/lib/transform/worldTransform';
import { countEntities } from '@/lib/scene/documentUtils';

function NumberField({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step={step}
        value={Number(value.toFixed(3))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PropertyPanel() {
  const settings = useSceneStore((s) => s.document.settings);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const entities = useSceneStore((s) => s.document.entities);
  const execute = useHistoryStore((s) => s.execute);

  const entityCount = countEntities(entities);
  const selectedEntity =
    selectedIds.length === 1 ? entities[selectedIds[0]] : undefined;

  const patchSettings = useCallback(
    (patch: Partial<SceneSettings>) => {
      const prev = Object.fromEntries(
        (Object.keys(patch) as (keyof SceneSettings)[]).map((key) => [key, settings[key]]),
      ) as Partial<SceneSettings>;
      execute(createUpdateSettingsCommand(patch, prev));
    },
    [execute, settings],
  );

  const patchEntity = useCallback(
    (id: string, patch: Partial<SceneEntity>, prev: Partial<SceneEntity>) => {
      execute(createUpdateEntityCommand(id, patch, prev));
    },
    [execute],
  );

  const patchTransformField = useCallback(
    (id: string, entity: SceneEntity, field: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number) => {
      const prev = cloneTransform(entity.transform);
      const next = cloneTransform(entity.transform);
      next[field][axis] = value;
      execute(createUpdateTransformCommand(id, next, prev));
    },
    [execute],
  );

  if (selectedIds.length > 1) {
    return (
      <div className="property-panel">
        <div className="panel-header">属性</div>
        <div className="property-panel__body">
          <div className="property-form">
            <p className="property-form__readonly">已选中 {selectedIds.length} 个对象</p>
            <p className="property-form__hint">多选状态下可在视口中组合，或使用 Delete 删除</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="panel-header">属性</div>
      <div className="property-panel__body">
        {selectedEntity ? (
          <div className="property-form">
            <label>
              名称
              <input
                type="text"
                value={selectedEntity.name}
                onChange={(e) =>
                  patchEntity(selectedEntity.id, { name: e.target.value }, { name: selectedEntity.name })
                }
              />
            </label>
            {selectedEntity.type === 'model' && (
              <label>
                模型 ID
                <input type="text" value={selectedEntity.assetId ?? '—'} readOnly />
              </label>
            )}
            {selectedEntity.type === 'group' && (
              <p className="property-form__readonly">
                子对象：{selectedEntity.children?.length ?? 0} 个
              </p>
            )}
            <div className="property-form__row">
              <NumberField label="X" value={selectedEntity.transform.position.x} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'position', 'x', v)} />
              <NumberField label="Y" value={selectedEntity.transform.position.y} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'position', 'y', v)} />
              <NumberField label="Z" value={selectedEntity.transform.position.z} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'position', 'z', v)} />
            </div>
            <div className="property-form__row">
              <NumberField label="Rot X" value={selectedEntity.transform.rotation.x} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'rotation', 'x', v)} />
              <NumberField label="Rot Y" value={selectedEntity.transform.rotation.y} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'rotation', 'y', v)} />
              <NumberField label="Rot Z" value={selectedEntity.transform.rotation.z} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'rotation', 'z', v)} />
            </div>
            <div className="property-form__row">
              <NumberField label="Scale X" value={selectedEntity.transform.scale.x} step={0.01} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'scale', 'x', v)} />
              <NumberField label="Scale Y" value={selectedEntity.transform.scale.y} step={0.01} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'scale', 'y', v)} />
              <NumberField label="Scale Z" value={selectedEntity.transform.scale.z} step={0.01} onChange={(v) => patchTransformField(selectedEntity.id, selectedEntity, 'scale', 'z', v)} />
            </div>
            <label className="property-form__checkbox">
              <input
                type="checkbox"
                checked={!!selectedEntity.locked}
                onChange={(e) =>
                  patchEntity(
                    selectedEntity.id,
                    { locked: e.target.checked },
                    { locked: selectedEntity.locked },
                  )
                }
              />
              锁定
            </label>
          </div>
        ) : (
          <div className="property-form">
            <label>
              场景名称
              <input
                type="text"
                value={settings.name}
                onChange={(e) => patchSettings({ name: e.target.value })}
              />
            </label>
            <label>
              背景色
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => patchSettings({ backgroundColor: e.target.value })}
              />
            </label>
            <label className="property-form__checkbox">
              <input
                type="checkbox"
                checked={settings.gridVisible}
                onChange={(e) => patchSettings({ gridVisible: e.target.checked })}
              />
              显示网格
            </label>
            <label>
              网格间距
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={settings.gridSize}
                onChange={(e) => patchSettings({ gridSize: Number(e.target.value) || 1 })}
              />
            </label>
            <label>
              环境光强度
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={settings.ambientIntensity}
                onChange={(e) => patchSettings({ ambientIntensity: Number(e.target.value) })}
              />
            </label>
            <p className="property-form__readonly">物体数量：{entityCount}</p>
          </div>
        )}
      </div>
    </div>
  );
}
