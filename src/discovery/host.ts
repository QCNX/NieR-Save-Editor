import { candidateSaveDirs } from "./paths";
import { discoverSlotDataFiles, PermissionDeniedError } from "./discover";
import type { DiscoveryFs, DiscoveryPlatform, SlotFile } from "./types";

export interface DiscoveryEnv {
  home: string;
  platform: DiscoveryPlatform;
}

/** Thin host bridge: env + directory listing (implemented by Tauri commands). */
export interface DiscoveryHost {
  env(): Promise<DiscoveryEnv>;
  listDir(path: string): Promise<DirListResult>;
  /**
   * Resolve symlinks for root dedupe. Optional — when omitted, roots are
   * compared by string only (tests / browser preview).
   */
  canonicalize?(path: string): Promise<string>;
}

export type DirListResult =
  | { status: "ok"; entries: import("./types").DirEntry[] }
  | { status: "missing" }
  | { status: "permission"; path: string; message: string };

function hostFs(host: DiscoveryHost): DiscoveryFs {
  return {
    async listDir(dirPath: string) {
      const result = await host.listDir(dirPath);
      if (result.status === "missing") {
        return null;
      }
      if (result.status === "permission") {
        throw new PermissionDeniedError(result.path);
      }
      return result.entries;
    },
  };
}

export type DiscoverHostSlotDataFilesOptions = {
  /** Extra dirs to probe (e.g. a user-configured custom save root). */
  extraRoots?: string[];
};

/**
 * Drop later roots that resolve to the same directory (e.g. Deck
 * `~/.steam/steam` → `~/.local/share/Steam`), keeping the first path so
 * SlotData cards are not listed twice.
 */
export async function uniqueDiscoveryRoots(
  roots: string[],
  canonicalize?: (path: string) => Promise<string>,
): Promise<string[]> {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const root of roots) {
    let key = root;
    if (canonicalize) {
      try {
        key = await canonicalize(root);
      } catch {
        key = root;
      }
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(root);
  }
  return unique;
}

/**
 * Discover SlotData files on the real host using injected env + fs commands.
 */
export async function discoverHostSlotDataFiles(
  host: DiscoveryHost,
  options?: DiscoverHostSlotDataFilesOptions,
): Promise<SlotFile[]> {
  const { home, platform } = await host.env();
  const extras = (options?.extraRoots ?? [])
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  const roots = await uniqueDiscoveryRoots(
    [...candidateSaveDirs({ home, platform }), ...extras],
    host.canonicalize?.bind(host),
  );
  return discoverSlotDataFiles({ roots, fs: hostFs(host) });
}
