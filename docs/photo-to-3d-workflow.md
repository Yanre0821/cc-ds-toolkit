# 3D 建模工作流 / 3D Modeling Workflow

> 基于 minimax 多模态 AI + Blender MCP 的照片/线稿→3D 建模完整工作流。
> 实战案例：超声波探伤实验装置。

## 核心理念 / Core Philosophy

放弃"让 LLM 输出 JSON 让脚本自动生成模型"的方案。

**采用**：**minimax 多模态直接看 PNG → AI 实时写 Blender MCP 代码 → 渲染后 AI 自己对比预期图给修复 prompt → 迭代**。

## 为什么放弃旧方案 / Why We Pivoted

| ❌ 旧方案 | 问题 |
|---------|------|
| DeepSeek + 本地 Qwen-VL:2b | 推理模型不擅长输出结构化 JSON |
| image_bridge.py 自动调用 Ollama | 一次性生成错误模型，调试困难 |
| blender_gen.py 自动生成脚本 | 流水线断了就前功尽弃 |

| ✅ 新方案 | 优势 |
|---------|------|
| minimax 多模态（云端） | 直接看图，识图能力远超本地小模型 |
| AI 用 Read 工具看 PNG | 无需本地部署，零成本 |
| 实时写 MCP 代码 | 秒级反馈，增量修改 |
| AI 自己对比 + 给 prompt | 闭环迭代，无需用户写 prompt |

## 4 阶段流程 / 4-Phase Workflow

```
[阶段 1] 图片理解
   ├── AI 直接用 Read 工具看实拍图 + 线稿
   ├── 多视角交叉验证（5 张线稿看 1 个装置）
   ├── 明确"不变"和"可变"部件
   └── 输出：坐标轴定义 + 部件清单 + 拆分策略

[阶段 2] 分部件增量建模
   ├── 4 部分拆分：接收器 / 探头+波带片 / 位移台 / 整体对齐
   ├── 每次只改 1 个部件：删除旧 → 构建新 → 渲染验证
   └── 关键对齐用自动检查脚本

[阶段 3] AI 对比迭代（核心创新点）
   用户给 AI 看预期图  ─┐
                        ├→ AI 写差异清单 → AI 写修改 prompt
   AI 看当前渲染图    ─┘                              ↓
                                              MCP 执行修改
                                                     ↓
                                              渲染新视角验证
                                                     ↓
                                                   (循环)

[阶段 4] 多视角完整结构渲染
   ├── 紧凑版：F=26mm @ D=0.50m（主体 80% 画面）
   ├── 标准版：F=35mm @ D=0.55m
   ├── 远景版：F=32mm @ D=0.80m
   └── 部件特写：U 铰、卡扣等
```

## 关键辅助函数 / Key Helpers

详见 [`tools/blender-mcp-helpers/blender_mcp_helpers.py`](../tools/blender-mcp-helpers/blender_mcp_helpers.py)：

- 材质：`get_or_create_mat` (适配 Blender 4.x)
- 几何：`add_box` / `add_cyl` / `add_sphere` / `add_trapezoid_housing`
- 渲染：`setup_render_eevee` / `hide_water_tank`
- 相机：`render_view` / `render_multi_views`
- 检查：`check_axis_alignment` / `check_water_tank_containment`

## 相机 FOV 公式 / Camera FOV Formula

35mm 全画幅传感器：

```
vertical_capture   = 2 × D × tan(arctan(18/F))
horizontal_capture = 2 × D × tan(arctan(24/F))
D = 距离 (m), F = 焦距 (mm)
```

查表（vertical capture, m）：

| D \ F | 26mm | 28mm | 32mm | 35mm | 50mm |
|-------|------|------|------|------|------|
| 0.40m | 0.55 | 0.51 | 0.45 | 0.41 | 0.29 |
| 0.50m | 0.69 | 0.64 | 0.56 | 0.51 | 0.36 |
| 0.70m | 0.97 | 0.90 | 0.79 | 0.72 | 0.50 |
| 0.85m | 1.18 | 1.09 | 0.96 | 0.88 | 0.61 |

## 关键踩坑 / Key Pitfalls

1. **坐标系方向** — X/Y/Z 必须先定义清楚，不要混用
2. **部件相对位置** — 用 `check_water_tank_containment` 自动检查"是否在水箱内"
3. **Blender 4.x API 变化** — `BLENDER_EEVEE_NEXT`, `mesh.update()`, `node.type == 'BSDF'`
4. **圆柱默认 Z 轴** — X/Y 方向必须显式 `rotation_euler`
5. **透明水箱叠加** — 渲染时 `hide_render=True` 临时隐藏
6. **相机视野** — 主体被切 = 拉远 + 改用更广角

## 案例：超声波探伤装置 / Case Study

完整案例见 [`skills/photo-to-3d/`](https://github.com/Yanre0821/cc-ds-toolkit/tree/main/skills/photo-to-3d) 和 [`examples/`](https://github.com/Yanre0821/cc-ds-toolkit/tree/main/skills/photo-to-3d/examples) 目录的渲染图。

迭代历程（v1→v6）：
- v1-v3: 旧方案（Qwen-VL + 自动脚本）→ 失败
- v4: 切换 MCP + minimax → 接收器调对
- v5: L 弯钩穿透水箱壁
- v6: 整体 Z/Y/X 同轴（接收器抬 14mm）→ ✅ 满意

## 相关资源 / Related

- 主 skill：[`skills/photo-to-3d/SKILL.md`](../skills/photo-to-3d/SKILL.md)
- 辅助函数：[`tools/blender-mcp-helpers/`](../tools/blender-mcp-helpers/)
- 经验教训：[`docs/lessons-learned.md`](lessons-learned.md)
