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
  const roots = [...candidateSaveDirs({ home, platform }), ...extras];
  return discoverSlotDataFiles({ roots, fs: hostFs(host) });
}
