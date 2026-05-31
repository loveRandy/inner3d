# 3D 场景编辑器

Web 端 3D 室内场景编辑器，支持家具摆放、户型绘制、模型材质替换与房间地台设计，方案数据持久化在浏览器 IndexedDB 中。

---

## 目录

- [项目背景与用途](#项目背景与用途)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心模块实现](#核心模块实现)
- [新人切入指南](#新人切入指南)
- [相关文档](#相关文档)

---

## 项目背景与用途

本项目是一个面向室内设计与可视化场景的 **Web 3D 编辑器 MVP**，参考酷家乐等产品的工作流，分阶段迭代：

| 阶段 | 能力 | 状态 |
|------|------|------|
| **P0** | 三栏布局、模型库放置、Gizmo 变换、组合/解组、撤销重做、IndexedDB 持久化 | ✅ 已完成 |
| **P1** | 2D 画户型（直墙/矩形墙/门窗）、房间自动闭合、2D↔3D 联动 | ✅ 已完成 |
| **P1+** | 模型部件级材质替换（进入独立材质编辑子模式） | ✅ 已完成 |
| **地台 MVP** | 3D 点击房间地面 → 2D 地台材质编辑 + 3D 预览 | ✅ 已完成 |

**典型使用场景：**

1. 在 **摆家具模式** 下从左侧模型库选取 GLTF 模型，在 3D 场景中放置、移动、旋转、缩放
2. 切换到 **画户型模式**，在 2D SVG 画布上绘制墙体与门窗，实时在 3D 中挤出显示
3. 选中模型进入 **材质模式**，按 mesh 部件替换材质预设或自定义贴图
4. 在 3D 中点击房间地面进入 **地台设计**，为整片地面替换地板/瓷砖等材质
5. 方案自动/手动保存到浏览器，支持导出 JSON 文件

---

## 技术栈

### 核心框架

| 类别 | 技术 | 用途 |
|------|------|------|
| 构建 | [Vite 6](https://vitejs.dev/) + TypeScript | 开发服务器、打包、路径别名 `@/` |
| UI | React 18 | 组件化界面 |
| 3D 渲染 | [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | WebGL 场景图与 React 集成 |
| 3D 工具 | [@react-three/drei](https://github.com/pmndrs/drei) | OrbitControls、Grid、Sky、useGLTF、TransformControls 等 |
| 状态管理 | [Zustand](https://zustand.docs.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) | 全局状态与不可变更新 |
| 持久化 | [idb-keyval](https://github.com/nicepkg/idb-keyval) | IndexedDB 读写场景文档 |
| 样式 | Less | 全局样式与 CSS 变量 |
| 工具库 | uuid | 实体 ID 生成 |

### 构建与部署

- **代码分割**：Three.js 与 R3F 独立 chunk（见 `vite.config.ts`）
- **CDN 部署**：支持七牛云发布脚本（`scripts/release-qiniu.mjs`、`deploy-qiniu.mjs`）
- **环境变量**：`VITE_CDN_BASE_URL` 配置静态资源 base URL

---

## 快速开始

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 类型检查 + 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

开发服务器默认在 `http://localhost:5173` 启动。

---

## 项目结构

```
3dScenceEditor/
├── index.html                 # 入口 HTML
├── vite.config.ts             # Vite 配置（别名、CDN base、分包）
├── package.json
├── tsconfig.json              # TS 项目引用
├── tsconfig.app.json          # 应用 TS 配置
├── tsconfig.node.json         # Node 脚本 TS 配置
│
├── scripts/                   # 构建/部署/资产生成脚本
│   ├── deploy-qiniu.mjs       # 七牛云部署
│   ├── release-qiniu.mjs      # 构建 + 发布七牛
│   ├── download-kenney-building.mjs  # 下载建筑资产
│   └── generate-bed-parts.mjs # 生成床部件 GLTF
│
├── public/                    # 静态资源（构建时原样复制）
│   ├── models/                # GLTF 模型（KayKit 家具、自定义模型）
│   ├── thumbnails/            # 模型缩略图
│   └── materials/thumbnails/  # 材质缩略图
│
├── src/
│   ├── main.tsx               # React 挂载入口
│   ├── vite-env.d.ts          # Vite 类型声明
│   │
│   ├── app/                   # 应用壳层与布局
│   │   ├── App.tsx            # 根组件：加载场景、自动保存、快捷键
│   │   └── layout/
│   │       ├── EditorLayout.tsx       # 主编排：模式切换、三栏布局
│   │       ├── TopBar.tsx             # 顶栏：保存/撤销/重做/组合/模式切换
│   │       ├── ModelPanel.tsx         # 左侧模型库（摆家具模式）
│   │       ├── PropertyPanel.tsx      # 右侧属性面板
│   │       ├── TopView.tsx            # 右侧俯视图（2D 顶视导航）
│   │       ├── FloorPlanToolPanel.tsx # 左侧画户型工具面板
│   │       ├── FloorPlanCanvas.tsx    # 中间 2D 户型 SVG 画布（核心交互）
│   │       ├── FloorPlanPropertyPanel.tsx  # 画户型属性面板
│   │       ├── StatusBar.tsx          # 底部状态栏
│   │       └── ConfirmDialog.tsx      # 清空确认等对话框
│   │
│   ├── features/              # 按功能域划分的 UI 与业务组件
│   │   ├── scene/             # 3D 场景编辑
│   │   │   ├── SceneViewport.tsx      # R3F Canvas 容器
│   │   │   ├── SceneContent.tsx       # 灯光、网格、墙体、模型、Gizmo
│   │   │   ├── SceneObject.tsx        # 单个场景实体（模型/组）渲染
│   │   │   ├── SceneInteraction.tsx   # 地面射线、放置模型、空白取消选中
│   │   │   ├── PlacementPreview.tsx   # 放置模式 Ghost 预览
│   │   │   ├── TransformGizmo.tsx     # TransformControls 变换手柄
│   │   │   ├── SceneOutlines.tsx      # 选中轮廓高亮
│   │   │   ├── TopViewContent.tsx     # 俯视图内容
│   │   │   ├── FixedTopDownCamera.tsx # 固定顶视相机
│   │   │   └── WireframeBounds.tsx    # 线框包围盒
│   │   │
│   │   ├── floorPlan/         # 户型 2D/3D 渲染
│   │   │   ├── PreviewViewport.tsx    # 画户型模式下的 3D 预览
│   │   │   ├── WallMeshLayer.tsx      # 3D 墙体挤出网格
│   │   │   ├── RoomFloorMeshLayer.tsx # 3D 房间地面（可点击选房间）
│   │   │   ├── ArchitectureMeshes3D.tsx # 门洞/窗洞 3D 几何
│   │   │   ├── DoorMesh3D.tsx         # 门 GLTF 网格
│   │   │   ├── OpeningGltfMesh.tsx    # 门窗 GLTF 加载
│   │   │   ├── OpeningSymbol2D.tsx    # 2D 门窗符号
│   │   │   ├── WallAnnotations2D.tsx  # 2D 墙段尺寸标注
│   │   │   ├── RoomFloorFills2D.tsx   # 2D 房间地面填充
│   │   │   ├── ModelSymbol2D.tsx      # 2D 家具 footprint 符号
│   │   │   ├── ModelFootprintWarmup.tsx # 预计算模型 footprint
│   │   │   ├── MeshWithEdges.tsx      # 带边线的 mesh 辅助组件
│   │   │   ├── WallSelectionOutline.tsx
│   │   │   ├── architectureAssets.ts  # 建筑 GLTF 资产路径
│   │   │   ├── architectureStyle.ts   # 建筑渲染样式常量
│   │   │   ├── openingLayout3D.ts     # 3D 洞口布局计算
│   │   │   └── openingMounts3D.ts     # 洞口挂载点
│   │   │
│   │   ├── material/          # 模型材质编辑子模式
│   │   │   ├── MaterialEditorLayout.tsx   # 材质模式全屏布局
│   │   │   ├── MaterialModeButton.tsx     # 3D 中进入材质模式入口
│   │   │   ├── MaterialLibraryPanel.tsx   # 材质库面板
│   │   │   ├── MaterialPreviewViewport.tsx
│   │   │   ├── MaterialPreviewContent.tsx # 材质预览 3D 内容
│   │   │   ├── MaterialPartTree.tsx       # 模型部件树
│   │   │   └── MaterialPartProperties.tsx # 部件材质属性
│   │   │
│   │   ├── platformDesign/    # 地台设计子模式
│   │   │   ├── PlatformDesignLayout.tsx   # 地台设计全屏布局
│   │   │   ├── PlatformDesignButton.tsx   # 3D 中进入地台设计入口
│   │   │   ├── PlatformDesignTopBar.tsx   # 地台模式顶栏
│   │   │   ├── PlatformDesignCanvas.tsx   # 2D 地台 SVG 画布
│   │   │   ├── PlatformPreviewViewport.tsx
│   │   │   ├── PlatformMaterialPanel.tsx  # 地台材质库
│   │   │   ├── PlatformDesignDialogs.tsx  # 保存/关闭确认
│   │   │   ├── PlatformDimensionAnnotations.tsx
│   │   │   ├── RoomFloorFill2D.tsx
│   │   │   ├── FloorMaterialCursorGhost.tsx
│   │   │   └── floorMaterials/index.ts    # 地台材质预设加载
│   │   │
│   │   ├── assets/            # 资产加载
│   │   │   ├── index.ts       # manifest 合并、getAssetById
│   │   │   └── useAssetPreload.ts  # GLTF 预加载
│   │   │
│   │   ├── materials/         # 家具材质预设
│   │   │   └── index.ts
│   │   │
│   │   └── history/           # 历史记录 re-export
│   │       └── index.ts
│   │
│   ├── stores/                # Zustand 全局 Store
│   │   ├── sceneStore.ts      # 场景文档、选中、放置模式、户型选中
│   │   ├── editorStore.ts     # 编辑模式、画墙工具状态、材质/地台子模式
│   │   ├── historyStore.ts    # 撤销/重做命令栈
│   │   ├── platformHistoryStore.ts  # 地台设计独立历史栈
│   │   ├── sceneRefsStore.ts  # Three.js 对象引用（材质模式用）
│   │   ├── customAssetStore.ts      # 用户导入自定义模型
│   │   └── modelFootprintStore.ts   # 模型 2D footprint 缓存
│   │
│   ├── types/                 # 领域类型定义
│   │   ├── scene.ts           # SceneDocument、SceneEntity、Transform
│   │   ├── floorPlan.ts       # WallSegment、Opening、Room、FloorPlan
│   │   └── platformDesign.ts  # 地台材质预设类型
│   │
│   ├── lib/                   # 纯逻辑层（无 React 依赖为主）
│   │   ├── commands/          # 命令模式：execute/undo
│   │   │   ├── types.ts
│   │   │   ├── sceneCommands.ts      # 放置/变换/组合/材质等
│   │   │   ├── floorPlanCommands.ts  # 画墙/门窗/房间属性
│   │   │   └── index.ts
│   │   ├── scene/             # 场景文档工具
│   │   │   ├── documentUtils.ts      # 快照、归一化、实体创建
│   │   │   ├── modelUtils.ts         # GLTF 地面偏移等
│   │   │   ├── meshParts.ts          # 模型部件树解析
│   │   │   ├── materialUtils.ts      # 材质 override 应用
│   │   │   ├── gltfAnalysis.ts       # GLTF 结构分析
│   │   │   └── modelFootprint.ts     # 顶视 footprint 计算
│   │   ├── floorPlan/         # 户型几何与交互算法
│   │   │   ├── wallGeometry.ts       # 墙段四边形、投影
│   │   │   ├── snap.ts               # 端点/网格吸附
│   │   │   ├── alignGuides.ts        # 对齐参考线
│   │   │   ├── canvasView.ts         # 2D 画布缩放/平移/坐标变换
│   │   │   ├── mutations.ts          # 墙体增删改
│   │   │   ├── roomDetection.ts      # 闭合环 → 房间
│   │   │   ├── roomFloorPolygon.ts   # 房间地面多边形
│   │   │   ├── openingPlacement.ts   # 门窗沿墙放置
│   │   │   ├── openingRender.ts      # 洞口 2D 渲染数据
│   │   │   ├── wallSolidParts.ts     # 墙段扣洞后的实体部分
│   │   │   ├── wallDimensions.ts     # 尺寸标注
│   │   │   ├── fitModelToOpening.ts  # 门模型适配洞口
│   │   │   ├── modelPick.ts          # 2D 家具拾取
│   │   │   ├── floorPlanToolState.ts # 工具状态辅助判断
│   │   │   └── woodFloorTexture.ts   # 木地板程序化纹理
│   │   ├── platformDesign/    # 地台材质渲染
│   │   │   ├── floorMaterialRender.ts
│   │   │   ├── floorMaterialTextures.ts
│   │   │   └── floorMaterialSvgPattern.tsx
│   │   ├── persistence/       # 持久化
│   │   │   ├── indexedDb.ts          # IndexedDB 读写
│   │   │   ├── sceneFile.ts          # JSON 导入/导出/校验
│   │   │   ├── customAssetsDb.ts     # 自定义模型 DB
│   │   │   └── index.ts
│   │   ├── transform/         # 变换数学
│   │   │   └── worldTransform.ts     # 世界/局部坐标变换
│   │   ├── math/              # 通用数学
│   │   │   ├── snap.ts               # 3D 网格吸附
│   │   │   └── index.ts
│   │   ├── assets/
│   │   │   └── publicUrl.ts          # public 路径拼接
│   │   └── id/
│   │       └── randomUUID.ts
│   │
│   ├── hooks/
│   │   └── useEditorShortcuts.ts     # 全局快捷键（撤销/工具切换等）
│   │
│   ├── assets/                # 内嵌 JSON manifest（构建时打包）
│   │   ├── manifest.json      # 模型库清单
│   │   ├── materials/manifest.json
│   │   └── floorMaterials/manifest.json
│   │
│   └── styles/
│       ├── index.less         # 全局样式入口
│       ├── variables.less     # CSS 变量
│       └── mixins.less
│
├── 3d场景编辑器mvp技术文档          # P0 详细设计
├── 3d场景编辑器-画户型P1技术文档     # P1 画户型设计
└── 3d场景编辑器-地台设计MVP技术文档  # 地台设计设计
```

---

## 核心模块实现

### 1. 数据模型：SceneDocument

所有编辑状态收敛到单一文档 `SceneDocument`（`src/types/scene.ts`）：

```typescript
interface SceneDocument {
  version: 1 | 2;
  id: string;
  settings: SceneSettings;      // 场景名、背景色、网格等
  floorPlan?: FloorPlan;        // P1 户型数据（可选）
  entities: Record<string, SceneEntity>;  // 模型/组实体
  rootIds: string[];            // 顶层实体 ID 顺序
  updatedAt: number;
}
```

- **实体树**：`model` 与 `group` 类型，组通过 `children` 引用子实体
- **户型数据**：墙体、门窗、房间、节点坐标均挂在 `floorPlan` 下
- **房间地台**：`Room.floorMaterial` 存储地台材质预设

### 2. 状态管理架构

采用 **多 Store 分工**，避免单一巨型 Store：

| Store | 职责 |
|-------|------|
| `sceneStore` | 场景文档 + 选中状态（实体/户型/房间） |
| `editorStore` | UI 模式（furniture/floorPlan）、画墙工具、材质/地台子模式 |
| `historyStore` | 主编辑区撤销/重做 |
| `platformHistoryStore` | 地台设计会话内独立历史 |

`sceneStore` 使用 Immer 中间件，命令执行后直接 patch `document`。

### 3. 命令模式与撤销重做

所有可撤销操作封装为 `Command`（`execute` + `undo`）：

```
用户操作 → createXxxCommand() → historyStore.execute(cmd)
                                      ↓
                               cmd.execute() 修改 sceneStore
                                      ↓
                               past 栈 push，future 清空
```

- **场景命令**（`sceneCommands.ts`）：放置模型、变换、组合/解组、清空、材质 override
- **户型命令**（`floorPlanCommands.ts`）：加墙、加门窗、改墙端点、删选中、房间属性

命令通过 **文档快照**（`snapshotState` / `applySnapshot`）实现 undo，保证选中状态一并恢复。

### 4. 3D 场景渲染（React Three Fiber）

```
SceneViewport (Canvas)
  └── SceneContent
        ├── 灯光 / Sky / Grid
        ├── SceneInteraction（不可见地面 mesh，处理放置与取消选中）
        ├── RoomFloorMeshLayer（房间地面，家具模式下可点击）
        ├── WallMeshLayer（墙体挤出 + 洞口）
        ├── SceneObject × N（递归渲染 model/group）
        ├── PlacementPreview（放置 Ghost）
        ├── SceneOutlines（选中描边）
        ├── MaterialModeButton / PlatformDesignButton
        └── TransformGizmo（TransformControls）
```

**关键交互逻辑**（`SceneInteraction.tsx`）：

- 放置模式：射线与地面交点 → 网格吸附 → `createAddModelCommand`
- 有选中/Gizmo 拖拽/存在房间地面时，禁用地面射线，防止点击 Gizmo 时误触失焦

### 5. 画户型 2D 画布

`FloorPlanCanvas.tsx` 是 P1 最复杂的模块（~1000 行），基于 **SVG** 实现：

- **坐标系**：世界坐标 XZ（米）↔ 屏幕像素，由 `canvasView.ts` 统一管理 zoom/pan
- **直墙/矩形墙**：鼠标拖拽 → 预览 → 松手提交 `createAddWallCommand` / `createAddRectWallsCommand`
- **吸附**：端点吸附（`snap.ts`）、正交锁定（Shift）、对齐参考线（`alignGuides.ts`）
- **门窗**：点击墙段 → 计算沿墙 offset → `createAddOpeningCommand`
- **房间**：墙体闭合后 `roomDetection.ts` 自动检测最小环并生成 `Room`

2D 编辑与 3D 共用同一份 `document.floorPlan`，墙体变更后 `WallMeshLayer` 自动重绘。

### 6. 子模式：材质编辑 & 地台设计

两者均采用 **全屏子布局替换** 主编辑器（`EditorLayout.tsx` 条件渲染）：

| 子模式 | 入口 | 布局 | 数据写回 |
|--------|------|------|----------|
| 材质模式 | 选中模型 → `MaterialModeButton` | 左材质库 / 中 3D 预览 / 右部件树 | `entity.materialOverrides` |
| 地台设计 | 选中房间地面 → `PlatformDesignButton` | 左地台材质 / 中 2D 画布 / 右 3D 预览 | `room.floorMaterial` |

地台设计使用独立的 `platformHistoryStore`，关闭未保存时丢弃 draft，保存时写回 `sceneStore`。

### 7. 持久化

```
App 启动 → hydrateCustomAssets → preloadAllAssets → loadScene (IndexedDB)
                                                          ↓
                                                   sceneStore.loadDocument

document 变更 → debounce 3s → saveScene (IndexedDB)
```

- **IndexedDB**：`lib/persistence/indexedDb.ts`，键名 `DB_KEY_CURRENT`
- **文件导入导出**：`sceneFile.ts` 支持 JSON 下载与校验
- **自定义模型**：`customAssetsDb.ts` 存储用户导入的 GLTF

### 8. 编辑模式一览

`EditorLayout` 根据状态渲染不同 UI：

```
materialMode.active     → MaterialEditorLayout
platformDesignMode.active → PlatformDesignLayout
editorMode === 'floorPlan' → FloorPlanToolPanel + FloorPlanCanvas + PreviewViewport
editorMode === 'furniture' → ModelPanel + SceneViewport + TopView
```

---

## 新人切入指南

### 第一步：跑起来并熟悉产品

1. `npm install && npm run dev`
2. 按以下顺序体验功能：
   - 左侧选模型 → 3D 场景点击放置 → Gizmo 拖拽变换
   - TopBar 切换「画户型」→ 按 `B` 画直墙、`F` 画矩形墙 → 观察右侧 3D 预览
   - 选中模型 → 进入材质模式 → 替换部件材质
   - 画完闭合房间后 → 3D 点击地面 → 进入地台设计

### 第二步：阅读顺序（建议）

```
1. src/types/scene.ts + floorPlan.ts     ← 理解数据模型
2. src/stores/sceneStore.ts + editorStore.ts  ← 理解状态边界
3. src/app/layout/EditorLayout.tsx       ← 理解 UI 编排
4. src/lib/commands/sceneCommands.ts     ← 理解一次操作的完整链路
5. src/features/scene/SceneContent.tsx   ← 理解 3D 渲染组合
6. src/app/layout/FloorPlanCanvas.tsx    ← 画户型核心（较深，可分段读）
```

### 第三步：按任务类型定位代码

| 你想做… | 从这里开始 |
|---------|-----------|
| 新增模型资产 | `src/assets/manifest.json` + `public/models/` |
| 新增家具材质预设 | `src/assets/materials/manifest.json` |
| 新增地台材质 | `src/assets/floorMaterials/manifest.json` |
| 改 3D 交互/放置逻辑 | `src/features/scene/SceneInteraction.tsx` |
| 改 Gizmo/选中表现 | `TransformGizmo.tsx`、`SceneOutlines.tsx` |
| 改画墙/门窗逻辑 | `FloorPlanCanvas.tsx` + `lib/floorPlan/` |
| 改撤销重做 | `lib/commands/` + `stores/historyStore.ts` |
| 改保存/加载 | `lib/persistence/` |
| 改快捷键 | `src/hooks/useEditorShortcuts.ts` |
| 改样式/布局 | `src/styles/` + 各 layout 组件 className |

### 第四步：开发约定

1. **可撤销操作必须走 Command**，不要直接改 `document` 而跳过 `historyStore.execute`
2. **纯计算放 `lib/`**，React 组件只做渲染与事件转发
3. **类型定义放 `types/`**，新增领域概念先补类型
4. **2D 坐标用 `Vec2 { x, z }`**，对应世界 XZ 平面，单位米
5. **路径别名**：`@/` → `src/`

### 第五步：调试技巧

- React DevTools + Zustand 可直接 inspect store 状态
- Three.js：`window` 下可通过 R3F 的 `useThree` 访问 scene（开发时可临时 log）
- 户型问题：先在 2D SVG 层确认 `floorPlan.walls` 数据是否正确，再看 3D `WallMeshLayer`
- 详细设计见项目根目录三份中文技术文档

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [3d场景编辑器mvp技术文档](./3d场景编辑器mvp技术文档) | P0：家具编辑、命令栈、持久化 |
| [3d场景编辑器-画户型P1技术文档](./3d场景编辑器-画户型P1技术文档) | P1：画墙、门窗、房间检测 |
| [3d场景编辑器-地台设计MVP技术文档](./3d场景编辑器-地台设计MVP技术文档) | 地台材质编辑流程 |

---

## 许可证

模型资产许可见 [public/models/ASSETS_LICENSE.txt](./public/models/ASSETS_LICENSE.txt)。
