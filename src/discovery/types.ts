/** Platform ids used when building SlotData discovery roots. */
export type DiscoveryPlatform = "windows" | "linux" | "macos";

export type DirEntryKind = "file" | "dir";

export interface DirEntry {
  name: string;
  kind: DirEntryKind;
  mtimeMs: number;
}

/** Injectable filesystem boundary for discovery (tests + Tauri adapter). */
export interface DiscoveryFs {
  /**
   * List a directory.
   * @returns `null` when the directory does not exist.
   * @throws {PermissionDeniedError} when the directory exists but cannot be read.
   */
  listDir(dirPath: string): Promise<DirEntry[] | null>;
}

export interface SlotFile {
  path: string;
  mtimeMs: number;
}
