import { describe, expect, it } from "vitest";
import { candidateSaveDirs } from "./paths";

describe("candidateSaveDirs", () => {
  it("returns Windows Documents My Games NieR_Automata under USERPROFILE", () => {
    const dirs = candidateSaveDirs({
      platform: "windows",
      home: "C:\\Users\\Player",
    });

    expect(dirs).toEqual([
      "C:\\Users\\Player\\Documents\\My Games\\NieR_Automata",
    ]);
  });

  it("returns Linux Documents and Steam/Proton/Flatpak compatdata roots for app 524220", () => {
    const dirs = candidateSaveDirs({
      platform: "linux",
      home: "/home/deck",
    });

    expect(dirs).toEqual([
      "/home/deck/Documents/My Games/NieR_Automata",
      "/home/deck/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata",
      "/home/deck/.steam/steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata",
      "/home/deck/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata",
    ]);
  });

  it("returns an empty list for unsupported platforms", () => {
    expect(
      candidateSaveDirs({ platform: "macos", home: "/Users/player" }),
    ).toEqual([]);
  });
});
