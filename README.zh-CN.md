# NieR Save Editor

[English](./README.md)

面向 **Windows** 与 **Steam Deck（Flatpak）** 的《尼尔：自动人形》**PC** 存档编辑器。

基于 Tauri 2、React、TypeScript。未改动的存档往返写入保持字节一致。

> **编辑前请自行备份。** 应用内备份便于恢复，不能替代你对重要槽位的额外副本。

## 能做什么

- 打开并安全写回 PC 固定大小的 `SlotData_*.dat`。
- 自动发现 Windows / Steam Proton 存档路径，也可在设置中指定自定义目录。
- **存档**页：当前文件操作、槽位卡片、带还原的版本化备份历史。
- 编辑 SteamID、角色名、游玩时间、金钱、经验/等级、Debug、游玩记录、外观、背包/尸体背包、武器与装备、插槽芯片、POD 程序与 POD 配置。
- **芯片库**与**芯片配装**（A/B/C 套、容量、超载、数值面板、游戏内激活套 ★）。
- 简体中文 / 英文界面，亮/暗主题。

**不做：** macOS、WAX/Mods、Advanced 字段、PS4 存档、云备份、自动删除备份。

## 备份与安全

版本化备份默认在存档目录旁的 `nier-save-editor-backup/<槽位>/`（也可在设置中改备份根）。在写入、导入、还原等托管操作前会自动快照磁盘上的文件。手动备份**不包含**编辑器里未保存的修改。

说明见 **[docs/user/backup-and-safety.zh-CN.md](./docs/user/backup-and-safety.zh-CN.md)**。

## Windows

有 Release 时安装 NSIS/MSI；或本地构建（见下文「开发」）。常见存档目录：

`文档\My Games\NieR_Automata\`（`SlotData_0.dat` 等）

找不到槽位时，在**设置**中指定目录并重新扫描。

## Steam Deck（Flatpak）

请在**桌面模式**使用。存档发现（含 Flatpak Steam / Proton `524220`）见：

**[docs/flatpak.zh-CN.md](./docs/flatpak.zh-CN.md)** · 清单：[`flatpak/com.niersaveeditor.desktop.yml`](./flatpak/com.niersaveeditor.desktop.yml)

## 开发

需要 Node.js（LTS）、Rust（stable）、平台编译工具链；Windows 还需 WebView2。

```bash
npm install
npm run tauri dev   # 运行
npm test            # 测试
npm run tauri build # Windows：NSIS + MSI 在 src-tauri/target/release/bundle/
```

请勿提交真实 `.dat`（`fixtures/` 已 gitignore）。

## 致谢

- 存档布局参考：[NieREdit](https://codeberg.org/mxNieR/NieREdit)（mxNieR）
- 中文显示名来源：[龙版汉化 / nier_chinese](https://gitee.com/WLongWLong/nier_chinese) 字符串表

## 许可

[MIT](./LICENSE)
