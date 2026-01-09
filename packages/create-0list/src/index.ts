#!/usr/bin/env node
import * as p from "@clack/prompts";
import pc from "picocolors";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "fs";
import path from "path";

const REPO = "d4mr/0list";

const logo = `
  ${pc.yellow("█▀█")} ${pc.white("█")}   ${pc.white("█")} ${pc.white("█▀▀")} ${pc.white("▀█▀")}
  ${pc.yellow("█▄█")} ${pc.white("█▄▄")} ${pc.white("█")} ${pc.white("▄▄█")}  ${pc.white("█")}
`;

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.includes("bun")) return "bun";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  return "npm";
}

function getPackageManagerCommand(pm: PackageManager) {
  const commands = {
    npm: { install: "npm install", exec: "npx" },
    yarn: { install: "yarn", exec: "npx" },
    pnpm: { install: "pnpm install", exec: "pnpm exec" },
    bun: { install: "bun install", exec: "bunx" },
  };
  return commands[pm];
}

function runCommand(
  command: string,
  cwd?: string
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    try {
      const output = execSync(command, {
        cwd,
        stdio: "pipe",
        encoding: "utf-8",
      });
      resolve({ success: true, output: output || "" });
    } catch (error: any) {
      resolve({
        success: false,
        output: error.stderr || error.stdout || error.message,
      });
    }
  });
}

function checkWranglerAuth(): boolean {
  try {
    execSync("npx wrangler whoami", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.clear();
  console.log(logo);
  console.log(
    pc.dim("  Self-hosted waitlist software for Cloudflare Workers\n")
  );

  p.intro(pc.bgYellow(pc.black(" create-0list ")));

  const detectedPm = detectPackageManager();

  const project = await p.group(
    {
      name: () =>
        p.text({
          message: "What's your project called?",
          placeholder: "my-waitlist",
          validate: (value) => {
            if (!value) return "Please enter a project name";
            if (!/^[a-z0-9-_]+$/i.test(value))
              return "Project name can only contain letters, numbers, hyphens, and underscores";
          },
        }),
      directory: ({ results }) =>
        p.text({
          message: "Where should we create it?",
          placeholder: `./${results.name}`,
          initialValue: `./${results.name}`,
        }),
      packageManager: () =>
        p.select({
          message: "Which package manager?",
          initialValue: detectedPm,
          options: [
            { value: "bun", label: "bun", hint: "fastest" },
            { value: "pnpm", label: "pnpm", hint: "efficient" },
            { value: "npm", label: "npm", hint: "standard" },
            { value: "yarn", label: "yarn" },
          ],
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        process.exit(0);
      },
    }
  );

  const targetDir = path.resolve(project.directory as string);
  const pm = project.packageManager as PackageManager;
  const pmCmd = getPackageManagerCommand(pm);

  // Check if directory exists
  if (existsSync(targetDir)) {
    const overwrite = await p.confirm({
      message: `${pc.yellow("!")} Directory already exists. Remove and continue?`,
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    rmSync(targetDir, { recursive: true, force: true });
  }

  // Clone template (with git history so users can pull updates)
  const s = p.spinner();
  s.start("Cloning repository...");

  const cloneResult = await runCommand(
    `git clone --depth 1 https://github.com/${REPO}.git "${targetDir}"`
  );
  if (!cloneResult.success) {
    s.stop(pc.red("Failed to clone repository"));
    p.log.error(cloneResult.output);
    process.exit(1);
  }

  // Unshallow and set up for updates
  await runCommand("git fetch --unshallow", targetDir);
  await runCommand(`git remote rename origin upstream`, targetDir);

  s.stop(pc.green("Repository cloned"));

  // Clean up repo-specific files that aren't needed for user projects
  const repoOnlyPaths = [".github"];
  for (const repoPath of repoOnlyPaths) {
    const fullPath = path.join(targetDir, repoPath);
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }

  // Add .github to .gitignore so it doesn't clutter status after updates
  const gitignorePath = path.join(targetDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    let gitignore = readFileSync(gitignorePath, "utf-8");
    if (!gitignore.includes(".github")) {
      gitignore = "# Repo CI/CD (not needed for your project)\n.github/\n\n" + gitignore;
      writeFileSync(gitignorePath, gitignore);
    }
  }

  // Add post-merge hook to auto-remove .github after git pull
  const hooksDir = path.join(targetDir, ".git", "hooks");
  const postMergeHook = `#!/bin/sh
# Auto-remove upstream CI/CD files after pulling updates
rm -rf .github 2>/dev/null
`;
  writeFileSync(path.join(hooksDir, "post-merge"), postMergeHook, { mode: 0o755 });

  // Install dependencies
  s.start(`Installing dependencies with ${pm}...`);
  const installResult = await runCommand(pmCmd.install, targetDir);
  if (!installResult.success) {
    s.stop(pc.red("Failed to install dependencies"));
    p.log.error(installResult.output);
    process.exit(1);
  }
  s.stop(pc.green("Dependencies installed"));

  // Ask about Cloudflare setup
  const setupCloudflare = await p.confirm({
    message: "Set up Cloudflare D1 database now?",
    initialValue: true,
  });

  if (p.isCancel(setupCloudflare)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  let dbId: string | null = null;

  if (setupCloudflare) {
    // Check wrangler auth
    s.start("Checking Cloudflare authentication...");
    const isAuthed = checkWranglerAuth();

    if (!isAuthed) {
      s.stop(pc.yellow("Not logged into Cloudflare"));

      const login = await p.confirm({
        message: "Log in to Cloudflare now?",
        initialValue: true,
      });

      if (p.isCancel(login)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      if (login) {
        p.log.info("Opening browser for Cloudflare login...");
        try {
          execSync("npx wrangler login", {
            cwd: targetDir,
            stdio: "inherit"
          });
        } catch {
          p.log.warn("Login may have failed. Continuing anyway...");
        }
      }
    } else {
      s.stop(pc.green("Authenticated with Cloudflare"));
    }

    // Create D1 database
    s.start("Creating D1 database...");
    const dbName = `${project.name}-db`;
    const createDbResult = await runCommand(
      `npx wrangler d1 create ${dbName}`,
      targetDir
    );

    if (!createDbResult.success) {
      s.stop(pc.yellow("Could not create database"));
      p.log.warn(
        "You may need to create it manually or the name might be taken."
      );
    } else {
      s.stop(pc.green(`Database "${dbName}" created`));

      // Extract database ID from output
      const match = createDbResult.output.match(/database_id\s*=\s*"([^"]+)"/);
      if (match) {
        dbId = match[1];

        // Update wrangler.toml with the database ID
        s.start("Updating configuration...");
        const wranglerPath = path.join(targetDir, "apps", "api", "wrangler.toml");
        if (existsSync(wranglerPath)) {
          let wranglerContent = readFileSync(wranglerPath, "utf-8");
          wranglerContent = wranglerContent.replace(
            /database_id\s*=\s*"[^"]*"/,
            `database_id = "${dbId}"`
          );
          wranglerContent = wranglerContent.replace(
            /database_name\s*=\s*"[^"]*"/,
            `database_name = "${dbName}"`
          );
          writeFileSync(wranglerPath, wranglerContent);
          s.stop(pc.green("Configuration updated"));
        } else {
          s.stop(pc.yellow("Could not find wrangler.toml"));
        }
      }
    }

    // Run migrations
    if (dbId) {
      s.start("Running database migrations...");
      const migrateResult = await runCommand(
        `${pmCmd.exec} wrangler d1 migrations apply ${project.name}-db --local`,
        targetDir
      );

      if (migrateResult.success) {
        s.stop(pc.green("Migrations applied"));
      } else {
        s.stop(pc.yellow("Could not run migrations"));
        p.log.warn("You can run migrations manually later.");
      }
    }
  }

  // Final summary
  console.log();

  const nextSteps = [
    `cd ${project.directory}`,
    ...(setupCloudflare && dbId
      ? [`${pm === "npm" ? "npm run" : pm} dev`]
      : [
          `${pmCmd.exec} wrangler d1 create ${project.name}-db`,
          "# Update wrangler.toml with database_id",
          `${pm === "npm" ? "npm run" : pm} db:migrate:local`,
          `${pm === "npm" ? "npm run" : pm} dev`,
        ]),
  ];

  p.note(nextSteps.join("\n"), "Next steps");

  p.log.info(
    `${pc.dim("Tip:")} Pull updates anytime with ${pc.cyan("git pull upstream main")}`
  );

  p.outro(
    `${pc.green("Done!")} Visit ${pc.cyan(pc.underline("https://0list.d4mr.com/docs"))} for documentation.`
  );
}

main().catch((err) => {
  p.log.error(err.message);
  process.exit(1);
});
