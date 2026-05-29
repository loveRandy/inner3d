import type { Vec2 } from '@/types/floorPlan';

export interface CanvasViewState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panZ: number;
  worldSpan: number;
}

export function createDefaultViewState(width: number, height: number): CanvasViewState {
  return {
    width,
    height,
    zoom: 1,
    panX: 0,
    panZ: 0,
    worldSpan: 16,
  };
}

export function worldToScreen(point: Vec2, view: CanvasViewState): { x: number; y: number } {
  const scale = (Math.min(view.width, view.height) / view.worldSpan) * view.zoom;
  return {
    x: (point.x - view.panX) * scale + view.width / 2,
    y: (point.z - view.panZ) * scale + view.height / 2,
  };
}

export function screenToWorld(sx: number, sy: number, view: CanvasViewState): Vec2 {
  const scale = (Math.min(view.width, view.height) / view.worldSpan) * view.zoom;
  return {
    x: (sx - view.width / 2) / scale + view.panX,
    z: (sy - view.height / 2) / scale + view.panZ,
  };
}

export function formatLengthMm(meters: number): string {
  return `${Math.round(meters * 1000)}`;
}

export function parseLengthMm(mm: string): number | null {
  const value = Number(mm);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value / 1000;
}
