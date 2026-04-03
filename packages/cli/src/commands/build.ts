import { execSync } from "node:child_process";

export async function build() {
  console.log("Building @tsproxy/api for production...");
  try {
    execSync("npx tsup node_modules/@tsproxy/api/src/index.ts node_modules/@tsproxy/api/src/server.ts node_modules/@tsproxy/api/src/cli.ts --format esm --outDir dist", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("Build complete. Start with: tsproxy start");
  } catch {
    console.error("Build failed.");
    process.exit(1);
  }
}
