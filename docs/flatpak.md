# Steam Deck / Flatpak

This app’s **Steam Deck** delivery path is a **Flatpak** package (Desktop Mode). Windows remains the primary MVP packaging path; Flatpak follows once the Windows build is solid.

> Back up your saves before editing.  
> Do **not** commit real `.dat` saves (they can contain private Steam progress). Prefer synthetic fixtures for tests and CI.

## Install and run (high level)

A Flatpak **manifest is forthcoming** (tracked as MVP ticket 15). Expect it under something like `flatpak/` in this repo once added. Until then, treat the steps below as the intended user flow—not a working build recipe.

When a local `.flatpak` bundle (or a Flathub/remote listing) exists:

1. Switch the Deck to **Desktop Mode**.
2. Install the package for your user, for example:
   ```bash
   flatpak install --user ./nier-save-editor.flatpak
   ```
   (Exact filename and app id will match the manifest; the Tauri identifier is `com.niersaveeditor.desktop`.)
3. Launch from the application menu, or:
   ```bash
   flatpak run com.niersaveeditor.desktop
   ```

Building the Flatpak from source requires a Linux/x86_64 builder and the pinned runtime from the manifest—details land with ticket 15. Public docs and the manifest must stay free of private LAN hosts, SSH targets, and machine-specific paths.

## Save discovery (Desktop Mode + Proton)

On Steam Deck (and Linux generally), NieR:Automata PC saves are often under **Steam Proton** `compatdata` for Steam app id **`524220`**, not only under a plain `~/Documents` tree.

The editor probes candidate folders under your home (`~/...`), including:

| Kind | Pattern (user-facing) |
| --- | --- |
| Native Documents | `~/Documents/My Games/NieR_Automata/` |
| Native Steam Proton | `~/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |
| Alternate Steam root | `~/.steam/steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |
| **Flatpak Steam** | `~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |

Slot files look like `SlotData_0.dat`, `SlotData_1.dat`, and so on inside those folders.

Notes:

- Prefer **Desktop Mode** when installing or running the Flatpak and when browsing saves with a file dialog.
- If Steam itself is installed as Flatpak (`com.valvesoftware.Steam`), use the **Flatpak Steam** path pattern above—native `~/.local/share/Steam/...` alone will miss those saves.
- The `steamuser` segment is Proton’s Windows profile name inside the prefix, not a login username you configure.
- Missing directories are normal; the slot picker only lists folders/files that exist.

## Privacy

- Do not commit real `.dat` fixtures or private Steam data.
- Do not put LAN IPs, SSH hosts, usernames, or private remotes in public docs or the future Flatpak manifest notes.
