import { describe, expect, it } from "vitest";
import { discoverSlotDataFiles, PermissionDeniedError } from "./discover";
import type { DiscoveryFs, DirEntry } from "./types";

function memoryFs(tree: Record<string, DirEntry[] | "permission">): DiscoveryFs {
  return {
    async listDir(dirPath: string) {
      if (!(dirPath in tree)) {
        return null;
      }
      const value = tree[dirPath];
      if (value === "permission") {
        throw new PermissionDeniedError(dirPath);
      }
      return value;
    },
  };
}

describe("discoverSlotDataFiles", () => {
  it("returns SlotData_*.dat paths with mtime from existing dirs", async () => {
    const fs = memoryFs({
      "/saves": [
        { name: "SlotData_0.dat", kind: "file", mtimeMs: 1000 },
        { name: "SlotData_1.dat", kind: "file", mtimeMs: 2000 },
        { name: "GameData.dat", kind: "file", mtimeMs: 3000 },
        { name: "notes.txt", kind: "file", mtimeMs: 4000 },
        { name: "subdir", kind: "dir", mtimeMs: 5000 },
      ],
    });

    const slots = await discoverSlotDataFiles({
      roots: ["/saves"],
      fs,
    });

    expect(slots).toEqual([
      { path: "/saves/SlotData_0.dat", mtimeMs: 1000 },
      { path: "/saves/SlotData_1.dat", mtimeMs: 2000 },
    ]);
  });

  it("accepts known SlotData naming variants case-insensitively", async () => {
    const fs = memoryFs({
      "C:\\Games\\NieR": [
        { name: "slotdata_2.DAT", kind: "file", mtimeMs: 42 },
      ],
    });

    const slots = await discoverSlotDataFiles({
      roots: ["C:\\Games\\NieR"],
      fs,
      join: (dir, name) => `${dir}\\${name}`,
    });

    expect(slots).toEqual([
      { path: "C:\\Games\\NieR\\slotdata_2.DAT", mtimeMs: 42 },
    ]);
  });

  it("yields an empty list when candidate directories are missing", async () => {
    const fs = memoryFs({});

    const slots = await discoverSlotDataFiles({
      roots: ["/missing/a", "/missing/b"],
      fs,
    });

    expect(slots).toEqual([]);
  });

  it("surfaces a clear permission error when a directory cannot be read", async () => {
    const fs = memoryFs({
      "/locked": "permission",
    });

    await expect(
      discoverSlotDataFiles({ roots: ["/locked"], fs }),
    ).rejects.toThrow(/permission|denied|access/i);
  });

  it("deduplicates the same slot path found under multiple roots", async () => {
    const entry: DirEntry = {
      name: "SlotData_0.dat",
      kind: "file",
      mtimeMs: 9,
    };
    const fs = memoryFs({
      "/a": [entry],
      "/b": [entry],
    });

    // Same joined path via custom join that collapses both roots to one namespace
    const slots = await discoverSlotDataFiles({
      roots: ["/a", "/b"],
      fs,
      join: (_dir, name) => `/shared/${name}`,
    });

    expect(slots).toEqual([{ path: "/shared/SlotData_0.dat", mtimeMs: 9 }]);
  });
});
