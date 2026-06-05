# Office Scripts — 办公文档批量处理工具

> DOCX/PPTX 批量处理的 JS/Python 脚本集合，由 Claude Code 生成。

## 脚本列表

| 脚本 | 用途 |
|------|------|
| `merge_docx*.js` | 合并多个 Word 文档 |
| `compare_docs.js` | 对比两个 DOCX 的差异 |
| `extract_heads.js` | 提取 Word 标题结构 |
| `build_final*.js` | 从 DOCX 生成 PPT |
| `fix_final*.js` | 修复 PPT 格式问题 |
| `fix_pagenums.py` | 修复幻灯片页码 |
| `insert_param_slide.py` | 向 PPT 插入参数表格页 |
| `check_attrs.py` / `verify_insert.py` | 验证 PPT 内容正确性 |
| `temp_defense_ppt.js` | 答辩 PPT 生成脚本 |
| `fit_analysis.py` | 实验数据最小二乘拟合 |

## 使用方式

每个脚本顶部有注释说明输入输出。直接 `node xxx.js` 或 `python xxx.py` 运行。

## 注意事项

- 这些脚本是特定场景下生成的，复用时需要修改文件路径和参数
- Node.js 脚本需要 `npm install pptxgenjs adm-zip` 等依赖
- Python 脚本需要 `pip install python-pptx numpy`
