# Blender MCP 辅助函数 / Blender MCP Helpers

> Python 工具函数库，让 Claude Code 通过 Blender MCP 控制 Blender 4.2+ 时少踩坑。

## 来源 / Source

来自 [超声波探伤实验装置 3D 重建](../../skills/photo-to-3d/) 项目的实战经验沉淀。

## 包含工具 / What's Inside

| 模块 | 函数 | 用途 |
|------|------|------|
| 材质 | `color_rgba`, `get_or_create_mat` | 适配 Blender 4.x BSDF 节点 API |
| 几何 | `add_box`, `add_cyl`, `add_sphere` | 三大基元（注意 axis 参数） |
| 几何 | `add_trapezoid_housing` | 斜边异形三角壳体自定义网格 |
| 渲染 | `setup_render_eevee` | EEVEE Next 设置（不是 EEVEE） |
| 渲染 | `hide_water_tank` / `show_water_tank` | 透明物体临时隐藏 |
| 相机 | `render_view` / `render_multi_views` | 多视角渲染模板 |
| 工具 | `safe_delete_objects` | 避免 RNA 删除错误 |
| 工具 | `check_axis_alignment` | 对齐自动检查 |
| 工具 | `check_water_tank_containment` | 位移台位置自动检查 |

## 用法 / Usage

通过 Blender MCP `mcp__blender__execute_blender_code` 调用：

```python
import sys
sys.path.insert(0, "C:/path/to/blender-mcp-helpers")
from blender_mcp_helpers import add_box, add_cyl, setup_render_eevee

# 渲染设置
setup_render_eevee()

# 创建几何
add_box("my_box", (0, 0, 0), (0.05, 0.05, 0.05), "#3a3a3a", metallic=0.7)
add_cyl("my_cyl", (0.1, 0, 0), 0.01, 0.05, "#b87333", axis='X', metallic=0.9)
```

## FOV 查表 / FOV Lookup

35mm 全画幅传感器：

| D \ F    | 26mm | 28mm | 32mm | 35mm | 50mm |
|----------|------|------|------|------|------|
| 0.40m    | 0.55 | 0.51 | 0.45 | 0.41 | 0.29 |
| 0.50m    | 0.69 | 0.64 | 0.56 | 0.51 | 0.36 |
| 0.70m    | 0.97 | 0.90 | 0.79 | 0.72 | 0.50 |
| 0.85m    | 1.18 | 1.09 | 0.96 | 0.88 | 0.61 |

（vertical capture in meters）

## 关键踩坑 / Key Pitfalls

详见 `blender_mcp_helpers.py` 顶部的注释，关键 4 条：

1. **Blender 4.x 必须用 `'BLENDER_EEVEE_NEXT'`**（不是 `'EEVEE'`）
2. **`mesh.calc_normals()` 已移除**，改用 `mesh.update()`
3. **BSDF 节点用 `node.type == 'BSDF'` 查找**（不要按 name）
4. **圆柱默认沿 Z 轴**，X/Y 必须显式 `rotation_euler`

## 配套文档 / Related Docs

- 主 skill：[`skills/photo-to-3d/`](../../skills/photo-to-3d/SKILL.md)
- 实战经验：[`docs/lessons-learned.md`](../../docs/lessons-learned.md)

## License

MIT © 2026 阎士淇
