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
});
