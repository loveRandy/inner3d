export interface SemanticFloorPlanV1 {
  schemaVersion: 'semantic-floor-plan/1';

  /** 全局元数据 */
  meta: {
    title?: string;
    floorLevel?: string;          // e.g. "4F", "B1"
    floorLevelLabel?: string;     // e.g. "下三楼"
    source: 'manual' | 'ai' | 'cad_import' | 'editor_export';
    confidence?: number;          // 0~1，AI 输出时使用
    locale?: 'zh-CN' | 'en-US';
    createdAt?: string;           // ISO8601
  };

  /** 物理默认值（米） */
  defaults: {
    wallThickness: number;        // default 0.24
    wallHeight: number;           // default 2.8
    wallKind: 'bearing' | 'nonBearing';
  };

  /** 坐标：世界 XZ 平面，单位米；原点与 editor grid 对齐 */
  coordinateSystem: {
    unit: 'meter';
    /** 图像→世界标定（有参考图时填写） */
    imageCalibration?: {
      imageWidth: number;
      imageHeight: number;
      /** 图像像素 Y 向下；参考线段像素坐标 */
      referenceLinePx: [[number, number], [number, number]];
      referenceLengthM: number;
      rotationRad?: number;
      originWorld?: { x: number; z: number };
    };
  };

  /** 墙段列表 — 用数组下标作拓扑引用 */
  walls: Array<{
    start: { x: number; z: number };
    end: { x: number; z: number };
    thickness?: number;
    height?: number;
    kind?: 'bearing' | 'nonBearing';
    /** 是否外墙（语义，可选） */
    isExterior?: boolean;
  }>;

  /** 门窗洞口 — wallIndex 指向 walls[] */
  openings: Array<{
    type: 'door' | 'window' | 'opening';
    wallIndex: number;
    offset: number;               // 沿墙起点偏移，米
    width: number;
    height?: number;
    sillHeight?: number;
    flip?: boolean;
    /** 语义：入户门 / 推拉门等，P2 */
    doorStyle?: 'swing' | 'sliding' | 'unknown';
  }>;

  /** 房间 — 语义核心 */
  rooms: Array<{
    /** 稳定语义键，用于 fixtures.roomKey 引用；导出时生成 slug */
    key: string;                  // e.g. "lounge", "closet-1"
    roomType: RoomType;
    /** 显示名（可来自 OCR） */
    name?: string;
    nameZh?: string;
    nameEn?: string;
    /** 闭合多边形顶点（米），≥3 点；与墙拓扑 redundant 但利于监督学习 */
    polygon: Array<{ x: number; z: number }>;
    /** 面积（㎡），可冗余存储便于校验 */
    area?: number;
    /** 图中文字标注（OCR 监督） */
    labels?: Array<{
      text: string;
      language?: 'zh' | 'en';
      position: { x: number; z: number };
    }>;
  }>;

  /** 固定装置 / 平面家具符号 */
  fixtures?: Array<{
    category: FixtureCategory;
    roomKey?: string;             // 所属房间语义键
    position: { x: number; z: number };
    rotationDeg?: number;
    size?: { width: number; depth: number; height?: number };
    count?: number;
    label?: string;               // 图中标注，如 "A/C"
  }>;

  /** 无法归入标准类的矢量标注（楼梯箭头、斜墙注释等） */
  annotations?: Array<{
    type: 'text' | 'arrow' | 'dimension' | 'custom';
    content?: string;
    geometry: Array<{ x: number; z: number }>;
  }>;
}