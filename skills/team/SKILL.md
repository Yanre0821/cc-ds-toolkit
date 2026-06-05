# 多角色团队协作 / Multi-Agent Team Collaboration

> 启动项目负责人+开发+故障排查+QA 四角色 AI 团队，并行协作完成复杂任务。

## 团队成员 / Team

| 角色 | 职责 | 工具权限 |
|------|------|---------|
| 🏗️ 项目负责人 (project-lead) | 需求分析、任务拆解、方案决策、终审 | 全面 + Agent 调度 |
| 💻 开发工程师 (developer) | 功能实现、算法落地、文档撰写 | 读写代码 + 搜索 |
| 🔧 故障工程师 (debugger) | 报错排查、BUG诊断、环境修复 | 读写代码 + 搜索 |
| 🔍 QA审核 (qa) | 代码审查、测试校验、质量把关 | 只读 + 搜索 |

## 协作流程 / Workflow

```
你的任务 → project-lead 拆解分析
                ↓
    ┌──────────┼──────────┐
    ↓          ↓          ↓
 developer  debugger    (并行)
    ↓          ↓
    └──────────┼──────────┘
               ↓
           QA 审核
               ↓
      project-lead 终审 → 交付
```

## 铁律 / Rules

- **project-lead 不写代码** — 专注决策和调度
- **debugger 有求必应** — 任何报错先丢给 debugger
- **qa 跑完验证才交付** — 量化检查，不说模糊的"好像有点问题"
- **任何人可以喊停** — 发现问题立即上报，不硬撑

## Agent 定义 / Agent Definitions

四个团队成员的角色定义文件在 [`agents/`](agents/) 目录下，可直接导入 Claude Code 使用。

## 实例 / Examples

| 案例 | 说明 |
|------|------|
| [化工原理课程设计](examples/chem-engineering/) | CAD+Team 联动——精馏塔计算→图纸→多轮审查 |

## 经验教训 / Lessons Learned

详见 [`docs/lessons-learned.md`](../../docs/lessons-learned.md) 中的"角色协作铁律"和"常见反模式"。
