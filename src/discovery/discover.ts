import type { DiscoveryFs, SlotFile } from "./types";

/** Thrown when a candidate save directory exists but cannot be listed. */
export class PermissionDeniedError extends Error {
  readonly path: string;

  constructor(path: string, cause?: unknown) {
    super(`Permission denied reading save directory: ${path}`);
    this.name = "PermissionDeniedError";
    this.path = path;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

/** Match `SlotData_*.dat` including common case variants of the extension. */
export function isSlotDataFileName(name: string): boolean {
  return /^SlotData_.+\.dat$/i.test(name);
}

export interface DiscoverSlotDataFilesInput {
  roots: string[];
  fs: DiscoveryFs;
  /** Path join; defaults to POSIX-style `/`. */
  join?: (dir: string, name: string) => string;
}

function defaultJoin(dir: string, name: string): string {
  if (dir.endsWith("/") || dir.endsWith("\\")) {
    return `${dir}${name}`;
  }
  const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
  return `${dir}${sep}${name}`;
}

/**
 * Probe candidate directories for SlotData save files.
 * Missing directories contribute nothing; permission failures abort with
 * {@link PermissionDeniedError}.
 */
export async function discoverSlotDataFiles(
  input: DiscoverSlotDataFilesInput,
): Promise<SlotFile[]> {
  const join = input.join ?? defaultJoin;
  const byPath = new Map<string, SlotFile>();

  for (const root of input.roots) {
    const entries = await input.fs.listDir(root);

    if (entries === null) {
      continue;
    }

    for (const entry of entries) {
      if (entry.kind !== "file" || !isSlotDataFileName(entry.name)) {
        continue;
      }
      const path = join(root, entry.name);
      if (!byPath.has(path)) {
        byPath.set(path, { path, mtimeMs: entry.mtimeMs });
      }
    }
  }

  return [...byPath.values()];
}
