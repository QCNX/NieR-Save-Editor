import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const vitestCli = path.join("node_modules", "vitest", "vitest.mjs");
const vitestArgs = ["run", ...process.argv.slice(2)];

function runVitest(cwd) {
  const result = spawnSync(process.execPath, [vitestCli, ...vitestArgs], {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

const cwd = process.cwd();
const realRoot = fs.realpathSync(cwd);

if (!realRoot.includes("#")) {
  process.exit(runVitest(cwd));
}

if (process.platform !== "win32") {
  console.error(
    'Vitest cannot run from a project path containing "#". Move or mount the repo without that character.',
  );
  process.exit(1);
}

// Vite treats "#" as a URL fragment; on Windows use a subst drive so the
// resolved root has no "#", without hardcoding machine-specific paths.
const driveLetters = "HIJKLMNOPQRSTUVWXYZ".split("");
const freeDrive = driveLetters.find((letter) => !fs.existsSync(`${letter}:\\`));
if (!freeDrive) {
  console.error("No free drive letter available to run Vitest around a '#' path.");
  process.exit(1);
}

const drive = `${freeDrive}:`;
const parent = path.dirname(realRoot);
const base = path.basename(realRoot);
const subst = spawnSync("subst", [drive, parent], { encoding: "utf8" });
if (subst.status !== 0) {
  console.error(subst.stderr || subst.stdout || "subst failed");
  process.exit(subst.status ?? 1);
}

const aliasedRoot = path.join(`${drive}\\`, base);
let status = 1;
try {
  status = runVitest(aliasedRoot);
} finally {
  spawnSync("subst", [drive, "/d"], { encoding: "utf8" });
}

process.exit(status);
