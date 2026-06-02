import { SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION } from '@/lib/aiExchange/constants';
import {
  FIXTURE_CATEGORIES,
  ROOM_TYPES,
  type FixtureCategory,
  type RoomType,
  type SemanticAnnotationV1,
  type SemanticFixtureV1,
  type SemanticFloorPlanV1,
  type SemanticRoomV1,
} from '@/lib/aiExchange/types/semanticFloorPlan';
import { isFiniteNumber, isNonEmptyString, isRecord, isSemanticVec2 } from '@/lib/aiExchange/validate/guards';

const META_SOURCES = ['manual', 'ai', 'cad_import', 'editor_export'] as const;
const OPENING_TYPES = ['door', 'window', 'opening'] as const;
const WALL_KINDS = ['bearing', 'nonBearing'] as const;
const DOOR_STYLES = ['swing', 'sliding', 'unknown'] as const;
const ANNOTATION_TYPES = ['text', 'arrow', 'dimension', 'custom'] as const;
const LABEL_LANGS = ['zh', 'en'] as const;

const MIN_WALL_LENGTH_M = 0.1;
const MIN_POLYGON_POINTS = 3;

export interface SemanticFloorPlanValidationResult {
  plan: SemanticFloorPlanV1;
  warnings: string[];
}

function parseVec2(value: unknown, path: string): { x: number; z: number } {
  if (!isSemanticVec2(value)) {
    throw new Error(`${path} 必须是 { x, z } 数值对象`);
  }
  return { x: value.x, z: value.z };
}

function validateWall(value: unknown, index: number, warnings: string[]): SemanticFloorPlanV1['walls'][number] {
  if (!isRecord(value)) throw new Error(`walls[${index}] 格式无效`);
  const start = parseVec2(value.start, `walls[${index}].start`);
  const end = parseVec2(value.end, `walls[${index}].end`);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const len = Math.hypot(dx, dz);
  if (len < MIN_WALL_LENGTH_M) {
    warnings.push(`walls[${index}] 长度过短（${len.toFixed(3)}m），已保留但可能无法渲染`);
  }
  const kind = value.kind;
  if (kind != null && !WALL_KINDS.includes(kind as (typeof WALL_KINDS)[number])) {
    throw new Error(`walls[${index}].kind 无效`);
  }
  return {
    start,
    end,
    thickness: isFiniteNumber(value.thickness) ? value.thickness : undefined,
    height: isFiniteNumber(value.height) ? value.height : undefined,
    kind: kind as SemanticFloorPlanV1['walls'][number]['kind'],
    isExterior: typeof value.isExterior === 'boolean' ? value.isExterior : undefined,
  };
}

function validateOpening(
  value: unknown,
  index: number,
  wallCount: number,
): SemanticFloorPlanV1['openings'][number] {
  if (!isRecord(value)) throw new Error(`openings[${index}] 格式无效`);
  const type = value.type;
  if (!OPENING_TYPES.includes(type as (typeof OPENING_TYPES)[number])) {
    throw new Error(`openings[${index}].type 无效`);
  }
  if (!isFiniteNumber(value.wallIndex) || !Number.isInteger(value.wallIndex)) {
    throw new Error(`openings[${index}].wallIndex 必须是整数`);
  }
  if (value.wallIndex < 0 || value.wallIndex >= wallCount) {
    throw new Error(`openings[${index}].wallIndex=${value.wallIndex} 超出墙体范围（共 ${wallCount} 段）`);
  }
  if (!isFiniteNumber(value.offset) || value.offset < 0) {
    throw new Error(`openings[${index}].offset 无效`);
  }
  if (!isFiniteNumber(value.width) || value.width <= 0) {
    throw new Error(`openings[${index}].width 无效`);
  }
  const doorStyle = value.doorStyle;
  if (doorStyle != null && !DOOR_STYLES.includes(doorStyle as (typeof DOOR_STYLES)[number])) {
    throw new Error(`openings[${index}].doorStyle 无效`);
  }
  return {
    type: type as SemanticFloorPlanV1['openings'][number]['type'],
    wallIndex: value.wallIndex,
    offset: value.offset,
    width: value.width,
    height: isFiniteNumber(value.height) ? value.height : undefined,
    sillHeight: isFiniteNumber(value.sillHeight) ? value.sillHeight : undefined,
    flip: typeof value.flip === 'boolean' ? value.flip : undefined,
    doorStyle: doorStyle as SemanticFloorPlanV1['openings'][number]['doorStyle'],
  };
}

function validateRoom(value: unknown, index: number): SemanticRoomV1 {
  if (!isRecord(value)) throw new Error(`rooms[${index}] 格式无效`);
  if (!isNonEmptyString(value.key)) throw new Error(`rooms[${index}].key 不能为空`);
  const roomType = value.roomType;
  if (typeof roomType !== 'string' || !ROOM_TYPES.includes(roomType as RoomType)) {
    throw new Error(`rooms[${index}].roomType 无效`);
  }
  if (!Array.isArray(value.polygon)) {
    throw new Error(`rooms[${index}].polygon 必须是数组`);
  }
  const polygon = value.polygon.map((p, pi) => parseVec2(p, `rooms[${index}].polygon[${pi}]`));
  if (polygon.length > 0 && polygon.length < MIN_POLYGON_POINTS) {
    throw new Error(`rooms[${index}].polygon 至少需要 ${MIN_POLYGON_POINTS} 个顶点`);
  }
  const labels = value.labels;
  let parsedLabels: SemanticRoomV1['labels'];
  if (labels != null) {
    if (!Array.isArray(labels)) throw new Error(`rooms[${index}].labels 必须是数组`);
    parsedLabels = labels.map((label, li) => {
      if (!isRecord(label) || !isNonEmptyString(label.text)) {
        throw new Error(`rooms[${index}].labels[${li}] 无效`);
      }
      const language = label.language;
      if (language != null && !LABEL_LANGS.includes(language as (typeof LABEL_LANGS)[number])) {
        throw new Error(`rooms[${index}].labels[${li}].language 无效`);
      }
      return {
        text: label.text,
        language: language as 'zh' | 'en' | undefined,
        position: parseVec2(label.position, `rooms[${index}].labels[${li}].position`),
      };
    });
  }
  return {
    key: value.key as string,
    roomType: roomType as RoomType,
    name: typeof value.name === 'string' ? value.name : undefined,
    nameZh: typeof value.nameZh === 'string' ? value.nameZh : undefined,
    nameEn: typeof value.nameEn === 'string' ? value.nameEn : undefined,
    polygon,
    area: isFiniteNumber(value.area) ? value.area : undefined,
    labels: parsedLabels,
  };
}

function validateFixture(value: unknown, index: number, roomKeys: Set<string>): SemanticFixtureV1 {
  if (!isRecord(value)) throw new Error(`fixtures[${index}] 格式无效`);
  const category = value.category;
  if (typeof category !== 'string' || !FIXTURE_CATEGORIES.includes(category as FixtureCategory)) {
    throw new Error(`fixtures[${index}].category 无效`);
  }
  const roomKey = value.roomKey;
  if (typeof roomKey === 'string' && !roomKeys.has(roomKey)) {
    throw new Error(`fixtures[${index}].roomKey "${roomKey}" 未在 rooms 中定义`);
  }
  return {
    category: category as SemanticFixtureV1['category'],
    roomKey: typeof roomKey === 'string' ? roomKey : undefined,
    position: parseVec2(value.position, `fixtures[${index}].position`),
    rotationDeg: isFiniteNumber(value.rotationDeg) ? value.rotationDeg : undefined,
    size:
      isRecord(value.size) &&
      isFiniteNumber(value.size.width) &&
      isFiniteNumber(value.size.depth)
        ? {
            width: value.size.width,
            depth: value.size.depth,
            height: isFiniteNumber(value.size.height) ? value.size.height : undefined,
          }
        : undefined,
    count: isFiniteNumber(value.count) ? value.count : undefined,
    label: typeof value.label === 'string' ? value.label : undefined,
  };
}

function validateAnnotation(value: unknown, index: number): SemanticAnnotationV1 {
  if (!isRecord(value)) throw new Error(`annotations[${index}] 格式无效`);
  const type = value.type;
  if (!ANNOTATION_TYPES.includes(type as (typeof ANNOTATION_TYPES)[number])) {
    throw new Error(`annotations[${index}].type 无效`);
  }
  if (!Array.isArray(value.geometry) || value.geometry.length < 1) {
    throw new Error(`annotations[${index}].geometry 至少需要 1 个点`);
  }
  return {
    type: type as SemanticAnnotationV1['type'],
    content: typeof value.content === 'string' ? value.content : undefined,
    geometry: value.geometry.map((p, pi) => parseVec2(p, `annotations[${index}].geometry[${pi}]`)),
  };
}

function dedupeRoomKeys(rooms: SemanticFloorPlanV1['rooms'], warnings: string[]): void {
  const seen = new Map<string, number>();
  for (const room of rooms) {
    const count = (seen.get(room.key) ?? 0) + 1;
    seen.set(room.key, count);
    if (count > 1) {
      const newKey = `${room.key}-${count}`;
      warnings.push(`房间 key "${room.key}" 重复，已重命名为 "${newKey}"`);
      room.key = newKey;
    }
  }
}

/**
 * 校验并规范化 SemanticFloorPlanV1。
 * 无效数据抛出 Error；可恢复问题写入 warnings。
 */
export function validateSemanticFloorPlan(data: unknown): SemanticFloorPlanValidationResult {
  const warnings: string[] = [];

  if (!isRecord(data)) {
    throw new Error('语义户型数据必须是 JSON 对象');
  }

  if (data.schemaVersion !== SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION) {
    throw new Error(`不支持的 schemaVersion: ${String(data.schemaVersion)}`);
  }

  if (!isRecord(data.meta)) {
    throw new Error('meta 无效');
  }
  const source = data.meta.source;
  if (!META_SOURCES.includes(source as (typeof META_SOURCES)[number])) {
    throw new Error('meta.source 无效');
  }
  const confidence = data.meta.confidence;
  if (confidence != null && (!isFiniteNumber(confidence) || confidence < 0 || confidence > 1)) {
    throw new Error('meta.confidence 必须在 0~1 之间');
  }

  if (!isRecord(data.defaults)) {
    throw new Error('defaults 无效');
  }
  if (!isFiniteNumber(data.defaults.wallThickness) || data.defaults.wallThickness <= 0) {
    throw new Error('defaults.wallThickness 无效');
  }
  if (!isFiniteNumber(data.defaults.wallHeight) || data.defaults.wallHeight <= 0) {
    throw new Error('defaults.wallHeight 无效');
  }
  if (!WALL_KINDS.includes(data.defaults.wallKind as (typeof WALL_KINDS)[number])) {
    throw new Error('defaults.wallKind 无效');
  }

  if (!isRecord(data.coordinateSystem) || data.coordinateSystem.unit !== 'meter') {
    throw new Error('coordinateSystem.unit 必须为 "meter"');
  }

  if (!Array.isArray(data.walls)) throw new Error('walls 必须是数组');
  if (!Array.isArray(data.openings)) throw new Error('openings 必须是数组');
  if (!Array.isArray(data.rooms)) throw new Error('rooms 必须是数组');

  const walls = data.walls.map((w, i) => validateWall(w, i, warnings));
  const openings = data.openings.map((o, i) => validateOpening(o, i, walls.length));
  const rooms = data.rooms.map((r, i) => validateRoom(r, i));
  dedupeRoomKeys(rooms, warnings);

  const roomKeys = new Set(rooms.map((r) => r.key));

  let fixtures: SemanticFixtureV1[] | undefined;
  if (data.fixtures != null) {
    if (!Array.isArray(data.fixtures)) throw new Error('fixtures 必须是数组');
    fixtures = data.fixtures.map((f, i) => validateFixture(f, i, roomKeys));
  }

  let annotations: SemanticAnnotationV1[] | undefined;
  if (data.annotations != null) {
    if (!Array.isArray(data.annotations)) throw new Error('annotations 必须是数组');
    annotations = data.annotations.map((a, i) => validateAnnotation(a, i));
  }

  const plan: SemanticFloorPlanV1 = {
    schemaVersion: SEMANTIC_FLOOR_PLAN_SCHEMA_VERSION,
    meta: {
      title: typeof data.meta.title === 'string' ? data.meta.title : undefined,
      floorLevel: typeof data.meta.floorLevel === 'string' ? data.meta.floorLevel : undefined,
      floorLevelLabel:
        typeof data.meta.floorLevelLabel === 'string' ? data.meta.floorLevelLabel : undefined,
      source: source as SemanticFloorPlanV1['meta']['source'],
      confidence: confidence as number | undefined,
      locale:
        data.meta.locale === 'zh-CN' || data.meta.locale === 'en-US'
          ? data.meta.locale
          : undefined,
      createdAt: typeof data.meta.createdAt === 'string' ? data.meta.createdAt : undefined,
    },
    defaults: {
      wallThickness: data.defaults.wallThickness,
      wallHeight: data.defaults.wallHeight,
      wallKind: data.defaults.wallKind as SemanticFloorPlanV1['defaults']['wallKind'],
    },
    coordinateSystem: { unit: 'meter' },
    walls,
    openings,
    rooms,
    fixtures,
    annotations,
  };

  return { plan, warnings };
}
