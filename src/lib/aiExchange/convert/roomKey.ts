import type { RoomType } from '@/lib/aiExchange/types/semanticFloorPlan';

/** 生成稳定房间语义键：lounge → lounge-2 */
export function allocateRoomKey(roomType: RoomType, counters: Map<string, number>): string {
  const count = (counters.get(roomType) ?? 0) + 1;
  counters.set(roomType, count);
  return count === 1 ? roomType : `${roomType}-${count}`;
}
