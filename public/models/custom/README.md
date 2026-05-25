# 自定义 GLTF 模型目录

## 测试模型（可选）

`bed_double_parts.gltf` 为 4 部件示例，可通过「导入 GLTF」加入模型库，或运行：

```bash
node scripts/generate-bed-parts.mjs
```

## 导入说明

左栏 **导入 GLTF** 会自动检测 mesh 数量。单 mesh 与多 mesh 模型均支持材质替换：

- **单 mesh**：整体替换材质
- **多 mesh**：可按部件分别替换

导入的模型保存在浏览器 IndexedDB，刷新后仍可用。
