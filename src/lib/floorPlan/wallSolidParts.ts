import type { Opening, WallSegment } from '@/types/floorPlan';
import { wallLength } from './wallGeometry';

export const BASEBOARD_H = 0.08;

export interface WallSolidPart {
  t0: number;
  t1: number;
  y0: number;
  y1: number;
}

/** 门洞 + 窗洞参与扣墙；门不扣墙（叠加在墙面上） */
export function getWallCutOpenings(openings: Opening[]): Opening[] {
  return openings.filter((o) => o.type === 'opening' || o.type === 'window');
}

export function getWallSolidParts(
  wall: WallSegment,
  cutOpenings: Opening[],
): WallSolidPart[] {
  const len = wallLength(wall);
  const topY = wall.height;

  if (cutOpenings.length === 0) {
    return [
      { t0: 0, t1: 1, y0: BASEBOARD_H, y1: topY },
      { t0: 0, t1: 1, y0: 0, y1: BASEBOARD_H },
    ];
  }

  const breaks = new Set<number>([0, 1]);
  for (const o of cutOpenings) {
    breaks.add(Math.max(0, o.offset / len));
    breaks.add(Math.min(1, (o.offset + o.width) / len));
  }
  const sorted = [...breaks].sort((a, b) => a - b);

  const parts: WallSolidPart[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const t0 = sorted[i];
    const t1 = sorted[i + 1];
    if (t1 - t0 < 0.001) continue;

    const mid = (t0 + t1) / 2;
    const covering = cutOpenings.filter((o) => {
      const ot0 = o.offset / len;
      const ot1 = (o.offset + o.width) / len;
      return mid >= ot0 - 0.0001 && mid <= ot1 + 0.0001;
    });

    if (covering.length === 0) {
      parts.push({ t0, t1, y0: BASEBOARD_H, y1: topY });
      parts.push({ t0, t1, y0: 0, y1: BASEBOARD_H });
      continue;
    }

    const o = covering[0];
    const sill = o.sillHeight;
    const head = o.sillHeight + o.height;

    if (head < topY - 0.001) {
      parts.push({ t0, t1, y0: head, y1: topY });
    }
    if (sill > BASEBOARD_H + 0.001) {
      parts.push({ t0, t1, y0: BASEBOARD_H, y1: sill });
    }
    if (sill > 0.001) {
      parts.push({ t0, t1, y0: 0, y1: Math.min(sill, BASEBOARD_H) });
    }
  }

  return parts;
}
