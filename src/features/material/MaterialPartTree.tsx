import { useEffect, useRef } from 'react';
import type { ModelPartTreeNode } from '@/lib/scene/meshParts';
import type { MeshPartKey } from '@/types/scene';
import { useEditorStore } from '@/stores/editorStore';

interface MaterialPartTreeProps {
  root: ModelPartTreeNode;
}

function TreeNode({
  node,
  depth,
  selectedMeshKey,
  onSelect,
}: {
  node: ModelPartTreeNode;
  depth: number;
  selectedMeshKey: MeshPartKey | null;
  onSelect: (meshKey: MeshPartKey) => void;
}) {
  const isSelectable = Boolean(node.meshKey);
  const isSelected = node.meshKey != null && node.meshKey === selectedMeshKey;

  return (
    <div className="material-tree__branch">
      <button
        type="button"
        data-mesh-key={node.meshKey ?? undefined}
        className={`material-tree__node${isSelected ? ' is-selected' : ''}${!isSelectable ? ' is-group' : ''}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        disabled={!isSelectable}
        onClick={() => node.meshKey && onSelect(node.meshKey)}
      >
        <span className="material-tree__label">{node.name}</span>
        {node.hasOverride && <span className="material-tree__badge" />}
      </button>
      {node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedMeshKey={selectedMeshKey}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function MaterialPartTree({ root }: MaterialPartTreeProps) {
  const selectedMeshKey = useEditorStore((s) => s.materialMode?.selectedMeshKey ?? null);
  const setSelectedMeshKey = useEditorStore((s) => s.setSelectedMeshKey);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedMeshKey || !bodyRef.current) return;
    const node = bodyRef.current.querySelector(`[data-mesh-key="${CSS.escape(selectedMeshKey)}"]`);
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedMeshKey]);

  return (
    <div className="material-tree">
      <div className="material-tree__header">模型树</div>
      <div ref={bodyRef} className="material-tree__body">
        <TreeNode
          node={root}
          depth={0}
          selectedMeshKey={selectedMeshKey}
          onSelect={setSelectedMeshKey}
        />
      </div>
    </div>
  );
}
