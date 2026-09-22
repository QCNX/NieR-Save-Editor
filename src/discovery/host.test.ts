import { describe, expect, it } from "vitest";
import { discoverHostSlotDataFiles, type DiscoveryHost } from "./host";
import type { DirEntry } from "./types";

describe("discoverHostSlotDataFiles", () => {
  it("probes Windows Documents roots via the host bridge", async () => {
    const listed: string[] = [];
    const host: DiscoveryHost = {
      async env() {
        return { home: "C:\\Users\\Player", platform: "windows" };
      },
      async listDir(path) {
        listed.push(path);
        if (path === "C:\\Users\\Player\\Documents\\My Games\\NieR_Automata") {
          const entries: DirEntry[] = [
            { name: "SlotData_0.dat", kind: "file", mtimeMs: 11 },
          ];
          return { status: "ok", entries };
        }
        return { status: "missing" };
      },
    };

    const slots = await discoverHostSlotDataFiles(host);

    expect(listed).toEqual([
      "C:\\Users\\Player\\Documents\\My Games\\NieR_Automata",
    ]);
    expect(slots).toEqual([
      {
        path: "C:\\Users\\Player\\Documents\\My Games\\NieR_Automata\\SlotData_0.dat",
        mtimeMs: 11,
      },
    ]);
  });

  it("also probes a custom save root when provided", async () => {
    const listed: string[] = [];
    const host: DiscoveryHost = {
      async env() {
        return { home: "C:\\Users\\Player", platform: "windows" };
      },
      async listDir(path) {
        listed.push(path);
        if (path === "D:\\Games\\NieR_Automata") {
          return {
            status: "ok",
            entries: [
              { name: "SlotData_2.dat", kind: "file", mtimeMs: 7 },
            ],
          };
        }
        return { status: "missing" };
      },
    };

    const slots = await discoverHostSlotDataFiles(host, {
      extraRoots: ["  D:\\Games\\NieR_Automata  ", ""],
    });

    expect(listed).toContain("D:\\Games\\NieR_Automata");
    expect(slots).toEqual([
      { path: "D:\\Games\\NieR_Automata\\SlotData_2.dat", mtimeMs: 7 },
    ]);
  });

  it("probes Linux Proton and Flatpak roots when Documents is empty", async () => {
    const host: DiscoveryHost = {
      async env() {
        return { home: "/home/deck", platform: "linux" };
      },
      async listDir(path) {
        if (
          path ===
          "/home/deck/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata"
        ) {
          return {
            status: "ok",
            entries: [
              { name: "SlotData_1.dat", kind: "file", mtimeMs: 99 },
            ],
          };
        }
        return { status: "missing" };
      },
    };

    const slots = await discoverHostSlotDataFiles(host);

    expect(slots).toEqual([
      {
        path: "/home/deck/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/SlotData_1.dat",
        mtimeMs: 99,
      },
    ]);
  });

  it("keeps the first Steam root when ~/.steam/steam is a symlink of ~/.local/share/Steam", async () => {
    const listed: string[] = [];
    const localRoot =
      "/home/deck/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata";
    const steamLinkRoot =
      "/home/deck/.steam/steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata";
    const host: DiscoveryHost = {
      async env() {
        return { home: "/home/deck", platform: "linux" };
      },
      async canonicalize(path) {
        return path.replace("/.steam/steam/", "/.local/share/Steam/");
      },
      async listDir(path) {
        listed.push(path);
        if (path === localRoot || path === steamLinkRoot) {
          return {
            status: "ok",
            entries: [
              { name: "SlotData_0.dat", kind: "file", mtimeMs: 1 },
              { name: "SlotData_1.dat", kind: "file", mtimeMs: 2 },
              { name: "SlotData_2.dat", kind: "file", mtimeMs: 3 },
            ],
          };
        }
        return { status: "missing" };
      },
    };

    const slots = await discoverHostSlotDataFiles(host);

    expect(listed).toContain(localRoot);
    expect(listed).not.toContain(steamLinkRoot);
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.path)).toEqual([
      `${localRoot}/SlotData_0.dat`,
      `${localRoot}/SlotData_1.dat`,
      `${localRoot}/SlotData_2.dat`,
    ]);
  });

  it("still discovers slots when canonicalize is denied by the host capability", async () => {
    const host: DiscoveryHost = {
      async env() {
        return { home: "/home/deck", platform: "linux" };
      },
      async canonicalize() {
        throw new Error("Command discovery_canonicalize not allowed");
      },
      async listDir(path) {
        if (
          path ===
          "/home/deck/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata"
        ) {
          return {
            status: "ok",
            entries: [{ name: "SlotData_0.dat", kind: "file", mtimeMs: 3 }],
          };
        }
        return { status: "missing" };
      },
    };

    const slots = await discoverHostSlotDataFiles(host);
    expect(slots).toEqual([
      {
        path: "/home/deck/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/SlotData_0.dat",
        mtimeMs: 3,
      },
    ]);
  });
});
