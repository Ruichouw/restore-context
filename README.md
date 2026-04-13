# restoreContext

一个可复用的项目上下文模板，用于多 Agent 交接和上下文恢复。

## 使用


```bash
git clone https://github.com/Ruichouw/restore-context.git
npm i -g .
restore-context-install-skill
```

然后在任意项目目录执行：

```bash
restore-context-init . --project-name my-project
```

## 目录说明

- `template/.ai/`：每个新项目都会复制进去的基础上下文文件
- `scripts/install-restore-context.js`：在目标项目中初始化 `.ai` 骨架
- `scripts/sync-context.js`：更新 `.ai/current.md`、`.ai/context.json` 并生成 handoff 快照
- `scripts/recover-context.js`：读取并输出当前项目上下文恢复信息
- `scripts/scan-project-md.js`：扫描老项目，在 `.ai/project.md` 缺失或仍是模板占位时自动补全
- `scripts/install-skill.js`：把 `restore-context` skill 安装到 `~/.codex/skills`
- `skill/restore-context/`：用于约束 Agent 上下文补充行为的轻量 Skill

## 快速开始

```bash
restore-context-init /path/to/your-project --project-name your-project
restore-context-sync /path/to/your-project --goal "Ship auth refresh fix" --summary "Implemented single-flight token refresh"
restore-context-recover /path/to/your-project
```

## 全局 CLI（项目目录无需包含本仓库）

先安装一次：

```bash
npm i -g git+https://github.com/Ruichouw/restore-context.git
restore-context-install-skill
```

之后在任意项目目录执行：

```bash
restore-context-init . --project-name your-project
restore-context-sync . --goal "Current goal" --summary "What changed this round"
restore-context-recover .
```

老项目可额外执行：

```bash
restore-context-scan-project .
```

## 推荐流程

1. 每个新项目先执行一次 `restore-context-init`。
2. 每轮工作后对 Agent 说 `补充上下文`（或 `更新上下文` / `生成交接`），让 `restore-context` skill 更新 `.ai/*`。
3. 新 Agent 接手时，先读取 `.ai/project.md`、`.ai/current.md`、`.ai/decisions.md` 和最新 handoff 文件。
4. 如需自动命中 skill，确保执行过 `restore-context-install-skill`。

## 手动触发（推荐）

主流程是 Agent 驱动，不依赖 hook。

常用口令：

- `补充上下文`
- `更新上下文`
- `记录本轮进展`
- `生成交接`

触发后，Agent 应按 skill 规则更新：

- `.ai/project.md`（仅在缺失或仍是模板占位时自动补全）
- `.ai/current.md`
- `.ai/decisions.md`（有新决策时）
- `.ai/context.json`
- `.ai/handoff/<timestamp>.md`

## 全局CLI命令
- restore-context-init：在目标项目初始化 .ai/ 模板文件（project.md、current.md、decisions.md、tasks.md、context.json、handoff/）。
- restore-context-sync：把本轮状态同步到 .ai/current.md、.ai/context.json，并新增一份 .ai/handoff/<timestamp>.md。
restore-context-recover：读取 .ai 关键文件并输出恢复上下文所需信息，方便新 agent 快速接手。
- restore-context-scan-project：扫描老项目并自动补全 .ai/project.md（仅在缺失或仍是模板占位时生效）。
- restore-context-install-skill：把 restore-context skill 安装到 ~/.codex/skills，让 agent 更容易按这套规则执行“补充上下文/更新上下文”。