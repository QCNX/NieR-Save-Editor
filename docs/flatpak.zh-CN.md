# Steam Deck / Flatpak

[English](./flatpak.md)

Steam Deck 通过 **Flatpak** 在**桌面模式**使用。已在真机做过冒烟（Proton / Flatpak Steam 存档发现与带备份覆盖写入）。

> 编辑前请备份。不要提交真实 `.dat`。

## 安装与运行

1. 将掌机切到**桌面模式**。
2. 若有本地 bundle，例如：
   ```bash
   flatpak install --user ./nier-save-editor.flatpak
   ```
3. 从应用菜单启动，或：
   ```bash
   flatpak run com.niersaveeditor.desktop
   ```

应用 id：`com.niersaveeditor.desktop` · 清单：[`flatpak/com.niersaveeditor.desktop.yml`](../flatpak/com.niersaveeditor.desktop.yml)

## 存档在哪

PC 槽位常在 Steam Proton `compatdata`（应用 id **`524220`**），不只在 `~/Documents`。

| 类型 | 路径模式 |
| --- | --- |
| Documents | `~/Documents/My Games/NieR_Automata/` |
| 原生 Steam Proton | `~/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |
| 备用 Steam 根 | `~/.steam/steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |
| **Flatpak Steam** | `~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/524220/pfx/drive_c/users/steamuser/Documents/My Games/NieR_Automata/` |

文件形如 `SlotData_0.dat`、`SlotData_1.dat` …

- 安装、运行、选文件时优先用桌面模式。
- Steam 本身是 Flatpak（`com.valvesoftware.Steam`）时看 **Flatpak Steam** 那一行；只搜原生 `~/.local/share/Steam/...` 会漏档。
- `steamuser` 是 Proton 前缀里的 Windows 用户名，不是你的系统登录名。
- 目录不存在很正常；扫描只列出实际存在的槽位。找不到时可在设置里指定目录并重新扫描。

备份说明：[user/backup-and-safety.zh-CN.md](./user/backup-and-safety.zh-CN.md)。

## 本地构建 `.flatpak`（可选）

在 Linux x86_64（Deck 桌面模式或任意 Flatpak 构建机）。不要把内网主机名或私人路径写进仓库。

```bash
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# 在仓库根目录
flatpak-builder --user --force-clean --install-deps-from=flathub \
  build-dir flatpak/com.niersaveeditor.desktop.yml

# 可选：导出单文件 bundle
flatpak-builder --user --force-clean --repo=repo \
  build-dir flatpak/com.niersaveeditor.desktop.yml
flatpak build-bundle repo nier-save-editor.flatpak com.niersaveeditor.desktop --arch=x86_64
```

运行时固定：GNOME Platform/Sdk **47**（Tauri 2 需要 WebKitGTK 4.1）。不要提交 `build-dir/`、`repo/`、`.flatpak-builder/` 或 `.flatpak`。
