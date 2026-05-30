import { useEffect } from 'react';
import { EditorLayout } from './layout/EditorLayout';
import { ModelFootprintWarmup } from '@/features/floorPlan/ModelFootprintWarmup';
import { loadScene, saveScene } from '@/lib/persistence';
import { useSceneStore } from '@/stores/sceneStore';
import { preloadAllAssets } from '@/features/assets';
import { useCustomAssetStore } from '@/stores/customAssetStore';
import { useEditorShortcuts } from '@/hooks/useEditorShortcuts';

export function App() {
  const loadDocument = useSceneStore((s) => s.loadDocument);
  const document = useSceneStore((s) => s.document);
  const hydrateCustomAssets = useCustomAssetStore((s) => s.hydrate);

  useEditorShortcuts();

  useEffect(() => {
    void hydrateCustomAssets().then(() => {
      preloadAllAssets();
      return loadScene().then((doc) => {
        if (doc) loadDocument(doc);
      });
    });
  }, [loadDocument, hydrateCustomAssets]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveScene(document);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [document]);

  return (
    <>
      <ModelFootprintWarmup />
      <EditorLayout />
    </>
  );
}
