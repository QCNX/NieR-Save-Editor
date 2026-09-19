# NieR Save Editor

A NieR:Automata **PC** save editor for **Windows** and **Steam Deck** (Flatpak).

Built with **Tauri 2**, **React**, and **TypeScript**. Save parsing/serialization lives in pure TypeScript with round-trip tests so unedited saves stay byte-identical.

> Back up your saves before editing.

## Features (MVP)

- Read / write PC `.dat` saves  
- Slot picker (Windows + Steam Proton paths)  
- Reload current file / overwrite (with backup) / Save As  
- Edit money, EXP/level, inventory, weapons, plug-in chips, POD programs  
- Chinese UI and item names via localization ID maps  
- Plug-in chip row order: **Level**, then **Weight**

Out of scope for MVP: macOS, WAX mods, PS4 conversion, SteamID / Advanced tabs.

## Develop

Requirements: Node.js (LTS), Rust (stable), platform C/C++ toolchain, WebView2 on Windows.

```bash
npm install
npm run tauri dev
```

```bash
npm run build
npm run tauri build
```

Do **not** commit real `.dat` files under `fixtures/` (gitignored). Use synthetic fixtures in CI when possible.

## Credits

- Save layout reference: [NieREdit](https://codeberg.org/mxNieR/NieREdit) by mxNieR  
- Chinese display names derived from [龙版汉化 / nier_chinese](https://gitee.com/WLongWLong/nier_chinese) string tables  

## License

TBD (set before public release).
