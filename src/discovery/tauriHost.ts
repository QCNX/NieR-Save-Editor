import { invoke } from "@tauri-apps/api/core";
import type { DirEntry, DiscoveryPlatform } from "./types";
import type { DiscoveryEnv, DiscoveryHost, DirListResult } from "./host";

interface RustDiscoveryEnv {
  home: string;
  platform: string;
}

interface RustDirEntry {
  name: string;
  kind: string;
  mtimeMs: number;
}

interface RustListDirResult {
  status: string;
  path?: string;
  message?: string;
  entries?: RustDirEntry[];
}

function mapPlatform(platform: string): DiscoveryPlatform {
  if (platform === "windows" || platform === "linux" || platform === "macos") {
    return platform;
  }
  return "linux";
}

function mapEntries(entries: RustDirEntry[] | undefined): DirEntry[] {
  if (!entries) {
    return [];
  }
  return entries.map((entry) => ({
    name: entry.name,
    kind: entry.kind === "dir" ? "dir" : "file",
    mtimeMs: entry.mtimeMs,
  }));
}

/** Tauri-backed discovery host (thin commands → TypeScript discovery). */
export function createTauriDiscoveryHost(): DiscoveryHost {
  return {
    async env(): Promise<DiscoveryEnv> {
      const env = await invoke<RustDiscoveryEnv>("discovery_env");
      return { home: env.home, platform: mapPlatform(env.platform) };
    },
    async listDir(path: string): Promise<DirListResult> {
      const result = await invoke<RustListDirResult>("discovery_list_dir", {
        path,
      });
      if (result.status === "missing") {
        return { status: "missing" };
      }
      if (result.status === "permission") {
        return {
          status: "permission",
          path: result.path ?? path,
          message: result.message ?? `Permission denied reading save directory: ${path}`,
        };
      }
      return { status: "ok", entries: mapEntries(result.entries) };
    },
  };
}
