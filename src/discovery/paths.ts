import type { DiscoveryPlatform } from "./types";

/** Steam app id for NieR:Automata (Proton compatdata). */
export const NIER_AUTOMATA_STEAM_APP_ID = "524220";

const WIN_SAVE_SUFFIX = ["Documents", "My Games", "NieR_Automata"] as const;

const LINUX_DOCUMENTS_SUFFIX = ["Documents", "My Games", "NieR_Automata"] as const;

const PROTON_SAVE_SUFFIX = [
  "pfx",
  "drive_c",
  "users",
  "steamuser",
  "Documents",
  "My Games",
  "NieR_Automata",
] as const;

function joinHome(home: string, sep: string, parts: readonly string[]): string {
  const root = home.replace(/[/\\]+$/, "");
  return [root, ...parts].join(sep);
}

export interface CandidateSaveDirsInput {
  platform: DiscoveryPlatform;
  /** Absolute user home, e.g. `%USERPROFILE%` or `~` expanded. */
  home: string;
}

/**
 * Build candidate NieR_Automata save directories for the given platform.
 * Missing dirs are fine — callers probe and treat absence as an empty list.
 *
 * Public docs should describe these with `%USERPROFILE%` / `~/...` placeholders.
 */
export function candidateSaveDirs(input: CandidateSaveDirsInput): string[] {
  const { platform, home } = input;

  if (platform === "windows") {
    return [joinHome(home, "\\", WIN_SAVE_SUFFIX)];
  }

  if (platform === "linux") {
    const sep = "/";
    const documents = joinHome(home, sep, LINUX_DOCUMENTS_SUFFIX);
    const steamRoots = [
      [".local", "share", "Steam", "steamapps", "compatdata", NIER_AUTOMATA_STEAM_APP_ID],
      [".steam", "steam", "steamapps", "compatdata", NIER_AUTOMATA_STEAM_APP_ID],
      [
        ".var",
        "app",
        "com.valvesoftware.Steam",
        ".local",
        "share",
        "Steam",
        "steamapps",
        "compatdata",
        NIER_AUTOMATA_STEAM_APP_ID,
      ],
    ] as const;

    return [
      documents,
      ...steamRoots.map((prefix) =>
        joinHome(home, sep, [...prefix, ...PROTON_SAVE_SUFFIX]),
      ),
    ];
  }

  return [];
}
