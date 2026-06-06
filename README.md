# CC-DS Toolkit

> Claude Code + DeepSeek 驱动的 AI 工程工具箱 / AI-powered engineering toolkit for simulation, CAD, and document automation.

## 这是什么 / What

一套基于 Claude Code 的 **Skills（技能）** 和 **Tools（工具）**，覆盖：

- 🔬 **COMSOL 仿真** — MCP 远程操控 + CLI 批量工作流
- 📐 **CAD 工程制图** — ezdxf 生成化工/设备图纸
- 📊 **PPT/DOCX 自动化** — 学术汇报、答辩、文档批量处理
- 👥 **多角色团队协作** — AI Agent 团队并行开发+审查

全部用自然语言驱动，不需要写代码。

## 快速导航 / Quick Nav

| 你想做什么 | 去哪 |
|-----------|------|
| 搭建 CC+DS 环境 | [`docs/setup-cc-ds.md`](docs/setup-cc-ds.md) |
| 操控 COMSOL 做仿真 | [`skills/comsol-mcp/`](skills/comsol-mcp/) |
| 生成 CAD 工程图纸 | [`skills/cad-drawing/`](skills/cad-drawing/) |
| 做 PPT / 处理 Word | [`skills/pptx/`](skills/pptx/) |
| 启动 AI 团队协作 | [`skills/team/`](skills/team/) |
| 去除 AI 写作痕迹 | [`skills/humanizer-zh/`](skills/humanizer-zh/) |
| 照片/线稿转 3D 模型 | [`skills/photo-to-3d/`](skills/photo-to-3d/) |
| 批量处理办公文档 | [`tools/office-scripts/`](tools/office-scripts/) |
| Blender MCP 辅助函数 | [`tools/blender-mcp-helpers/`](tools/blender-mcp-helpers/) |
| 看实战教训 | [`docs/lessons-learned.md`](docs/lessons-learned.md) |

## 目录结构 / Structure

```
cc-ds-toolkit/
├── skills/                  # 技能（AI 协作的核心）
│   ├── comsol-mcp/          #   COMSOL 仿真操控
│   ├── cad-drawing/         #   ezdxf 工程制图
│   ├── pptx/                #   学术/答辩 PPT 生成
│   ├── team/                #   多角色 AI 团队
│   ├── frontend-slides/     #   Web 幻灯片
│   ├── humanizer-zh/        #   中文去 AI 味
│   └── photo-to-3d/         #   照片/线稿转 3D 建模
├── tools/                   # 独立工具
│   ├── vibe-simulation/     #   COMSOL CLI 工作流
│   ├── office-scripts/      #   DOCX/PPT 批量处理
│   └── blender-mcp-helpers/ #   Blender MCP Python 辅助函数
├── docs/                    # 文档
│   ├── setup-cc-ds.md
│   ├── lessons-learned.md   #   实战经验教训
│   └── photo-to-3d-workflow.md
└── .gitignore
```

## 环境要求 / Requirements

- **Claude Code** (npm 全局安装)
- **DeepSeek API Key** 或 Anthropic API Key
- **Python 3.11+**（仿真/CAD 相关 skill）
- **Node.js**（PPT 相关 skill）
- **COMSOL 6.3+**（仿真相关，可选）

## 使用方式 / Usage

每个 skill 目录下都有 `SKILL.md`，把它安装到 Claude Code 的 skills 目录后即可通过自然语言调用。

具体安装和配置见 [`docs/setup-cc-ds.md`](docs/setup-cc-ds.md)。

## 实例速览 / Examples at a Glance

| 案例 | 用到的技能 | 做了什么 |
|------|-----------|---------|
| CUPT 同心圆环声聚焦 | COMSOL MCP | 参数化扫描 + 声场仿真 |
| 精馏塔课程设计 | CAD + Team | 计算→筛板塔图纸生成→多轮审查 |
| 食品安全主题班会 | PPTX | 内容→结构化PPT生成 |
| 环形喷泉答辩 | PPTX + Office Scripts | Word→PPT批量转换+排版 |
| 转动惯量数据分析 | Python 拟合 | 16组实验数据最小二乘拟合 |
| 超声波探伤装置 3D 重建 | Photo-to-3D + Blender MCP | 7 张实拍 + 5 张线稿 → 67 部件 3D 模型 |

## License

MIT © 2026 阎士淇
