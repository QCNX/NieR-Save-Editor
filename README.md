# NieR Save Editor

[中文](./README.zh-CN.md)

A NieR:Automata **PC** save editor for **Windows** and **Steam Deck** (Flatpak).

Built with Tauri 2, React, and TypeScript. Unedited saves stay byte-identical on round trip.

> **Back up your saves before editing.** App backups help recovery; they are not a substitute for your own copy of important slots.

## What you can do

- Open PC `SlotData_*.dat` saves (fixed size), edit, and write back safely.
- Find slots on Windows and Steam Proton paths, or point Settings at a custom folder.
- **Save** tab: current file actions, slot cards, and versioned backup history with restore.
- Edit SteamID, name, play time, money, EXP/level, Debug Flag, Play Records, cosmetics, inventory / corpse inventory, weapons & equipment, plug-in chips, POD programs, and POD config.
- **Chip Library** and **Chip Loadout** (sets A/B/C, capacity, overload, Stats Panel, in-game active set ★).
- UI in Simplified Chinese and English; light/dark theme.

**Not in scope:** macOS, WAX mods, Advanced fields, PS4 saves, cloud backup, automatic backup deletion.

## Backup and safety

Versioned backups live under `nier-save-editor-backup/<slot>/` (beside the save folder, or a custom backup root in Settings). The app snapshots disk before managed writes (`before-save`, `before-import`, `before-restore`). Manual backup does **not** include unsaved editor changes.

Details: **[docs/user/backup-and-safety.md](./docs/user/backup-and-safety.md)**.

## Windows

Install from a Release build when available (NSIS/MSI), or build locally (see Develop). Typical save folder:

`Documents\My Games\NieR_Automata\` (`SlotData_0.dat`, …)

If slots are missing, set a custom folder in **Settings** and Rescan.

## Steam Deck (Flatpak)

Use **Desktop Mode**. Save discovery (including Flatpak Steam / Proton `524220`) is documented here:

**[docs/flatpak.md](./docs/flatpak.md)** · Manifest: [`flatpak/com.niersaveeditor.desktop.yml`](./flatpak/com.niersaveeditor.desktop.yml)

## Develop

Node.js (LTS), Rust (stable), platform toolchain; WebView2 on Windows.

```bash
npm install
npm run tauri dev   # app
npm test            # tests
npm run tauri build # Windows: NSIS + MSI under src-tauri/target/release/bundle/
```

Do not commit real `.dat` files (`fixtures/` is gitignored).

## Credits

- Save layout reference: [NieREdit](https://codeberg.org/mxNieR/NieREdit) by mxNieR
- Chinese display names derived from [龙版汉化 / nier_chinese](https://gitee.com/WLongWLong/nier_chinese) string tables

## License

[MIT](./LICENSE)
