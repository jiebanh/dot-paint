import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const webDist = path.resolve(__dirname, "../web/dist");
const webviewOut = path.resolve(__dirname, "dist/webview");

const watch = process.argv.includes("--watch");

function buildWebview() {
  execSync("pnpm --filter @dot-paint/web run build", { stdio: "inherit", cwd: repoRoot });
  rmSync(webviewOut, { recursive: true, force: true });
  mkdirSync(webviewOut, { recursive: true });
  cpSync(webDist, webviewOut, { recursive: true });
}

buildWebview();

const options = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("watching for changes... (run this script again to pick up packages/web changes)");
} else {
  await build(options);
}
