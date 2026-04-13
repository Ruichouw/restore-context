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

function writeFileIfNeeded(filePath, content, force, results) {
  if (fs.existsSync(filePath) && !force) {
    results.skipped.push(filePath);
    return;
  }

  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
  results.written.push(filePath);
}

function copyTemplate(srcDir, destDir, replacements, force, results) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyTemplate(srcPath, destPath, replacements, force, results);
      continue;
    }

    if (fs.existsSync(destPath) && !force) {
      results.skipped.push(destPath);
      continue;
    }

    const raw = fs.readFileSync(srcPath, "utf8");
    let nextContent = raw;
    for (const [needle, value] of Object.entries(replacements)) {
      nextContent = nextContent.split(needle).join(value);
    }

    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, nextContent, "utf8");
    results.written.push(destPath);
  }
}

function runCommand(command, cwd) {
  try {
    cp.execSync(command, {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return true;
  } catch (error) {
    return false;
  }
}

function runGitCommand(targetDir, args) {
  const result = cp.spawnSync("git", args, {
    cwd: targetDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    shell: false,
  });
  return result.status === 0;
}

function installGitHooks(targetDir, force, results) {
  const gitDir = path.join(targetDir, ".git");
  if (!fs.existsSync(gitDir)) {
    results.notes.push("Skipped git hook installation because the target is not a git repository.");
    return;
  }

  const hooksDir = path.join(targetDir, ".githooks");
  const syncScriptPath = path.resolve(__dirname, "sync-context.js").replace(/\\/g, "/");

  const preCommitHook = `#!/bin/sh
PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$PROJECT_DIR" ]; then
  exit 0
fi

node "${syncScriptPath}" "$PROJECT_DIR" --event pre-commit --from-git
STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  exit "$STATUS"
fi

git -C "$PROJECT_DIR" add .ai/current.md .ai/context.json .ai/handoff >/dev/null 2>&1
exit 0
`;

  const prePushHook = `#!/bin/sh
PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$PROJECT_DIR" ]; then
  exit 0
fi

cd "$PROJECT_DIR" || exit 0

if ! git diff --quiet -- .ai || ! git diff --cached --quiet -- .ai; then
  echo "restoreContext: .ai has local changes."
  echo "Commit the updated context files before push if you want remote handoff to stay current."
fi

exit 0
`;

  writeFileIfNeeded(path.join(hooksDir, "pre-commit"), preCommitHook, force, results);
  writeFileIfNeeded(path.join(hooksDir, "pre-push"), prePushHook, force, results);

  try {
    fs.chmodSync(path.join(hooksDir, "pre-commit"), 0o755);
    fs.chmodSync(path.join(hooksDir, "pre-push"), 0o755);
  } catch (error) {
    results.notes.push("Created hook files but could not update executable mode. This is usually fine on Windows.");
  }

  if (runGitCommand(targetDir, ["-C", targetDir, "config", "core.hooksPath", ".githooks"])) {
    results.notes.push("Configured git to use .githooks via core.hooksPath.");
  } else {
    results.notes.push("Created .githooks, but could not set core.hooksPath automatically.");
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(args._[0] || process.cwd());
  const projectName =
    args["project-name"] || path.basename(targetDir) || "unnamed-project";
  const force = Boolean(args.force);
  const installGitHooksFlag = Boolean(args["install-git-hooks"]);

  const templateDir = path.resolve(__dirname, "..", "template", ".ai");
  const outputDir = path.join(targetDir, ".ai");

  if (!fs.existsSync(templateDir)) {
    console.error(`Template directory not found: ${templateDir}`);
    process.exit(1);
  }

  const results = { written: [], skipped: [], notes: [] };
  copyTemplate(
    templateDir,
    outputDir,
    {
      "{{PROJECT_NAME}}": projectName,
    },
    force,
    results
  );

  if (installGitHooksFlag) {
    installGitHooks(targetDir, force, results);
  }

  console.log(`Installed restoreContext template into ${outputDir}`);
  console.log(`Written: ${results.written.length}`);
  for (const filePath of results.written) {
    console.log(`  + ${path.relative(targetDir, filePath)}`);
  }
  console.log(`Skipped: ${results.skipped.length}`);
  for (const filePath of results.skipped) {
    console.log(`  = ${path.relative(targetDir, filePath)}`);
  }
  if (results.notes.length) {
    console.log("Notes:");
    for (const note of results.notes) {
      console.log(`  - ${note}`);
    }
  }
}

main();
