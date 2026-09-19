# Steam Deck / Flatpak

This app’s **Steam Deck** delivery path is a **Flatpak** package (Desktop Mode). Windows remains the primary MVP packaging path; Flatpak follows once the Windows build is solid.

> Back up your saves before editing.  
> Do **not** commit real `.dat` saves (they can contain private Steam progress). Prefer synthetic fixtures for tests and CI.

## Manifest and runtime

In-repo Flatpak manifest (x86_64):

- [`flatpak/com.niersaveeditor.desktop.yml`](../flatpak/com.niersaveeditor.desktop.yml)

| Pin | Value | Why |
| --- | --- | --- |
| App id | `com.niersaveeditor.desktop` | Matches Tauri `identifier` in `src-tauri/tauri.conf.json` |
| Runtime / SDK | `org.gnome.Platform` / `org.gnome.Sdk` **47** | GNOME 47 (Freedesktop **24.08** base) ships **WebKitGTK 4.1**, which Tauri 2 needs on Linux |
| SDK extensions | `org.freedesktop.Sdk.Extension.node20`, `org.freedesktop.Sdk.Extension.rust-stable` | Node + Rust toolchains for the in-sandbox Tauri build |
| Arch | **x86_64** | Steam Deck Desktop Mode |

**finish-args (sandbox):** Wayland + X11 fallback (`--socket=wayland`, `--socket=fallback-x11`, `--share=ipc`, `--device=dri`). Save access prefers portals for file dialogs / Save As, plus precise filesystem grants for SlotData discovery (Documents + Proton `compatdata/524220` roots, including Flatpak Steam)—not blanket home write.

Supporting files next to the manifest: `.desktop` launcher and AppStream `metainfo.xml`.

## Build a local `.flatpak` (Linux x86_64)

Run these on a **Linux x86_64** machine (Steam Deck Desktop Mode, or any builder with Flatpak). Do **not** put LAN hostnames, SSH targets, usernames, or machine-specific paths into the repo.

1. Install Flatpak tooling and add Flathub (once per user):
   ```bash
   # Distro package names vary; examples: flatpak, flatpak-builder
   flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
   ```
2. From the **repository root**:
   ```bash
   flatpak-builder --user --force-clean --install-deps-from=flathub \
     build-dir flatpak/com.niersaveeditor.desktop.yml
   ```
3. Export a single-file bundle (optional but handy for copying to a Deck):
   ```bash
   flatpak-builder --user --force-clean --repo=repo \
     build-dir flatpak/com.niersaveeditor.desktop.yml
   flatpak build-bundle repo nier-save-editor.flatpak com.niersaveeditor.desktop --arch=x86_64
   ```
4. Install and run:
   ```bash
   flatpak install --user ./nier-save-editor.flatpak
   flatpak run com.niersaveeditor.desktop
   ```
   Or, after a successful `--install` build with flatpak-builder, launch with `flatpak run com.niersaveeditor.desktop` without a separate bundle step.

Do not commit `build-dir/`, `repo/`, `.flatpak-builder/`, or `.flatpak` bundles.

**Validation note:** Authoring happened on Windows; `flatpak-builder` success and Deck Desktop Mode smoke (open Proton saves, overwrite with backup) are deferred to a Linux builder.

## Install and run (end user)

When a local `.flatpak` bundle (or a Flathub/remote listing) exists:

1. Switch the Deck to **Desktop Mode**.
2. Install the package for your user, for example:
   ```bash
   flatpak install --user ./nier-save-editor.flatpak
   ```
3. Launch from the application menu, or:
   ```bash
   flatpak run com.niersaveeditor.desktop
   ```

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
- Do not put LAN IPs, SSH hosts, usernames, or private remotes in public docs or Flatpak build notes.
