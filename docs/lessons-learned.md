# 实战经验教训 / Lessons Learned

> 来自 COMSOL 仿真、CAD 画图、PPT 生成等真实项目的踩坑记录。

---

## 方案选型 / Technology Selection

**教训**：方案选型必须快速验证，不要硬撑。

| 案例 | 错误做法 | 正确做法 |
|------|---------|---------|
| CAD 方案 | COM 接口试了 3 小时才放弃 | 先让 debugger 花 15 分钟验证可行性 |
| 参考案例 | 张枭的 DWG 打不开就凭感觉画 | 立即找替代方案（截图/ODAFC/换参考） |

---

## CAD 制图 / CAD Drawing

1. **比例是第一决策** — 先算好比例再写代码，不是写完发现文字太小
2. **验证脚本跟代码一起写** — gen_dxf.py 和 validate_dxf.py 同步开发
3. **QA 要量化** — 不说"效果不好"，说"框外实体 3 个 / 文字高度 2.8mm 太小 / 塔板占框宽 6%"
4. **线型/字体/图层** — 开工前确认国标要求，不要后期打补丁

---

## 团队协作 / Team Collaboration

### 角色铁律

- **project-lead 不写代码** — 专注决策和审核，代码交给 developer
- **debugger 有求必应** — 任何报错/异常先丢给 debugger 分析根因
- **qa 跑完验证才交付** — 每次改完必须自动验证
- **任何人可以喊停** — 发现问题立即报告 project-lead

### 常见反模式

| 反模式 | 后果 | 正确做法 |
|--------|------|---------|
| developer 同时 debug | 陷入细节，进度慢 | 派 debugger 独立分析 |
| 跳过 QA 直接交付 | 用户发现低级错误 | QA 验证通过再交付 |
| project-lead 亲自改代码 | 失去全局视角 | 派给 developer 改 |
| 方案不行硬撑 | 浪费大量时间 | 快速验证→快速切换 |

### 高效并行模式

```
任务 → project-lead 拆解
         ↓
   ┌─────┼─────┐
   ↓     ↓     ↓
  dev1  dev2  debugger (并行)
         ↓
       QA 审查 → project-lead 终审
```

---

## PPT 生成 / Presentation Generation

1. **先规划结构再生成** — 不是让 AI 从 0 猜，而是你先说清楚有多少页、每页讲什么
2. **图文并茂不是堆图** — 每页 1 个核心观点 + 1-2 张关键图表
3. **字号硬约束** — 正文 ≥ 24pt，标注 ≥ 18pt（物理竞赛要求）
4. **批量操作要验证** — 插完页码、修完格式后跑一遍 check 脚本

---

## COMSOL 仿真 / Simulation

详见 [COMSOL 工作流程记忆](../memory/project_comsol_workflow.md)（项目级 memory 文件）。

核心原则：阶段化操作，先读后改，每一步都验证。

---

## 3D 建模（Blender）/ 3D Modeling

来自超声波探伤装置 3D 重建项目的踩坑记录。完整工作流见 [photo-to-3d-workflow.md](photo-to-3d-workflow.md)。

### 方案选型 / Technology Selection

**教训**：让推理模型输出 JSON 让脚本自动生成模型是死路。

| 错误做法 | 后果 | 正确做法 |
|---------|------|---------|
| DeepSeek 推理模型输出结构化 JSON | 输出格式混乱，脚本解析失败 | 用 minimax **多模态**直接看图，写自然语言描述 |
| 本地 Qwen-VL:2b 一次生成整个模型 | 错了就要全重来 | **AI 实时写 Blender MCP 代码**，增量修改单部件 |
| 流水线断了从零开始 | 前功尽弃 | 拆成 4 部分独立调整，**AI 自己对比预期图给 prompt** |

### Blender 4.x API 变化

1. **渲染引擎改名** — `'EEVEE'` → `'BLENDER_EEVEE_NEXT'`
2. **Mesh 法线方法移除** — `mesh.calc_normals()` → `mesh.update()`
3. **BSDF 节点查找** — 按 `name` 找不到，要按 `node.type == 'BSDF'`
4. **圆柱默认沿 Z 轴** — X/Y 方向必须 `rotation_euler = (0, 1.5708, 0)`

### 关键对齐

1. **坐标系先写死** — 3 行字 + 1 张 ASCII 图，避免 X/Y 混用
2. **自动检查"是否在水箱内"** — 用 `max([v.co.x for v in mesh.vertices]) > tank_wall_x` 判定
3. **关键 Z/Y 差** — 用 `abs(probe_z - receiver_z) < 0.0001` 判定，输出 0.0mm ✅ 或 14.0mm ❌
4. **整体抬高/平移** — 选中一组物体，循环修改 `obj.location`，保留相对关系

### 相机视角

| 症状 | 解决 |
|------|------|
| 主体被切 | 拉远 + 改用更广角 (F=26mm) |
| 主体太小 | 拉近 + 改用更广角 |
| 透明水箱叠加发白 | 渲染时 `hide_render=True` 临时隐藏 |
| 视野不完整 | 用 FOV 公式：`2*D*tan(arctan(18/F))` 算 capture |

### 工作流铁律

1. **拆分独立** — 4 部分（接收器/探头/波带片/位移台）独立调整
2. **保留锁定部件** — 用户说"不做修改"的部件，**绝对不动**（删除重建前先核对清单）
3. **多视角验证** — 每次改完渲染 4 视角（正前/3-4/俯视/特写）
4. **AI 对比驱动** — AI 用 Read 工具看当前渲染图 + 预期图，写差异清单，写修复 prompt

### 一句话总结

**minimax 多模态看图 + Blender MCP 实时控制 + AI 对比迭代 = 唯一可靠的 3D 重建路径。**

---

*持续更新中，每次踩坑后追加*
