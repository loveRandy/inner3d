import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useSceneStore } from '@/stores/sceneStore';
import { createRemoveEntitiesCommand } from '@/lib/commands';

export function useEditorShortcuts() {
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const execute = useHistoryStore((s) => s.execute);
  const selectedIds = useSceneStore((s) => s.selectedIds);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && (e.key.toLowerCase() === 'z' && e.shiftKey || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedIds.length === 0) return;
        e.preventDefault();
        execute(createRemoveEntitiesCommand(selectedIds));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, execute, selectedIds]);
}
