import type { RoomType } from '@/lib/aiExchange/types/semanticFloorPlan';

export interface RoomTypeLabel {
  roomType: RoomType;
  nameZh: string;
  nameEn: string;
}

/** roomType → 默认中英文显示名 */
export const ROOM_TYPE_LABELS: Record<RoomType, RoomTypeLabel> = {
  living_room: { roomType: 'living_room', nameZh: '客厅', nameEn: 'Living Room' },
  lounge: { roomType: 'lounge', nameZh: '娱乐室', nameEn: 'Lounge' },
  bedroom: { roomType: 'bedroom', nameZh: '卧室', nameEn: 'Bedroom' },
  kitchen: { roomType: 'kitchen', nameZh: '厨房', nameEn: 'Kitchen' },
  dining: { roomType: 'dining', nameZh: '餐厅', nameEn: 'Dining' },
  bathroom: { roomType: 'bathroom', nameZh: '卫生间', nameEn: 'Bathroom' },
  corridor: { roomType: 'corridor', nameZh: '过道', nameEn: 'Corridor' },
  balcony: { roomType: 'balcony', nameZh: '阳台', nameEn: 'Balcony' },
  closet: { roomType: 'closet', nameZh: '储藏间', nameEn: 'Closet' },
  stairwell: { roomType: 'stairwell', nameZh: '楼梯间', nameEn: 'Stairwell' },
  utility: { roomType: 'utility', nameZh: '设备间', nameEn: 'Utility' },
  garage: { roomType: 'garage', nameZh: '车库', nameEn: 'Garage' },
  office: { roomType: 'office', nameZh: '书房', nameEn: 'Office' },
  unknown: { roomType: 'unknown', nameZh: '未分类', nameEn: 'Unknown' },
};

export function getRoomDisplayName(
  roomType: RoomType,
  locale: 'zh-CN' | 'en-US' = 'zh-CN',
  overrides?: { nameZh?: string; nameEn?: string; name?: string },
): string {
  if (locale === 'zh-CN') {
    return overrides?.nameZh ?? overrides?.name ?? ROOM_TYPE_LABELS[roomType].nameZh;
  }
  return overrides?.nameEn ?? overrides?.name ?? ROOM_TYPE_LABELS[roomType].nameEn;
}
