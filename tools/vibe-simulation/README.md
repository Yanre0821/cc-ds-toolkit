# Vibe Simulation

English and Chinese workflow documentation for a local COMSOL + VS Code
assistant workflow.

## 中文说明

### 这是什么

`Vibe Simulation` 是一个面向 COMSOL `.mph` 模型的本地工作流项目。
它把环境检查、模型发现、结构读取、参数修改、求解、表达式评估和
batch 日志抓取整合到一个统一入口里。

目标很简单：

> 把 `.mph` 模型放到这个文件夹里，我就可以继续帮你做检查、排错、
> 批量实验和结果处理。

### 目录结构

```text
Vibe Simulation/
|-- .vscode/
|-- logs/
|-- models/
|-- runs/
|-- tools/
|-- .gitignore
|-- environment.yml
|-- README.md
`-- vibe.py
```

说明：

- `vibe.py` 是主入口
- `tools/` 里保留了更底层的辅助脚本
- `models/`、`runs/`、`logs/` 是建议使用的模型、结果和日志目录
- 仓库默认忽略 `.mph`、日志和运行结果，避免误上传大文件

### 环境要求

- Windows
- COMSOL `6.3`
- Conda 环境名建议为 `comsol`
- Python `3.11`
- Python 包：`MPh`, `JPype1`, `numpy`

可以直接按 `environment.yml` 建环境：

```bash
conda env create -f environment.yml
conda activate comsol
```

### 模型怎么放

推荐两种方式：

1. 直接把 `.mph` 放到项目根目录
2. 放到任意子目录，例如 `models/` 或你自己的项目文件夹

`Vibe Simulation` 会自动扫描工作区，并忽略这些目录：

- `third_party/`
- `.git/`
- `.vscode/`
- `logs/`
- `runs/`
- `outputs/`

如果工作区里只有一个可用模型，很多命令都可以不写 `--model`。
如果有多个模型，就显式传路径。

### 典型工作流

#### 1. 检查环境

```bash
python vibe.py doctor
```

#### 2. 查看当前识别到的模型

```bash
python vibe.py models
```

#### 3. 快速 review 当前默认模型

```bash
python vibe.py review
```

#### 4. 查看更完整的模型结构

```bash
python vibe.py inspect --tree --tree-depth 2
```

#### 5. 修改参数并求解

```bash
python vibe.py solve --study std1 --set p1=3[mm] --set p2=5[V] --save-as runs\\case_01.mph
```

#### 6. 读取结果表达式

如果模型已经保存了解：

```bash
python vibe.py eval es.normE
```

如果模型没有保存解，可以先指定 study：

```bash
python vibe.py eval es.normE --study std1
```

#### 7. 运行 COMSOL batch 并保存日志

```bash
python vibe.py batch --study std1
```

### 以后怎么和我配合

最简单的方式就是把模型放进这个工作区，然后直接告诉我：

- “帮我检查这个模型有没有 problems”
- “列出参数和 study”
- “读取 `mf.normB`”
- “把 `gap=0.2[mm]` 后重新跑 `std1`”
- “用 batch 跑一下并帮我看日志”

如果工作区里只有一个模型，我通常不需要你再额外告诉我路径。
如果有多个模型，你告诉我文件名或相对路径就行。

### VS Code 工作流

项目里已经包含：

- `.vscode/settings.json`
- `.vscode/tasks.json`

你可以直接运行这些任务：

- `Vibe Simulation: Doctor`
- `Vibe Simulation: Models`
- `Vibe Simulation: Review Default Model`
- `Vibe Simulation: Inspect Default Model`
- `Vibe Simulation: Evaluate Expression`
- `Vibe Simulation: Batch Run`

### 上传到 GitHub

这个项目默认更适合把流程代码上传、把 `.mph` 模型保留在本地。
你可以直接用 GitHub 网页上传，或者在你自己的机器上用 git 推送。

网页上传：

1. 在 GitHub 新建一个空仓库
2. 把这个 `Vibe Simulation` 文件夹里的内容拖到网页上传页面
3. 提交即可

本机 git：

```bash
git init
git add .
git commit -m "Initial Vibe Simulation workflow"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## English

### What This Is

`Vibe Simulation` is a local workflow project for COMSOL `.mph` models.
It wraps environment checks, model discovery, inspection, parameter changes,
solving, expression evaluation, and COMSOL batch logging behind a single CLI.

The intended workflow is simple:

> Drop your `.mph` model into this folder, and I can keep helping with
> inspection, debugging, batch experiments, and post-processing.

### Project Layout

```text
Vibe Simulation/
|-- .vscode/
|-- logs/
|-- models/
|-- runs/
|-- tools/
|-- .gitignore
|-- environment.yml
|-- README.md
`-- vibe.py
```

Notes:

- `vibe.py` is the main entry point
- `tools/` contains lower-level helper scripts
- `models/`, `runs/`, and `logs/` are the suggested directories for models,
  outputs, and logs
- `.gitignore` keeps `.mph` files and generated artifacts out of the repo by
  default

### Requirements

- Windows
- COMSOL `6.3`
- Conda environment name recommended: `comsol`
- Python `3.11`
- Python packages: `MPh`, `JPype1`, `numpy`

You can create the environment from `environment.yml`:

```bash
conda env create -f environment.yml
conda activate comsol
```

### Where To Put Models

Recommended options:

1. Put the `.mph` file in the project root
2. Put it in any subfolder such as `models/` or a project-specific directory

`Vibe Simulation` scans the workspace and ignores:

- `third_party/`
- `.git/`
- `.vscode/`
- `logs/`
- `runs/`
- `outputs/`

If exactly one usable model is found, many commands work without `--model`.
If multiple models exist, pass the path explicitly.

### Typical Workflow

Check the environment:

```bash
python vibe.py doctor
```

List discovered models:

```bash
python vibe.py models
```

Review the default model:

```bash
python vibe.py review
```

Inspect the model tree:

```bash
python vibe.py inspect --tree --tree-depth 2
```

Solve with parameter changes:

```bash
python vibe.py solve --study std1 --set p1=3[mm] --set p2=5[V] --save-as runs\\case_01.mph
```

Evaluate an expression on stored results:

```bash
python vibe.py eval es.normE
```

Or solve first if results are not stored:

```bash
python vibe.py eval es.normE --study std1
```

Run COMSOL batch mode and save a readable log:

```bash
python vibe.py batch --study std1
```

### How To Work With Me

After you place a model into this workspace, you can simply ask me to:

- check whether the model has problems
- list parameters and studies
- evaluate `mf.normB`
- set `gap=0.2[mm]` and rerun `std1`
- run batch mode and inspect the log

If there is only one model in the workspace, I usually do not need the path.
If there are multiple models, give me the file name or relative path.

### VS Code Tasks

The project already includes:

- `.vscode/settings.json`
- `.vscode/tasks.json`

Available tasks:

- `Vibe Simulation: Doctor`
- `Vibe Simulation: Models`
- `Vibe Simulation: Review Default Model`
- `Vibe Simulation: Inspect Default Model`
- `Vibe Simulation: Evaluate Expression`
- `Vibe Simulation: Batch Run`

### Uploading To GitHub

This project is designed so the workflow code can go to GitHub while your
`.mph` models stay local.

You can upload in the GitHub web UI, or push from your own machine with git:

```bash
git init
git add .
git commit -m "Initial Vibe Simulation workflow"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
