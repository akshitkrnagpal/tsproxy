import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export async function start(opts: { port?: string; config?: string }) {
  const cliPath = resolve(process.cwd(), "node_modules/@tsproxy/api/dist/cli.js");

  if (!existsSync(cliPath)) {
    console.error("@tsproxy/api not found or not built. Run: npm install @tsproxy/api");
    process.exit(1);
  }

  const args: string[] = ["start"];
  if (opts.port) args.push("--port", opts.port);
  if (opts.config) args.push("--config", opts.config);

  try {
    execSync(`node ${cliPath} ${args.join(" ")}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch {
    process.exit(1);
  }
}
