# PPTX 生成技能 / Presentation Generation

> 从论文、文档、文字内容自动生成结构化学术/答辩 PPT。

## 功能 / Capabilities

- 从 PDF/Markdown/DOCX 提取内容生成 PPT
- 学术汇报 / 文献汇报 / 组会 / 答辩多种场景
- 自动排版、字体层级、图文混排
- 支持模板和自定义样式
- 批量 PPT 合并、拆分、编辑

## 前置条件 / Prerequisites

```bash
pip install markitdown python-pptx
```

## 使用示例 / Usage

```
把我这篇论文做成 10 页的组会汇报 PPT
帮我把这个 Word 里的内容排成答辩 PPT
给这个 PPT 加页码和目录页
```

## 核心规则 / Core Rules

- 所有内容必须源自上传文件，不虚构数据
- 对冗长段落做学术性精简，但保留关键数值
- 字号：正文 ≥24pt，标注 ≥18pt
- 图文并茂，单页文字不超过 7 行

## 实例 / Examples

| 案例 | 说明 |
|------|------|
| [食品安全主题班会](examples/food-safety-meeting/) | 科普内容 → 班会演示文稿 |
| [答辩 PPT](examples/thesis-defense/) | 毕业论文答辩演示文稿 |
| [CUPT 环形喷泉](examples/cupt-ring-fountain/) | 物理竞赛答辩 PPT |
