# Claude Code + DeepSeek 配置指南 / Setup Guide

> 如何用 DeepSeek 作为后端驱动 Claude Code，性价比拉满。

---

## 为什么这样配 / Why This Setup

- Claude Code (CC) 是目前最强的 AI 编程助手
- DeepSeek (DS) 提供兼容 Anthropic API 的端点，价格远低于官方
- 两者组合 = 旗舰体验 + 学生预算

| 方案 | 月费估算 |
|------|:---:|
| Claude Max 订阅 | $200 |
| CC + DeepSeek API | ~¥30-80 |

---

## 配置步骤 / Setup

### 1. 安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. 获取 DeepSeek API Key

1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册并充值（建议先充 ¥50 试水）
3. API Keys → 创建新 Key

### 3. 配置环境变量 / Configure

编辑 `~/.claude/settings.json`（用户级）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-你的DeepSeek密钥",
    "ANTHROPIC_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro"
  }
}
```

> ⚠️ **settings.json 包含 API Key，务必加入 .gitignore，不要上传到 GitHub！**

### 4. 验证

```bash
claude --version
claude "hello, test"
```

---

## 多端点切换 / Multi-Endpoint Switching

如果你同时有 Anthropic 官方 Key 和 DeepSeek Key，可以使用 **CC-Switch**（本仓库自带）在不同配置间一键切换。

详见 `docs/cc-switch-guide.md`。

---

## 已知限制 / Known Limitations

| 功能 | DeepSeek 兼容 | 说明 |
|------|:---:|------|
| 基本对话与代码 | ✅ | 完全正常 |
| Tool Use | ✅ | 正常 |
| Agent/子代理 | ✅ | 正常 |
| Skills/Slash Commands | ✅ | 正常 |
| Extended Thinking | ⚠️ | 部分兼容 |
| Prompt Caching | ❌ | DS 不支持，但不影响使用 |
| MCP 工具 | ✅ | 正常 |

---

*最后更新: 2026-06*
