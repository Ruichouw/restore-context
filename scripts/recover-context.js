#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8").trim();
}

function latestHandoff(handoffDir) {
  if (!fs.existsSync(handoffDir)) {
    return "";
  }

  const files = fs
    .readdirSync(handoffDir)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort();

  if (!files.length) {
    return "";
  }

  return path.join(handoffDir, files[files.length - 1]);
}

function main() {
  const projectDir = path.resolve(process.argv[2] || process.cwd());
  const aiDir = path.join(projectDir, ".ai");
  const projectFile = path.join(aiDir, "project.md");
  const currentFile = path.join(aiDir, "current.md");
  const decisionsFile = path.join(aiDir, "decisions.md");
  const contextFile = path.join(aiDir, "context.json");
  const handoffFile = latestHandoff(path.join(aiDir, "handoff"));

  console.log("# Restore Bundle");
  console.log("");
  console.log(`Project Root: ${projectDir}`);
  console.log("");

  const sections = [
    ["project.md", projectFile],
    ["current.md", currentFile],
    ["decisions.md", decisionsFile],
    ["context.json", contextFile],
    ["latest handoff", handoffFile],
  ];

  for (const [label, filePath] of sections) {
    if (!filePath || !fs.existsSync(filePath)) {
      continue;
    }
    console.log(`## ${label}`);
    console.log("");
    console.log(readText(filePath));
    console.log("");
  }

  console.log("## Recommended Prompt");
  console.log("");
  console.log(
    "Read the files above, summarize the current goal, recent changes, open issues, and next steps, then continue the project from that state."
  );
}

main();
