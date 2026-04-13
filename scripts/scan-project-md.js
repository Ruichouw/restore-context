#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

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

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return "";
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pickFirstExisting(rootDir, candidates) {
  for (const candidate of candidates) {
    const fullPath = path.join(rootDir, candidate);
    if (exists(fullPath)) {
      return candidate;
    }
  }
  return "";
}

function toBulletList(items, fallback) {
  if (!items.length) {
    return `- ${fallback}`;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function readPackageJson(rootDir) {
  const packagePath = path.join(rootDir, "package.json");
  if (!exists(packagePath)) {
    return null;
  }
  try {
    return JSON.parse(readText(packagePath));
  } catch (error) {
    return null;
  }
}

function detectPackageManager(rootDir) {
  if (exists(path.join(rootDir, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (exists(path.join(rootDir, "yarn.lock"))) {
    return "yarn";
  }
  if (exists(path.join(rootDir, "bun.lockb")) || exists(path.join(rootDir, "bun.lock"))) {
    return "bun";
  }
  if (exists(path.join(rootDir, "package-lock.json"))) {
    return "npm";
  }
  if (exists(path.join(rootDir, "uv.lock"))) {
    return "uv";
  }
  if (exists(path.join(rootDir, "poetry.lock"))) {
    return "poetry";
  }
  if (exists(path.join(rootDir, "requirements.txt")) || exists(path.join(rootDir, "pyproject.toml"))) {
    return "pip";
  }
  if (exists(path.join(rootDir, "Cargo.toml"))) {
    return "cargo";
  }
  if (exists(path.join(rootDir, "go.mod"))) {
    return "go";
  }
  if (exists(path.join(rootDir, "pom.xml"))) {
    return "maven";
  }
  if (exists(path.join(rootDir, "build.gradle")) || exists(path.join(rootDir, "build.gradle.kts"))) {
    return "gradle";
  }
  return "unknown";
}

function detectLanguages(rootDir, pkg) {
  const result = [];
  if (pkg) {
    if (exists(path.join(rootDir, "tsconfig.json"))) {
      result.push("TypeScript");
    } else {
      result.push("JavaScript");
    }
  }
  if (exists(path.join(rootDir, "pyproject.toml")) || exists(path.join(rootDir, "requirements.txt"))) {
    result.push("Python");
  }
  if (exists(path.join(rootDir, "go.mod"))) {
    result.push("Go");
  }
  if (exists(path.join(rootDir, "Cargo.toml"))) {
    result.push("Rust");
  }
  if (exists(path.join(rootDir, "pom.xml")) || exists(path.join(rootDir, "build.gradle")) || exists(path.join(rootDir, "build.gradle.kts"))) {
    result.push("Java/Kotlin");
  }
  return [...new Set(result)];
}

function detectFrameworks(rootDir, pkg) {
  const frameworks = [];
  const deps = {
    ...(pkg && pkg.dependencies ? pkg.dependencies : {}),
    ...(pkg && pkg.devDependencies ? pkg.devDependencies : {}),
  };
  const depNames = new Set(Object.keys(deps));

  const jsFrameworkMap = [
    ["next", "Next.js"],
    ["react", "React"],
    ["vue", "Vue"],
    ["nuxt", "Nuxt"],
    ["svelte", "Svelte"],
    ["@angular/core", "Angular"],
    ["nestjs", "NestJS"],
    ["express", "Express"],
    ["koa", "Koa"],
    ["fastify", "Fastify"],
    ["vite", "Vite"],
  ];
  for (const [key, label] of jsFrameworkMap) {
    if (depNames.has(key)) {
      frameworks.push(label);
    }
  }

  const pyText = `${readText(path.join(rootDir, "requirements.txt"))}\n${readText(
    path.join(rootDir, "pyproject.toml")
  )}`.toLowerCase();
  if (pyText.includes("fastapi")) {
    frameworks.push("FastAPI");
  }
  if (pyText.includes("django")) {
    frameworks.push("Django");
  }
  if (pyText.includes("flask")) {
    frameworks.push("Flask");
  }

  return [...new Set(frameworks)];
}

function detectGoal(rootDir) {
  const readmePath = pickFirstExisting(rootDir, ["README.md", "readme.md", "Readme.md"]);
  if (!readmePath) {
    return "Define and deliver the main product goal for this repository.";
  }

  const readme = readText(path.join(rootDir, readmePath));
  const headingMatch = readme.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1]) {
    return `Build and maintain ${headingMatch[1].trim()}.`;
  }

  const firstLine = readme
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 20);
  if (firstLine) {
    return firstLine;
  }

  return "Define and deliver the main product goal for this repository.";
}

function detectCommands(rootDir, pkgManager, pkg) {
  const commands = [];

  if (pkg) {
    const scripts = pkg.scripts || {};
    const runPrefix = pkgManager === "pnpm" ? "pnpm" : pkgManager === "yarn" ? "yarn" : pkgManager === "bun" ? "bun run" : "npm run";
    const installCmd =
      pkgManager === "pnpm"
        ? "pnpm install"
        : pkgManager === "yarn"
        ? "yarn"
        : pkgManager === "bun"
        ? "bun install"
        : "npm install";
    commands.push(`Install: ${installCmd}`);

    if (scripts.dev) {
      commands.push(`Dev: ${runPrefix} dev`);
    }
    if (scripts.test) {
      commands.push(`Test: ${runPrefix} test`);
    }
    if (scripts.lint) {
      commands.push(`Lint: ${runPrefix} lint`);
    }
    if (scripts.build) {
      commands.push(`Build: ${runPrefix} build`);
    }
  } else if (pkgManager === "uv") {
    commands.push("Install: uv sync");
    commands.push("Test: uv run pytest");
  } else if (pkgManager === "pip") {
    commands.push("Install: pip install -r requirements.txt");
    commands.push("Test: pytest");
  } else if (pkgManager === "cargo") {
    commands.push("Dev: cargo run");
    commands.push("Test: cargo test");
    commands.push("Build: cargo build");
  } else if (pkgManager === "go") {
    commands.push("Dev: go run .");
    commands.push("Test: go test ./...");
    commands.push("Build: go build ./...");
  } else if (pkgManager === "maven") {
    commands.push("Test: mvn test");
    commands.push("Build: mvn package");
  } else if (pkgManager === "gradle") {
    commands.push("Test: ./gradlew test");
    commands.push("Build: ./gradlew build");
  }

  return commands;
}

function detectRepoShape(rootDir) {
  const entryCandidates = [
    "src/main.ts",
    "src/main.js",
    "src/index.ts",
    "src/index.js",
    "src/app.ts",
    "src/app.js",
    "main.py",
    "app.py",
    "main.go",
    "cmd/main.go",
    "src/main.rs",
  ];
  const moduleCandidates = ["src", "app", "server", "client", "backend", "frontend", "packages", "services", "libs"];
  const testCandidates = ["tests", "test", "__tests__", "spec"];
  const deployCandidates = ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "k8s", ".github/workflows"];

  const entries = entryCandidates.filter((item) => exists(path.join(rootDir, item))).slice(0, 6);
  const modules = moduleCandidates.filter((item) => exists(path.join(rootDir, item)));
  const tests = testCandidates.filter((item) => exists(path.join(rootDir, item)));
  const deploy = deployCandidates.filter((item) => exists(path.join(rootDir, item)));

  return { entries, modules, tests, deploy };
}

function shouldRewrite(filePath, force) {
  if (force || !exists(filePath)) {
    return true;
  }
  const content = readText(filePath);
  const templateMarkers = [
    "Describe the long-term product or delivery goal here.",
    "Record durable technical decisions in `decisions.md`.",
    "Treat chat history as temporary and `.ai/` as the durable source of truth.",
  ];
  return templateMarkers.some((marker) => content.includes(marker));
}

function buildProjectMd(data) {
  return `# Project Overview

## Project Name
${data.projectName}

## Goal
${data.goal}

## Tech Stack
- Runtime: ${data.runtime || "Unknown"}
- Framework: ${data.framework || "Unknown"}
- Language: ${data.language || "Unknown"}
- Package Manager: ${data.packageManager || "Unknown"}

## Repo Shape
- Entry points:
${toBulletList(data.repo.entries, "No clear entry point detected yet.")}
- Core modules:
${toBulletList(data.repo.modules, "No core modules detected yet.")}
- Tests:
${toBulletList(data.repo.tests, "No test folder detected yet.")}
- Deployment:
${toBulletList(data.repo.deploy, "No deployment config detected yet.")}

## Working Agreements
- Record durable technical decisions in \`decisions.md\`.
- Keep \`current.md\` short and focused on active work.
- Create a handoff snapshot after meaningful progress.
- Treat chat history as temporary and \`.ai/\` as the durable source of truth.

## Useful Commands
${toBulletList(data.commands, "Add install/dev/test/lint/build commands for this project.")}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = path.resolve(args._[0] || process.cwd());
  const force = Boolean(args.force);

  const aiDir = path.join(projectDir, ".ai");
  const projectMdPath = path.join(aiDir, "project.md");
  ensureDir(aiDir);

  if (!shouldRewrite(projectMdPath, force)) {
    console.log(`Skipped ${projectMdPath} because it already looks customized. Use --force to overwrite.`);
    return;
  }

  const pkg = readPackageJson(projectDir);
  const packageManager = detectPackageManager(projectDir);
  const languages = detectLanguages(projectDir, pkg);
  const frameworks = detectFrameworks(projectDir, pkg);
  const runtime = pkg ? "Node.js" : languages.includes("Python") ? "Python" : languages.includes("Go") ? "Go" : languages.includes("Rust") ? "Rust" : "Unknown";
  const commands = detectCommands(projectDir, packageManager, pkg);
  const repo = detectRepoShape(projectDir);

  const markdown = buildProjectMd({
    projectName: path.basename(projectDir),
    goal: detectGoal(projectDir),
    runtime,
    framework: frameworks.length ? frameworks.join(", ") : "Unknown",
    language: languages.length ? languages.join(", ") : "Unknown",
    packageManager,
    repo,
    commands,
  });

  fs.writeFileSync(projectMdPath, markdown, "utf8");
  console.log(`Generated ${projectMdPath}`);
}

main();
