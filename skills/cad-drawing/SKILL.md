# CAD 工程制图技能 / CAD Engineering Drawing

> 基于 ezdxf 生成化工设备、精馏塔、筛板等工程 CAD 图纸。

## 功能 / Capabilities

- 精馏塔总装图生成
- 筛板/塔板零件图
- 自动标注与尺寸线
- 符合工程制图规范的线型、字体、图层
- DXF 输出，兼容 AutoCAD 及各 CAD 软件

## 前置条件 / Prerequisites

```bash
pip install ezdxf numpy
```

## 使用示例 / Usage

```
帮我生成一张精馏塔的装配图，塔径 800mm，15 块塔板
检查这张 DXF 的字体和线型是否符合国标
```

## 核心规则 / Core Rules（来自实战教训）

1. **比例先定** — 开工前算好图纸比例，不要写完了发现文字太小
2. **验证同步** — 生成脚本和验证脚本一起写
3. **量化检查** — 不说"效果不好"，说"框外实体 3 个 / 文字高度 2.8mm"
4. **参考先行** — 有真实图纸参考，不要凭感觉画

## 实例 / Examples

| 案例 | 说明 |
|------|------|
| [精馏塔课程设计](examples/distillation-column/) | 化工原理课程设计——筛板精馏塔 |

## 经验教训 / Lessons Learned

详见 [`docs/lessons-learned.md`](../../docs/lessons-learned.md)
