---
name: photo-to-3d
description: "Use this skill when the user wants to convert photos/screenshots/CAD line drawings of equipment into 3D Blender models. Trigger: 照片转3D, 识图建模, 图片建模, photo to 3D, image to model, 从图片生成模型, 拍照建模, 多视角融合, 多角度建模, 装置建模, 线稿建模. Also trigger for multi-view fusion, building Blender scenes from equipment photos, or iterative AI-driven 3D reconstruction with AI comparing current render to reference images."
---

# 照片转 3D 建模 Skill（AI 主导 + Blender MCP）

本 Skill 走 **minimax 多模态 AI 直接看图分析 → AI 给 Blender MCP prompt → 增量构建 → AI 对比渲染图与预期图 → 迭代修正** 的工作流。

> ⚠️ **2026-06 更新**：放弃了之前 "DeepSeek + 本地 Qwen-VL + image_bridge.py 自动流水线" 方案。
> 原因：推理模型不擅长输出结构化 JSON，自动脚本会一次性生成错误模型且难调试。
> 新方法：让 minimax 多模态直接看图（用 Read 工具看 PNG），AI 自己写 Blender MCP 代码，每次渲染后 AI 自己对比预期图与现有成果，给出下一次修改的 prompt。

---

## 硬件依赖

- **minimax 多模态大模型**（直接看 PNG 图片，无需本地部署）
- **Blender 4.2.21** + **Blender MCP 插件**（`mcp__blender__execute_blender_code`）
- **FormatFactory Python**（`C:/Program Files (x86)/FormatFactory/FFModules/python/python.exe`，bash python 不可用）

---

## 核心工作流（4 阶段）

### 阶段 1：图片理解与方案设计

1. **AI 直接看图**（用 Read 工具读 PNG）
   - 实拍图：识别部件、颜色、材质、大致尺寸
   - CAD 线稿：精确位置、截面形状、装配关系
2. **多视角交叉验证**（5 张线稿看 1 个装置）
3. **明确"不变"和"可变"部件**（用户可能锁定某些部件）
4. **输出方案**：
   - 坐标轴定义（X/Y/Z 各代表什么）
   - 部件清单 + 关键尺寸
   - 拆分策略（4 部分独立调整）

### 阶段 2：分部件增量建模

**核心原则**：
- 用 Blender MCP `mcp__blender__execute_blender_code` 实时控制
- 一次只改 1 个部件（删除旧的 → 构建新的 → 渲染验证）
- 关键对齐用自动检查脚本

**4 部分拆分模板**（超声波探伤装置案例）：
1. 接收器
2. 探头 + 波带片
3. 三维位移台
4. 整体对齐（Z/Y/X 同轴）

### 阶段 3：AI 对比迭代（关键创新点）

**这是本方法的核心创新**——AI 主动对比渲染图与预期图：

```
[用户给 AI 看预期图] ─┐
                     ├─→ [AI 写差异清单] → [AI 写修改 prompt]
[AI 看当前渲染图]   ─┘                                  ↓
                                              [MCP 执行修改]
                                                      ↓
                                              [渲染新视角验证]
                                                      ↓
                                                    (循环)
```

**关键点**：
- AI 用 Read 工具看当前 PNG 渲染图
- AI 用 Read 工具看预期参考图
- AI 自己写"差异清单"（"接收器中轴线比波带片低 14mm"）
- AI 自己写"修复 prompt"（"把接收器所有部件 Z 坐标 +14mm"）
- AI 自己执行修复（不依赖用户写 prompt）

### 阶段 4：多视角完整结构渲染

**视角配置**（FOV 计算公式见下）：
- 正前水平（紧凑版）：F=26mm @ D=0.50m → 主体占 80% 画面
- 正前水平（标准版）：F=35mm @ D=0.55m → 主体占 60%
- 3/4 视角：突出立体感
- 俯视：验证 Y/X 对齐
- 部件特写：U 铰转轴、卡扣等

---

## 与之前"自动流水线"方案的对比

| 维度 | ❌ 旧方案（已废弃） | ✅ 新方案（本 Skill） |
|------|------------------|---------------------|
| 大模型 | DeepSeek + 本地 Qwen3-VL:2b/4b | minimax 多模态（云端） |
| 识图方式 | 自动 image_bridge.py 调用 Ollama | AI 用 Read 工具直接看 PNG |
| 建模方式 | blender_gen.py 自动生成脚本 | AI 实时写 MCP 代码 |
| 错误修复 | 改 JSON 重跑整个流水线 | 增量修改单部件（删除+重建） |
| 对比验证 | 人工对比 | AI 自己对比 + 写差异清单 + 写修复 prompt |
| 迭代速度 | 慢（每次重启 Blender/流水线） | 快（MCP 实时，秒级反馈） |
| 适合场景 | 大批量简单部件 | 复杂精密装置（如探伤仪） |

**为什么放弃旧方案**：
1. DeepSeek 推理模型不擅长输出结构化 JSON
2. 本地 Qwen3-VL 2b 太小，识图能力有限
3. 自动脚本一次性生成错误模型后，调试困难
4. 流水线断了就前功尽弃

---

## 关键辅助函数（必背）

```python
import bpy
from mathutils import Vector

# === 材质（处理 Blender 4.x API）===
def color_rgba(hex_color, alpha=1.0):
    h = hex_color.lstrip('#')
    return (int(h[0:2], 16)/255.0, int(h[2:4], 16)/255.0, int(h[4:6], 16)/255.0, alpha)

def get_or_create_mat(name, hex_color, metallic=0.0, roughness=0.5):
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = None
    for node in mat.node_tree.nodes:  # 用 type 而非 name 查找
        if node.type == 'BSDF':
            bsdf = node
            break
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color_rgba(hex_color)
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
    return mat

# === 几何基元（注意 axis 参数）===
def add_box(name, loc, dims, hex_color, metallic=0.0, roughness=0.5):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (dims[0], dims[1], dims[2])  # (X, Y, Z)
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj

def add_cyl(name, loc, radius, height, hex_color, axis='Z', metallic=0.0, roughness=0.5):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    # 关键：Blender 默认沿 Z 轴
    if axis == 'X':
        obj.rotation_euler = (0, 1.5708, 0)
    elif axis == 'Y':
        obj.rotation_euler = (1.5708, 0, 0)
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj

def add_sphere(name, loc, radius, hex_color, metallic=0.0, roughness=0.5):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=32, ring_count=16)
    obj = bpy.context.active_object
    obj.name = name
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj
```

### 自定义网格（异形壳体）

```python
def add_trapezoid_housing(name, hex_color, metallic=0.7, roughness=0.4):
    """上窄下宽梯形壳体，左上角斜切"""
    verts = [
        (-0.24, -0.04, 0.08), (-0.15, -0.04, 0.08), (-0.15, 0.04, 0.08), (-0.24, 0.04, 0.08),
        (-0.21, -0.04, 0.22), (-0.15, -0.04, 0.22), (-0.15, 0.04, 0.22), (-0.21, 0.04, 0.22),
        (-0.24, -0.04, 0.18), (-0.24, 0.04, 0.18),
    ]
    faces = [
        (0, 1, 2, 3), (1, 5, 6, 2), (3, 2, 6, 7, 9),
        (0, 8, 4, 5, 1), (0, 3, 9, 8), (8, 9, 7, 4), (4, 5, 6, 7),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()  # Blender 4.x 已无 calc_normals()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj
```

---

## 相机 FOV 计算公式

```
vertical_capture = 2 × D × tan(arctan(18/F))
horizontal_capture = 2 × D × tan(arctan(24/F))
```

D = 相机到目标的距离，F = 焦距（mm），35mm 全画幅传感器。

**查表**（垂直 capture）：

| D \ F | 26mm | 28mm | 32mm | 35mm | 50mm |
|-------|------|------|------|------|------|
| 0.40m | 0.55m | 0.51m | 0.45m | 0.41m | 0.29m |
| 0.50m | 0.69m | 0.64m | 0.56m | 0.51m | 0.36m |
| 0.70m | 0.97m | 0.90m | 0.79m | 0.72m | 0.50m |
| 0.85m | 1.18m | 1.09m | 0.96m | 0.88m | 0.61m |

**典型配置**：
- 完整装置 0.39m × 0.30m → 紧凑版 F=26 @ D=0.50, 标准版 F=35 @ D=0.55

```python
# 4 视角渲染模板
def render_view(name, loc, look_at, focal_mm, out_dir):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    cam.name = f"Cam_{name}"
    direction = Vector(look_at) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = focal_mm
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = f"{out_dir}/{name}.png"
    bpy.ops.render.render(write_still=True)
```

---

## 渲染设置（必须用 EEVEE Next）

```python
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'  # 不是 EEVEE！
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.eevee.taa_render_samples = 64
bpy.context.scene.render.film_transparent = False
bpy.context.scene.view_settings.view_transform = 'Standard'

# 临时隐藏水箱等透明物体（避免叠加发白）
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith("水箱_"):
        o.hide_render = True
        o.hide_viewport = True
```

---

## 迭代案例：超声波探伤装置（实测完整流程）

### 版本演进
- v1-v3: 旧方案（Qwen-VL + 自动脚本）→ 失败（坐标错、整体方向错）
- v4: 切换到 MCP + minimax 看图 → 接收器单部件调对
- v5: 探头+波带片 + L 弯钩穿透水箱壁
- v6: 整体 Z/Y/X 同轴（接收器抬 14mm）→ ✅ 满意

### 关键修复案例（AI 对比驱动）
1. **v3 → v4**：AI 对比渲染图发现"位移台是直筒悬臂" vs 预期"L 弯钩" → 重建 L 弯钩
2. **v4 → v5**：AI 对比发现"U 铰是球+杆" vs 预期"U 夹耳+转轴" → 重建 U 铰
3. **v5 → v6**：AI 对比发现"探头和接收器错位 14mm" → 整体抬高 14mm

---

## 故障排查（Blender 4.x + MCP 常见坑）

| 症状 | 原因 | 解决 |
|------|------|------|
| `AttributeError: 'Mesh' object has no attribute 'calc_normals'` | Blender 4.x 已移除该方法 | 改用 `mesh.update()` |
| 渲染报 "EEVEE not found" | 引擎名称错误 | 用 `'BLENDER_EEVEE_NEXT'` |
| `Principled BSDF` 节点找不到 | 节点名因版本而异 | 用 `node.type == 'BSDF'` 查找 |
| 圆筒变竖直（应为水平） | `add_cylinder` 默认沿 Z 轴 | 显式 `axis='X'` + `rotation_euler` |
| 透明水箱叠加导致画面发白 | 5 面壁 alpha 叠加 | 渲染时 `hide_render=True` |
| bash 里 `python` 命令失败 | 解释器是损坏的 stub | 用 FormatFactory Python 绝对路径 |
| 删除物体报 RNA 错误 | 批量删除时 | 用 `try/except` 包装或先存名字 |
| 主体在画面中偏小 | 相机太远或焦距太长 | 改用 F=26mm @ D=0.50m |
| 主体顶部被切 | 相机视野不够 | 拉远距离 + 改用更广角 |

---

## 文件位置

```
D:\装置建模\                    # 项目工作目录
├── 写实/                      # 实拍图
├── 线稿/                      # CAD 线稿
├── 校赛实验装置.blend         # Blender 主文件
├── blender_addon.py           # 工具函数
└── 3D建模方法经验教训.md      # 详细经验文档

C:\Users\lenovo\ollama-bridge\ # 工具脚本目录（少量辅助）
├── 渲染输出 PNG               # 多视角验证图
└── （已废弃）fused_3d_model_v8.json + scene_v8.py
```

---

## 一句话总结

**minimax 直接看图 + AI 实时写 MCP 代码 + 每次渲染 AI 自己对比预期图给修改 prompt = 高效 3D 重建**。

放弃一切"让模型输出 JSON 让脚本自动生成"的尝试。**AI 看图 + 写代码 + 对比**是唯一可靠路径。
