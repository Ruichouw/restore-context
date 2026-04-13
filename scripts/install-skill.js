#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");

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

function copyDir(srcDir, destDir) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
      continue;
    }
    fs.copyFileSync(srcPath, destPath);
  }
}

function removeDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const codexHome = args["codex-home"] || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const skillName = "restore-context";

  const sourceSkillDir = path.resolve(__dirname, "..", "skill", skillName);
  const targetSkillDir = path.join(codexHome, "skills", skillName);

  if (!fs.existsSync(sourceSkillDir)) {
    console.error(`Skill source not found: ${sourceSkillDir}`);
    process.exit(1);
  }

  removeDirIfExists(targetSkillDir);
  ensureDir(path.dirname(targetSkillDir));
  copyDir(sourceSkillDir, targetSkillDir);

  console.log(`Installed skill '${skillName}' to ${targetSkillDir}`);
}

main();
