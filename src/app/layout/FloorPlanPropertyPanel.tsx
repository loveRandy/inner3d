import { useCallback } from 'react';
import type { FloorPlanSettings, Opening, WallSegment } from '@/types/floorPlan';
import { WALL_ALIGN_CYCLE, type WallAlign } from '@/types/floorPlan';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import {
  createUpdateFloorPlanSettingsCommand,
  createUpdateOpeningCommand,
  createUpdateRoomCommand,
  createUpdateWallCommand,
} from '@/lib/commands';
import { alignLabel, wallAngleDeg, wallLength } from '@/lib/floorPlan/wallGeometry';

function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  unit?: string;
}) {
  return (
    <label>
      {label}
      <div className="property-form__input-row">
        <input
          type="number"
          step={step}
          value={Number(value.toFixed(3))}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="property-form__unit">{unit}</span>}
      </div>
    </label>
  );
}

export function FloorPlanPropertyPanel() {
  const floorPlan = useSceneStore((s) => s.document.floorPlan);
  const floorPlanSelection = useSceneStore((s) => s.floorPlanSelection);
  const execute = useHistoryStore((s) => s.execute);

  const patchSettings = useCallback(
    (patch: Partial<FloorPlanSettings>) => {
      if (!floorPlan) return;
      const prev = Object.fromEntries(
        (Object.keys(patch) as (keyof FloorPlanSettings)[]).map((key) => [
          key,
          floorPlan.settings[key],
        ]),
      ) as Partial<FloorPlanSettings>;
      execute(createUpdateFloorPlanSettingsCommand(patch, prev));
    },
    [execute, floorPlan],
  );

  if (!floorPlan) return null;

  const settings = floorPlan.settings;
  const selection = floorPlanSelection[0];

  const patchWall = (wallId: string, patch: Partial<WallSegment>, prev: Partial<WallSegment>) => {
    execute(createUpdateWallCommand(wallId, patch, prev));
  };

  const patchOpening = (openingId: string, patch: Partial<Opening>, prev: Partial<Opening>) => {
    execute(createUpdateOpeningCommand(openingId, patch, prev));
  };

  if (selection?.kind === 'wall') {
    const wall = floorPlan.walls[selection.id];
    if (!wall) return null;
    return (
      <div className="property-panel">
        <div className="panel-header">墙体属性</div>
        <div className="property-panel__body">
          <div className="property-form">
            <p className="property-form__readonly">
              长度：{formatLengthMm(wallLength(wall))} mm
            </p>
            <NumberField
              label="厚度"
              value={wall.thickness}
              unit="m"
              step={0.01}
              onChange={(v) => patchWall(wall.id, { thickness: v }, { thickness: wall.thickness })}
            />
            <NumberField
              label="高度"
              value={wall.height}
              unit="m"
              step={0.01}
              onChange={(v) => patchWall(wall.id, { height: v }, { height: wall.height })}
            />
            <NumberField
              label="角度"
              value={wallAngleDeg(wall)}
              unit="°"
              step={1}
              onChange={(v) => {
                const len = wallLength(wall);
                const rad = (v * Math.PI) / 180;
                const end = {
                  x: wall.start.x + Math.cos(rad) * len,
                  z: wall.start.z + Math.sin(rad) * len,
                };
                patchWall(wall.id, { end }, { end: wall.end });
              }}
            />
            <label>
              定位线
              <select
                value={wall.align}
                onChange={(e) =>
                  patchWall(wall.id, { align: e.target.value as WallAlign }, { align: wall.align })
                }
              >
                {WALL_ALIGN_CYCLE.map((align) => (
                  <option key={align} value={align}>
                    {alignLabel(align)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              墙体类型
              <select
                value={wall.kind}
                onChange={(e) =>
                  patchWall(
                    wall.id,
                    { kind: e.target.value as WallSegment['kind'] },
                    { kind: wall.kind },
                  )
                }
              >
                <option value="nonBearing">非承重</option>
                <option value="bearing">承重</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (selection?.kind === 'opening') {
    const opening = floorPlan.openings[selection.id];
    if (!opening) return null;
    const typeLabel =
      opening.type === 'door' ? '门' : opening.type === 'window' ? '窗' : '门洞';
    return (
      <div className="property-panel">
        <div className="panel-header">{typeLabel}属性</div>
        <div className="property-panel__body">
          <div className="property-form">
            <NumberField
              label="宽度"
              value={opening.width}
              unit="m"
              onChange={(v) =>
                patchOpening(opening.id, { width: v }, { width: opening.width })
              }
            />
            <NumberField
              label="高度"
              value={opening.height}
              unit="m"
              onChange={(v) =>
                patchOpening(opening.id, { height: v }, { height: opening.height })
              }
            />
            <NumberField
              label="沿墙偏移"
              value={opening.offset}
              unit="m"
              onChange={(v) =>
                patchOpening(opening.id, { offset: v }, { offset: opening.offset })
              }
            />
            {opening.type === 'window' && (
              <NumberField
                label="离地高度"
                value={opening.sillHeight}
                unit="m"
                onChange={(v) =>
                  patchOpening(opening.id, { sillHeight: v }, { sillHeight: opening.sillHeight })
                }
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selection?.kind === 'room') {
    const room = floorPlan.rooms[selection.id];
    if (!room) return null;
    return (
      <div className="property-panel">
        <div className="panel-header">房间属性</div>
        <div className="property-panel__body">
          <div className="property-form">
            <label>
              名称
              <input
                type="text"
                value={room.name}
                onChange={(e) =>
                  execute(
                    createUpdateRoomCommand(room.id, { name: e.target.value }, { name: room.name }),
                  )
                }
              />
            </label>
            <p className="property-form__readonly">面积：{room.area.toFixed(2)} m²</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="panel-header">户型设置</div>
      <div className="property-panel__body">
        <div className="property-form">
          <label>
            户型名称
            <input
              type="text"
              value={settings.name}
              onChange={(e) => patchSettings({ name: e.target.value })}
            />
          </label>
          <NumberField
            label="层高"
            value={settings.floorHeight}
            unit="m"
            onChange={(v) => patchSettings({ floorHeight: v })}
          />
          <NumberField
            label="默认墙厚"
            value={settings.defaultWallThickness}
            unit="m"
            onChange={(v) => patchSettings({ defaultWallThickness: v })}
          />
          <label>
            定位线
            <select
              value={settings.defaultAlign}
              onChange={(e) =>
                patchSettings({ defaultAlign: e.target.value as WallAlign })
              }
            >
              {WALL_ALIGN_CYCLE.map((align) => (
                <option key={align} value={align}>
                  {alignLabel(align)}
                </option>
              ))}
            </select>
          </label>
          <label className="property-form__checkbox">
            <input
              type="checkbox"
              checked={settings.orthoLocked}
              onChange={(e) => patchSettings({ orthoLocked: e.target.checked })}
            />
            正交绘制
          </label>
          <label className="property-form__checkbox">
            <input
              type="checkbox"
              checked={settings.autoRoom}
              onChange={(e) => patchSettings({ autoRoom: e.target.checked })}
            />
            围成房间
          </label>
          <label className="property-form__checkbox">
            <input
              type="checkbox"
              checked={settings.autoJoin}
              onChange={(e) => patchSettings({ autoJoin: e.target.checked })}
            />
            自动连接
          </label>
          <p className="property-form__readonly">
            墙体：{floorPlan.wallIds.length} · 房间：{floorPlan.roomIds.length}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatLengthMm(meters: number): string {
  return String(Math.round(meters * 1000));
}
