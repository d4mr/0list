import * as p from "@clack/prompts";
import pc from "picocolors";
import { exec, execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

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

async function runCommand(
  command: string,
  cwd?: string
): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { success: true, output: stdout || stderr || "" };
  } catch (error: any) {
    return {
      success: false,
      output: error.stderr || error.stdout || error.message,
    };
  }
}

async function checkWranglerAuth(): Promise<boolean> {
  const result = await runCommand("npx wrangler whoami");
  return result.success;
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
  const dbName = `${project.name}-db`;

  if (setupCloudflare) {
    p.log.step(pc.dim("Setting up Cloudflare..."));

    // Check wrangler auth
    s.start("Checking Cloudflare authentication...");
    const isAuthed = await checkWranglerAuth();
    s.stop();

    if (!isAuthed) {
      p.log.warn("Not logged into Cloudflare");

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
          p.log.success("Logged in to Cloudflare");
        } catch {
          p.log.warn("Login may have failed. Continuing anyway...");
        }
      }
    } else {
      p.log.success("Authenticated with Cloudflare");
    }

    // Create D1 database
    s.start(`Creating D1 database "${dbName}"...`);
    const createDbResult = await runCommand(
      `npx wrangler d1 create ${dbName}`,
      targetDir
    );
    s.stop();

    if (!createDbResult.success) {
      p.log.warn(`Could not create database "${dbName}"`);
      p.log.message(pc.dim("You may need to create it manually or the name might be taken."));
    } else {
      p.log.success(`Database "${dbName}" created`);

      // Extract database ID from output (handles both JSON and TOML formats)
      const match = createDbResult.output.match(/"?database_id"?\s*[:=]\s*"([^"]+)"/);
      if (match) {
        dbId = match[1];
        p.log.message(pc.dim(`  ID: ${dbId}`));

        // Update wrangler.toml with the database ID
        s.start("Updating wrangler.toml...");
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
          s.stop();
          p.log.success("Configuration updated");
        } else {
          s.stop();
          p.log.warn("Could not find wrangler.toml");
        }
      }
    }

    // Run migrations
    if (dbId) {
      s.start("Running database migrations (local)...");
      const migrateResult = await runCommand(
        `${pmCmd.exec} wrangler d1 migrations apply ${dbName} --local`,
        targetDir
      );
      s.stop();

      if (migrateResult.success) {
        p.log.success("Local migrations applied");
      } else {
        p.log.warn("Could not run migrations");
        p.log.message(pc.dim("You can run migrations manually later."));
      }
    }
  }

  // Final summary
  console.log();

  const runCmd = pm === "npm" ? "npm run" : pm;

  if (setupCloudflare && dbId) {
    p.log.success("D1 database configured in wrangler.toml");
    
    const nextSteps = [
      `cd ${project.directory}`,
      `${runCmd} dev`,
    ];
    p.note(nextSteps.join("\n"), "Start developing");

    const deploySteps = [
      `${runCmd} db:migrate        ${pc.dim("# Apply schema to remote D1")}`,
      `${runCmd} deploy            ${pc.dim("# Deploy to Cloudflare Workers")}`,
    ];
    p.note(deploySteps.join("\n"), "Deploy to production");
  } else {
    const nextSteps = [
      `cd ${project.directory}`,
      `${pmCmd.exec} wrangler d1 create ${dbName}`,
      `${pc.dim("# Copy database_id to apps/api/wrangler.toml")}`,
      `${runCmd} db:migrate:local`,
      `${runCmd} dev`,
    ];
    p.note(nextSteps.join("\n"), "Next steps");
  }

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
