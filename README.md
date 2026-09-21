# NieR Save Editor

A NieR:Automata **PC** save editor for **Windows** and **Steam Deck** (Flatpak).

Built with **Tauri 2**, **React**, and **TypeScript**. Save parsing/serialization lives in pure TypeScript with round-trip tests so unedited saves stay byte-identical.

> Back up your saves before editing.

## Features

- Read and write fixed-size NieR:Automata PC `.dat` saves with byte-identical round trips for untouched data.
- Discover save slots from Windows and Steam Proton locations, or configure a custom save folder.
- A dedicated **Save** page with three responsive regions:
  - **Current save** — summary plus Save changes, Reload, Save As, Open, Close, and Rescan actions.
  - **Save slots** — valid, invalid, and unreadable slots are isolated and shown as individual cards.
  - **Backup history** — newest-first version history with parsed summaries, integrity state, and restore actions.
- Create immutable, versioned backups under `nier-save-editor-backup/<slot>/` beside the save directory. Manual backup snapshots the file currently on disk and does not include unsaved editor changes.
- Create safety backups automatically before managed mutations: `before-save`, `before-import`, and `before-restore`.
- Restore a selected backup or replace a selected slot from an external PC save only after a directional preview and confirmation.
- Detect target changes with size and SHA-256 checks, commit through a same-directory safe replacement, then re-read and compare the complete file. A failed backup, conflict, commit, or verification does not report success.
- Edit SteamID, character name, play time, money, EXP/level, Debug Flag, Play Records, cosmetics, inventory and corpse inventory, weapons and equipment sets, plug-in chips, POD programs, and POD configuration.
- Search and filter slot-based editors, fill empty entries, change IDs, and clear entries.
- Simplified Chinese and English UI/entity names, persistent light/dark theme, and a dirty marker in the localized window title.
- Plug-in chips split into **Chip Library** and **Chip Loadout** tabs: browse/filter owned chips by category; edit loadout sets A/B/C with Cost/占用, purchased capacity (40…128), optional overload, and a Stats Panel summarizing equipped bonuses. Switch the in-game active loadout set (★) independently of which set you are editing.
- Chip Library row order: **Level**, then **Cost** (占用).

Out of scope: macOS, WAX mods, Advanced save fields, PS4 saves/conversion, cloud backup, and automatic backup deletion.

> Backup history is a recovery aid, not a substitute for keeping a separate copy of important saves.

## Develop

Requirements: Node.js (LTS), Rust (stable), platform C/C++ toolchain, WebView2 on Windows.

```bash
npm install
npm run tauri dev
```

```bash
npm test
```

```bash
npm run tauri build
```

On Windows this produces an NSIS installer and an MSI under:

- `src-tauri/target/release/bundle/nsis/` (e.g. `*_x64-setup.exe`)
- `src-tauri/target/release/bundle/msi/` (e.g. `*_x64_*.msi`)

The release binary is also at `src-tauri/target/release/` (do not commit `src-tauri/target/`).

Do **not** commit real `.dat` files under `fixtures/` (gitignored). Use synthetic fixtures in CI when possible.

## Steam Deck (Flatpak)

Steam Deck delivery is via **Flatpak** in Desktop Mode. See **[docs/flatpak.md](./docs/flatpak.md)** for install/run, Proton save paths (Steam app id `524220`, including Flatpak Steam under `~/.var/app/com.valvesoftware.Steam/...`), and Linux build notes. Manifest: [`flatpak/com.niersaveeditor.desktop.yml`](./flatpak/com.niersaveeditor.desktop.yml) (app id `com.niersaveeditor.desktop`).

## Credits

- Save layout reference: [NieREdit](https://codeberg.org/mxNieR/NieREdit) by mxNieR  
- Chinese display names derived from [龙版汉化 / nier_chinese](https://gitee.com/WLongWLong/nier_chinese) string tables  

## License

[MIT](./LICENSE)
