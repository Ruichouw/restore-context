#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function runGit(projectDir, command) {
  try {
    return cp
      .execSync(command, {
        cwd: projectDir,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      })
      .trim();
  } catch (error) {
    return "";
  }
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(items) {
  const cleaned = items
    .flatMap((item) => String(item || "").split("|"))
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
}

function formatBullets(items, emptyText) {
  if (!items.length) {
    return `- ${emptyText}`;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function collectGitSnapshot(projectDir, eventName, manualFiles) {
  const branch = runGit(projectDir, "git branch --show-current");
  const stagedFiles = splitLines(runGit(projectDir, "git diff --cached --name-only"));
  const workingFiles = splitLines(runGit(projectDir, "git diff --name-only"));
  const headFiles = splitLines(
    runGit(projectDir, "git diff-tree --no-commit-id --name-only -r HEAD")
  );
  const lastCommit = runGit(projectDir, "git rev-parse --short HEAD");
  const lastCommitMessage = runGit(projectDir, "git log -1 --pretty=%s");

  let preferredFiles = [];
  if (eventName === "pre-commit") {
    preferredFiles = stagedFiles.length ? stagedFiles : workingFiles;
  } else if (eventName === "post-commit" || eventName === "pre-push") {
    preferredFiles = headFiles.length ? headFiles : stagedFiles;
  } else {
    preferredFiles = [...stagedFiles, ...workingFiles];
  }

  const changedFiles = uniqueList([
    preferredFiles.join("|"),
    manualFiles || "",
  ]);

  return {
    activeBranch: branch,
    changedFiles,
    lastCommit,
    lastCommitMessage,
  };
}

function buildAutoSummary(eventName, snapshot, existingSummary) {
  if (existingSummary) {
    return existingSummary;
  }

  const changedCount = snapshot.changedFiles.length;
  if (eventName === "pre-commit") {
    if (changedCount) {
      return `Auto-synced before commit for ${changedCount} staged file(s).`;
    }
    return "Auto-synced before commit.";
  }

  if (eventName === "post-commit") {
    if (snapshot.lastCommitMessage) {
      return `Auto-synced after commit ${snapshot.lastCommit}: ${snapshot.lastCommitMessage}`;
    }
    return "Auto-synced after commit.";
  }

  if (eventName === "pre-push") {
    if (snapshot.lastCommitMessage) {
      return `Push checkpoint after commit ${snapshot.lastCommit}: ${snapshot.lastCommitMessage}`;
    }
    return "Recorded a push checkpoint.";
  }

  if (changedCount) {
    return `Recorded context for ${changedCount} changed file(s).`;
  }

  return "Recorded a project context checkpoint.";
}

function buildCurrentMd(context) {
  return `# Current Status

Updated: ${context.last_updated || "unknown"}

## Current Goal
${context.current_goal || "Not set"}

## Active Branch
${context.active_branch || "Unknown"}

## Last Trigger
${context.last_event || "manual"}

## Last Commit
${context.last_commit || "Unknown"}

## What Changed Recently
${formatBullets(context.changed_files, "No file changes recorded.")}

## Open Issues
${formatBullets(context.open_issues, "None recorded.")}

## Next Steps
${formatBullets(context.next_steps, "No next steps recorded.")}

## Last Summary
${context.last_summary || "No summary recorded."}

## Latest Handoff
${context.handoff_file || "None"}
`;
}

function buildHandoffMd(context) {
  return `# Handoff Snapshot

## Current Goal
${context.current_goal || "Not set"}

## Trigger
${context.last_event || "manual"}

## Commit
${context.last_commit || "Unknown"}

## What Changed
${formatBullets(context.changed_files, "No file changes recorded.")}

## Key Decisions
${formatBullets(context.recent_decisions, "No new decisions recorded.")}

## Open Issues
${formatBullets(context.open_issues, "None recorded.")}

## Next Steps
${formatBullets(context.next_steps, "No next steps recorded.")}

## Files To Read First
${formatBullets(context.changed_files.slice(0, 10), "No priority files recorded.")}

## Summary
${context.last_summary || "No summary recorded."}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = path.resolve(args._[0] || process.cwd());
  const aiDir = path.join(projectDir, ".ai");
  const handoffDir = path.join(aiDir, "handoff");
  const contextPath = path.join(aiDir, "context.json");
  const currentPath = path.join(aiDir, "current.md");

  ensureDir(aiDir);
  ensureDir(handoffDir);

  const eventName = args.event || "manual";

  const existing = readJson(contextPath, {
    project_name: path.basename(projectDir),
    current_goal: "",
    active_branch: "",
    last_updated: "",
    changed_files: [],
    recent_decisions: [],
    open_issues: [],
    next_steps: [],
    last_summary: "",
    handoff_file: "",
    last_event: "",
    last_commit: "",
  });

  const timestamp = new Date().toISOString();
  const snapshot = collectGitSnapshot(projectDir, eventName, args.files || "");

  const context = {
    ...existing,
    project_name: existing.project_name || path.basename(projectDir),
    current_goal: args.goal || existing.current_goal || "",
    active_branch: snapshot.activeBranch || existing.active_branch || "",
    last_updated: timestamp,
    changed_files:
      snapshot.changedFiles.length ? snapshot.changedFiles : existing.changed_files || [],
    recent_decisions: uniqueList([
      ...(existing.recent_decisions || []),
      args.decision || "",
    ]),
    open_issues: uniqueList([
      ...(existing.open_issues || []),
      args.issue || "",
    ]),
    next_steps: uniqueList([
      args.next || "",
      ...(existing.next_steps || []),
    ]),
    last_summary: buildAutoSummary(eventName, snapshot, args.summary || ""),
    handoff_file: "",
    last_event: eventName,
    last_commit: snapshot.lastCommit || existing.last_commit || "",
  };

  const handoffName = `${timestamp.replace(/[:]/g, "-")}.md`;
  const handoffPath = path.join(handoffDir, handoffName);
  context.handoff_file = path.relative(projectDir, handoffPath).replace(/\\/g, "/");

  fs.writeFileSync(contextPath, `${JSON.stringify(context, null, 2)}\n`, "utf8");
  fs.writeFileSync(currentPath, buildCurrentMd(context), "utf8");
  fs.writeFileSync(handoffPath, buildHandoffMd(context), "utf8");

  console.log(`Synced context in ${aiDir}`);
  console.log(`Current file: ${path.relative(projectDir, currentPath)}`);
  console.log(`Handoff file: ${context.handoff_file}`);
}

main();
