# 精馏塔筛板设计 / Distillation Column Tray Design

> 化工原理课程设计 — 筛板精馏塔图纸生成

## 做了什么

- 完成精馏塔工艺计算（物料衡算、塔板数、塔径）
- 用 ezdxf 生成筛板塔装配图和零件图
- 多轮 CAD + Team 协作：dev 出图 → QA 验证 → debugger 修线型 → dev 改 → QA 再验

## 用到的技能

- **CAD Drawing** — DXF 图纸生成
- **Team** — 多角色并行协作

## 流程

```
工艺计算 → dev 写 gen_dxf.py
              ↓
         QA 跑 validate_dxf.py → 发现问题
              ↓
         debugger 定位 → dev 修复
              ↓
         迭代 5 轮 → 合格交付
```

## 输出

- 筛板塔装配图 DXF
- 塔板零件图 DXF
- 验证脚本

## 关键教训

- 比例是第一决策——先算比例再写代码
- 验证脚本和生成脚本同步开发
- 量化检查（实体数、框外检查、文字高度）
