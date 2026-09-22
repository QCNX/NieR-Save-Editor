# Steam Deck / Flatpak

[中文](./flatpak.zh-CN.md)

Steam Deck delivery is a **Flatpak** (Desktop Mode). Smoke-tested on Deck (Proton / Flatpak Steam saves, overwrite with backup).

> Back up your saves before editing. Do not commit real `.dat` files.

## Install and run

1. Switch the Deck to **Desktop Mode**.
2. Install a local bundle (when you have one), for example:
   ```bash
   flatpak install --user ./nier-save-editor.flatpak
   ```
3. Launch from the application menu, or:
   ```bash
   flatpak run com.niersaveeditor.desktop
   ```

App id: `com.niersaveeditor.desktop` · Manifest: [`flatpak/com.niersaveeditor.desktop.yml`](../flatpak/com.niersaveeditor.desktop.yml)

## Where saves are

NieR:Automata PC slots are often under Steam Proton `compatdata` for app id **`524220`**, not only under `~/Documents`.

| Kind | Pattern |
| --- | --- |
| Documents | `~/Documents/My Games/NieR_Automata/` |
| Native Steam Proton | `~/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |
| Alternate Steam root | `~/.steam/steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |
| **Flatpak Steam** | `~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |

Files look like `SlotData_0.dat`, `SlotData_1.dat`, …

- Prefer Desktop Mode for install, run, and file dialogs.
- If Steam is Flatpak (`com.valvesoftware.Steam`), use the **Flatpak Steam** row—native `~/.local/share/Steam/...` alone will miss those saves.
- `steamuser` is Proton’s Windows profile name inside the prefix, not your login name.
- Missing folders are normal; only existing slots appear after scan. Use Settings → custom folder + Rescan if needed.

More on backups: [user/backup-and-safety.md](./user/backup-and-safety.md).

## Build a local `.flatpak` (optional)

On Linux x86_64 (Deck Desktop Mode or any Flatpak builder). Do not put private hostnames or paths in the repo.

```bash
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# from repository root
flatpak-builder --user --force-clean --install-deps-from=flathub \
  build-dir flatpak/com.niersaveeditor.desktop.yml

# optional single-file bundle
flatpak-builder --user --force-clean --repo=repo \
  build-dir flatpak/com.niersaveeditor.desktop.yml
flatpak build-bundle repo nier-save-editor.flatpak com.niersaveeditor.desktop --arch=x86_64
```

Runtime pin: GNOME Platform/Sdk **47** (WebKitGTK 4.1 for Tauri 2). Do not commit `build-dir/`, `repo/`, `.flatpak-builder/`, or `.flatpak` bundles.
