import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

export async function dev(opts: { port?: string; config?: string }) {
  const args: string[] = ["dev"];
  if (opts.port) args.push("--port", opts.port);
  if (opts.config) args.push("--config", opts.config);

  const hasTsx = existsSync(resolve(process.cwd(), "node_modules/.bin/tsx"));
  const cliPath = findCliEntry();

  if (!cliPath) {
    console.error("@tsproxy/api not found. Run: npm install @tsproxy/api");
    process.exit(1);
  }

  const cmd = hasTsx
    ? `npx tsx watch ${cliPath} ${args.join(" ")}`
    : `node ${cliPath} ${args.join(" ")}`;

  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
  } catch {
    process.exit(1);
  }
}

function findCliEntry(): string | null {
  const paths = [
    resolve(process.cwd(), "node_modules/@tsproxy/api/dist/cli.js"),
    resolve(process.cwd(), "node_modules/@tsproxy/api/src/cli.ts"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}
