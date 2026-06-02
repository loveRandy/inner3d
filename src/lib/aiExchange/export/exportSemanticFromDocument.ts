import { entitiesToFixtures } from '@/lib/aiExchange/convert/entitiesToFixtures';
import { floorPlanToSemantic } from '@/lib/aiExchange/convert/floorPlanToSemantic';
import type { SemanticFloorPlanV1 } from '@/lib/aiExchange/types/semanticFloorPlan';
import { createEmptyFloorPlan } from '@/types/floorPlan';
import type { SceneDocument } from '@/types/scene';
import type { ModelFootprint } from '@/lib/scene/modelFootprint';

export function exportSemanticFromDocument(
  document: SceneDocument,
  footprints: Record<string, ModelFootprint | undefined> = {},
): SemanticFloorPlanV1 {
  const floorPlan = document.floorPlan ?? createEmptyFloorPlan();

  const { plan, roomIdToKey } = floorPlanToSemantic(floorPlan, {
    source: 'editor_export',
    title: document.settings.name,
  });

  if (document.rootIds.length > 0) {
    plan.fixtures = entitiesToFixtures(
      floorPlan,
      document.entities,
      document.rootIds,
      footprints,
      roomIdToKey,
    );
  }

  return plan;
}
