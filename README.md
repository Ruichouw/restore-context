# restoreContext

Reusable project memory pack for multi-agent handoff and context recovery.

## Share With Friends

If you publish this folder to GitHub, your friends can use it in 3 steps:

```bash
git clone https://github.com/<your-org-or-name>/restore-context.git
cd restore-context
npm i -g .
restore-context-install-skill
```

Then in any project directory:

```bash
restore-context-init . --project-name my-project
```

## Contents

- `template/.ai/`: baseline project memory files copied into each new project
- `scripts/install-restore-context.js`: install the `.ai` skeleton into a target project
- `scripts/sync-context.js`: update `.ai/current.md`, `.ai/context.json`, and a handoff snapshot
- `scripts/recover-context.js`: read the current project memory and print a recovery bundle
- `scripts/scan-project-md.js`: scan a legacy project and bootstrap `.ai/project.md` when it is missing or still template-like
- `scripts/install-skill.js`: install the bundled `restore-context` skill into `~/.codex/skills`
- `skill/restore-context/`: lightweight Codex skill for consistent agent behavior

## Quick Start

```bash
restore-context-init /path/to/your-project --project-name your-project
restore-context-sync /path/to/your-project --goal "Ship auth refresh fix" --summary "Implemented single-flight token refresh"
restore-context-recover /path/to/your-project
```

## Global CLI (No Local Folder Required)

Install once:

```bash
npm i -g git+https://github.com/<your-org-or-name>/restore-context.git
restore-context-install-skill
```

Then in any project directory:

```bash
restore-context-init . --project-name your-project
restore-context-sync . --goal "Current goal" --summary "What changed this round"
restore-context-recover .
```

For legacy repositories:

```bash
restore-context-scan-project .
```

## Suggested Flow

1. Run `install-restore-context.js` once for each new project.
2. After each work round, tell the agent `补充上下文` (or `更新上下文` / `生成交接`) so the `restore-context` skill updates `.ai/*`.
3. Ask any new agent to read `.ai/project.md`, `.ai/current.md`, `.ai/decisions.md`, and the latest handoff file.
4. Optionally install the bundled skill into your Codex skills directory.

## Manual Agent Trigger (Recommended)

The primary workflow is agent-driven, not hook-driven.

Use short commands like:

- `补充上下文`
- `更新上下文`
- `记录本轮进展`
- `生成交接`

When triggered, the agent should apply the `restore-context` skill and update:

- `.ai/project.md` only when it is missing or still template-like
- `.ai/current.md`
- `.ai/decisions.md` (when decisions changed)
- `.ai/context.json`
- `.ai/handoff/<timestamp>.md`
