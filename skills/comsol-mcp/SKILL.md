# COMSOL MCP 仿真技能 / COMSOL Simulation via MCP

> 通过 MCP (Model Context Protocol) 连接 COMSOL Desktop GUI，用自然语言操控仿真全流程。

## 功能 / Capabilities

- 查找并连接运行中的 COMSOL 实例
- 通过 Java Shell 执行 COMSOL API 命令
- 全局参数设置与读取
- 几何建模、物理场设置、网格划分
- Study 求解与结果后处理
- 图形窗口截图

## 前置条件 / Prerequisites

- COMSOL Multiphysics 6.3+（需要 Desktop GUI 版本，非 Server 版）
- COMSOL 中启用 Java Shell（File → Preferences → Security → Java Shell → Enable）
- Claude Code 连接 `comsol-mcp` MCP Server

## 安装 / Installation

在 Claude Code 的 MCP 配置中添加 `comsol-mcp` server（需要先启动 COMSOL Desktop）。

## 使用示例 / Usage

```
帮我打开 COMSOL 里的同心圆环模型
把 gap 参数改为 0.2[mm]，跑一下 std1 study
读取 es.normE 的结果
给我截一下当前的几何图
```

## 实例 / Examples

| 案例 | 说明 |
|------|------|
| [声聚焦实验竞赛](examples/acoustic-focusing/) | CUPT 同心圆环结构声场聚焦仿真 |

## 注意事项 / Notes

- Java Shell 必须在 COMSOL GUI 中手动开启
- 不带 `.mph` 文件——模型文件过大，仅保留参数记录
- 推荐先用 `vibe-simulation` 工具做环境检查
