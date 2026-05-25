import { useCallback, useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { useThree } from '@react-three/fiber';
import { useSceneStore } from '@/stores/sceneStore';
import { useSceneRefsStore } from '@/stores/sceneRefsStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useEditorStore } from '@/stores/editorStore';
import { createUpdateTransformCommand } from '@/lib/commands';
import { cloneTransform } from '@/lib/transform/worldTransform';
import type { Transform } from '@/types/scene';

export function TransformGizmo() {
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const entities = useSceneStore((s) => s.document.entities);
  const refs = useSceneRefsStore((s) => s.refs);
  const execute = useHistoryStore((s) => s.execute);
  const setTransformDragging = useEditorStore((s) => s.setTransformDragging);
  const setGizmoPointerActive = useEditorStore((s) => s.setGizmoPointerActive);
  const getThree = useThree((s) => s.get);

  const controlsRef = useRef<TransformControlsImpl>(null);
  const transformStart = useRef<Transform | null>(null);
  const draggingRef = useRef(false);

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const entity = selectedId ? entities[selectedId] : null;
  const target = selectedId ? refs[selectedId] : null;

  const enableOrbitControls = useCallback(() => {
    const orbit = getThree().controls as OrbitControlsImpl | null;
    if (orbit) orbit.enabled = true;
  }, [getThree]);

  const commitTransform = useCallback(() => {
    const id = selectedId;
    const object = target;
    const start = transformStart.current;
    if (!id || !object || !start) return;

    const prev = start;
    const next = cloneTransform(prev);
    next.position = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z,
    };

    const changed =
      prev.position.x !== next.position.x ||
      prev.position.y !== next.position.y ||
      prev.position.z !== next.position.z;

    if (changed) {
      execute(createUpdateTransformCommand(id, next, prev));
    }
    transformStart.current = null;
  }, [selectedId, target, execute]);

  const endDrag = useCallback(() => {
    const tc = controlsRef.current as unknown as { dragging?: boolean } | null;
    if (tc?.dragging) {
      tc.dragging = false;
      return;
    }
    if (!draggingRef.current && !transformStart.current) return;
    draggingRef.current = false;
    setTransformDragging(false);
    setGizmoPointerActive(false);
    commitTransform();
    enableOrbitControls();
  }, [commitTransform, enableOrbitControls, setTransformDragging, setGizmoPointerActive]);

  useEffect(() => {
    const tc = controlsRef.current as unknown as {
      addEventListener: (type: string, listener: (event: { value: boolean }) => void) => void;
      removeEventListener: (type: string, listener: (event: { value: boolean }) => void) => void;
      pointerHover: (pointer: { x: number; y: number; button: number }) => void;
      getPointer: (event: PointerEvent) => { x: number; y: number; button: number };
      axis: string | null;
      enabled: boolean;
    } | null;
    if (!tc) return undefined;

    const onDraggingChanged = (event: { value: boolean }) => {
      draggingRef.current = event.value;
      setTransformDragging(event.value);
      setGizmoPointerActive(event.value);

      if (event.value) {
        const current = selectedId ? entities[selectedId] : null;
        if (current) {
          transformStart.current = cloneTransform(current.transform);
        }
        return;
      }

      commitTransform();
      enableOrbitControls();
    };

    tc.addEventListener('dragging-changed', onDraggingChanged);
    return () => tc.removeEventListener('dragging-changed', onDraggingChanged);
  }, [selectedId, entities, commitTransform, enableOrbitControls, setTransformDragging, setGizmoPointerActive]);

  // 在 R3F 处理事件前标记 Gizmo 轴点击，避免 pointerMissed 清空选中
  useEffect(() => {
    const tc = controlsRef.current as unknown as {
      pointerHover: (pointer: { x: number; y: number; button: number }) => void;
      getPointer: (event: PointerEvent) => { x: number; y: number; button: number };
      axis: string | null;
      enabled: boolean;
    } | null;
    const domElement = getThree().gl.domElement;

    const onPointerDownCapture = (event: PointerEvent) => {
      if (!tc?.enabled) return;
      tc.pointerHover(tc.getPointer(event));
      if (tc.axis) {
        setGizmoPointerActive(true);
      }
    };

    const onPointerUpCapture = () => {
      if (!draggingRef.current) {
        setGizmoPointerActive(false);
      }
    };

    domElement.addEventListener('pointerdown', onPointerDownCapture, true);
    domElement.addEventListener('pointerup', onPointerUpCapture, true);
    domElement.addEventListener('pointercancel', onPointerUpCapture, true);

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDownCapture, true);
      domElement.removeEventListener('pointerup', onPointerUpCapture, true);
      domElement.removeEventListener('pointercancel', onPointerUpCapture, true);
    };
  }, [getThree, setGizmoPointerActive, selectedId]);

  useEffect(() => {
    const onPointerRelease = () => {
      if (draggingRef.current || transformStart.current) {
        endDrag();
      }
    };

    window.addEventListener('pointerup', onPointerRelease);
    window.addEventListener('blur', onPointerRelease);
    return () => {
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('blur', onPointerRelease);
    };
  }, [endDrag]);

  useEffect(
    () => () => {
      draggingRef.current = false;
      transformStart.current = null;
      setTransformDragging(false);
      setGizmoPointerActive(false);
      enableOrbitControls();
    },
    [enableOrbitControls, setTransformDragging, setGizmoPointerActive],
  );

  if (!selectedId || !entity || !target || entity.locked) return null;

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      mode="translate"
      space="world"
      size={1.1}
      showX
      showY
      showZ
    />
  );
}
