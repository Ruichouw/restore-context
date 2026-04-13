---
name: restore-context
description: Maintain durable project memory for multi-agent handoff and context recovery. Use when a project keeps `.ai/` memory files and the user asks to补充上下文, 更新上下文, 同步上下文, 记录本轮进展, 生成交接, handoff, restore context, continue prior work, or resume project state.
---

# Restore Context

Use `.ai/` as the source of durable project memory.

## Trigger

Treat these user requests as direct triggers for this skill:

- 补充上下文
- 更新上下文
- 同步上下文
- 记录本轮进展
- 生成交接
- handoff / restore context / resume state

## Recover

Before substantial work, read these files in order when they exist:

1. `.ai/project.md`
2. `.ai/current.md`
3. `.ai/decisions.md`
4. The latest file in `.ai/handoff/`

Summarize the current goal, recent changes, open issues, and next steps before continuing.

## Update

When the user asks to supplement context, update `.ai/` directly in this order:

1. Legacy project bootstrap:
- if `.ai/project.md` is missing or still template-like, scan the repository and write it first.
- prefer running `node <restoreContext>/scripts/scan-project-md.js <project-root>`.
- if the script is unavailable, inspect key files manually (`README`, `package.json`, lockfiles, `pyproject.toml`, `go.mod`, `Cargo.toml`, repo folders) and fill:
`Goal`, `Tech Stack`, and `Useful Commands`.
2. Read the latest work context from conversation, changed files, and `.ai/` files.
3. Update `.ai/current.md` with current goal, latest progress, open issues, and next steps.
4. Append durable technical choices to `.ai/decisions.md` when a real decision was made.
5. Create a new `.ai/handoff/<timestamp>.md` snapshot for this round.
6. Update `.ai/context.json` to match the latest state and handoff path.

Prefer short, structured notes over long narrative chat history.

## Handoff

When preparing for another agent:

- state the current goal
- list the most relevant changed files
- capture key decisions and unresolved issues
- propose concrete next steps

Treat chat history as temporary context and `.ai/` as the durable handoff surface.
