import { semanticToFloorPlan } from '@/lib/aiExchange/convert/semanticToFloorPlan';
import { validateSemanticFloorPlan } from '@/lib/aiExchange/validate/validateSemanticFloorPlan';
import type { SemanticFloorPlanV1 } from '@/lib/aiExchange/types/semanticFloorPlan';
import { cloneFloorPlan, type FloorPlan } from '@/types/floorPlan';

export interface ApplySemanticFloorPlanResult {
  floorPlan: FloorPlan;
  warnings: string[];
}

export function applySemanticFloorPlanToFloorPlan(
  semanticInput: SemanticFloorPlanV1 | unknown,
  currentFloorPlan?: FloorPlan,
): ApplySemanticFloorPlanResult {
  const { plan, warnings } = validateSemanticFloorPlan(semanticInput);
  const baseSettings = currentFloorPlan?.settings;
  const floorPlan = semanticToFloorPlan(plan, baseSettings);
  return { floorPlan: cloneFloorPlan(floorPlan), warnings };
}
